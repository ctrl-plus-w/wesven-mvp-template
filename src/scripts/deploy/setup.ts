import { setTimeout as sleep } from 'node:timers/promises';
import { styleText } from 'node:util';

import type { CANCEL_SYMBOL } from '@clack/prompts';
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  note,
  outro,
  password,
  select,
  spinner,
  text,
} from '@clack/prompts';

import { isDefined } from '@/util/array.client';

import DEPLOY from '@/constant/deploy';

import type { PostHogDeploySettings, ProjectLink } from '@/type/deploy';

import {
  findMissingProductionKeys,
  generateSecret,
  getSchemaKeys,
  isOptionalKey,
  isSecretKey,
  planMissingKeys,
  validateValue,
} from '@/scripts/deploy/env-plan';
import {
  dispatchWorkflow,
  ensureEnvironment,
  getLatestRun,
  getRepository,
  getRun,
  hasGitHubCli,
  isGitHubLoggedIn,
  listRepositoryVariables,
  listSecrets,
  loginToGitHub,
  setRepositoryVariable,
  setSecret,
} from '@/scripts/deploy/github';
import { run } from '@/scripts/deploy/shell';
import {
  addBlobStore,
  addDomain,
  addNeonDatabase,
  addNeonDatabaseInteractively,
  addProductionVariable,
  configureProject,
  createDeployToken,
  getFunctionRegion,
  isVercelLoggedIn,
  linkProject,
  listProductionDomains,
  listProductionKeys,
  listScopes,
  loginToVercel,
  projectExists,
  readProjectLink,
  setFunctionRegion,
  VERCEL_CLI,
} from '@/scripts/deploy/vercel';

// `pnpm deploy:setup`: provisions production on Vercel and wires the GitHub deploy job, then runs the first deploy.
// Every step checks what already exists, so a second run only does what is missing. Once GitHub deploys are enabled,
// the optional offers (Blob store, domain, PostHog) count as answered and the token is kept: `--reconfigure` asks again.

const RUN_TIMEOUT_MS = 45 * 60 * 1000;
const START_TIMEOUT_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 15 * 1000;
const MAX_POLL_FAILURES = 5;
const POSTHOG_APP_HOSTS: Record<string, string> = { us: 'https://us.posthog.com', eu: 'https://eu.posthog.com' };
const POSTHOG_INGEST_HOST = /^https:\/\/(us|eu)\.i\.posthog\.com\/?$/;
const RECONFIGURE_FLAG = '--reconfigure';

/**
 * Ends the setup on Ctrl+C or Escape. What ran before stays in place, and a new run resumes from there.
 * @param value A prompt's answer
 */
const answer = <T>(value: T | typeof CANCEL_SYMBOL): T => {
  if (!isCancel(value)) return value;
  cancel('Setup stopped. What is done stays done: run `pnpm deploy:setup` again to resume.');
  return process.exit(0);
};

/**
 * Runs one step behind a spinner, and leaves its outcome on screen.
 * @param title What the step does, shown while it runs
 * @param task The work; it can update the spinner's text
 * @param done The line left once it succeeds
 */
const step = async <T>(
  title: string,
  task: (message: (text: string) => void) => Promise<T>,
  done?: (result: T) => string,
) => {
  const indicator = spinner();
  indicator.start(title);
  try {
    const result = await task((text) => indicator.message(text));
    indicator.stop(done ? done(result) : title);
    return result;
  } catch (error) {
    indicator.error(`${title}: failed`);
    throw error;
  }
};

const required = (value: string | undefined) => (value?.trim() ? undefined : 'Required');

const dim = (value: string) => styleText('dim', value);
const bold = (value: string) => styleText('bold', value);

/**
 * Logs an optional offer a re-run skips.
 * @param what The offer, such as `No Blob store`
 */
const skipOffer = (what: string) =>
  log.info(`${what} ${dim(`(answered in an earlier run: ${RECONFIGURE_FLAG} asks again)`)}`);

const checkTools = async () => {
  if (!(await hasGitHubCli())) throw new Error('The GitHub CLI is missing: install it from https://cli.github.com.');

  if (!(await isGitHubLoggedIn())) {
    log.step('Logging in to GitHub');
    await loginToGitHub();
  }

  const loggedIn = await step(`Fetching ${VERCEL_CLI}`, isVercelLoggedIn, () => `${VERCEL_CLI} ready`);
  if (!loggedIn) {
    log.step('Logging in to Vercel');
    await loginToVercel();
  }

  return step('Reading the GitHub repository', getRepository, (repository) => `Repository ${bold(repository)}`);
};

const setUpProject = async (repository: string) => {
  const existing = readProjectLink();
  if (existing) {
    log.success(`Linked to Vercel project ${bold(existing.projectName)} ${dim('(.vercel/project.json)')}`);
    return existing;
  }

  const scopes = await step('Listing your Vercel teams', listScopes, (found) => `${found.length} Vercel team(s)`);
  const scope =
    scopes.length === 1
      ? scopes[0].slug
      : answer(
          await select({
            message: 'Which Vercel team owns the project?',
            options: scopes.map(({ slug, name }) => ({ value: slug, label: name, hint: slug })),
          }),
        );

  return chooseProject(scope, repository.split('/')[1].toLowerCase());
};

/**
 * Asks for the project name, and links an existing project of that name only once the user agrees to take it over.
 * @param scope The team slug
 * @param initialValue The name proposed
 */
const chooseProject = async (scope: string, initialValue: string): Promise<ProjectLink> => {
  const projectName = answer(
    await text({
      message: 'Vercel project name',
      initialValue,
      validate: (value = '') =>
        /^[a-z0-9][a-z0-9._-]{0,99}$/.test(value) && !value.includes('---')
          ? undefined
          : 'Lowercase letters, digits, ".", "_" and "-" (no "---"), up to 100 characters.',
    }),
  );

  const exists = await step(
    'Looking for the project',
    () => projectExists(projectName, scope),
    (found) => (found ? `Project ${bold(projectName)} already exists` : `Name ${bold(projectName)} is free`),
  );
  if (
    exists &&
    !answer(
      await confirm({
        message: `Use the existing ${projectName}? Its settings and production variables change, and ${DEPLOY.BRANCH} deploys to it.`,
        initialValue: false,
      }),
    )
  )
    return chooseProject(scope, projectName);

  return step(
    exists ? 'Linking the project' : 'Creating and linking the project',
    () => linkProject(projectName, scope, !exists),
    () => `Project ${bold(projectName)} linked`,
  );
};

const askRegion = async (message: string, initialValue = DEPLOY.REGIONS[0].value) =>
  answer(
    await select({
      message,
      options: DEPLOY.REGIONS.map(({ value, label }) => ({ value, label, hint: value })),
      initialValue,
    }),
  );

/**
 * Creates the Neon database, through the Neon prompts when the free plan or the region is refused.
 * @param link The project
 * @param region The region asked for
 * @returns The region the database ended up in
 */
const createDatabase = async (link: ProjectLink, region: string) => {
  try {
    await step('Creating the Neon database (free plan)', () => addNeonDatabase(link, region));
    return region;
  } catch (error) {
    log.warn(error instanceof Error ? error.message : String(error));
    log.step('Finishing in the Neon prompts instead');
    await addNeonDatabaseInteractively(link);
    return askRegion('Which region did you pick in the Neon prompts?', region);
  }
};

/**
 * Creates the database unless production already has one.
 * @param link The project
 * @param keys The production variable names
 * @returns The region of a database created now
 */
const setUpDatabase = async (link: ProjectLink, keys: string[]) => {
  if (keys.includes('DATABASE_URL')) {
    log.success('Database already connected');
    return undefined;
  }

  const region = await createDatabase(
    link,
    await askRegion('Neon database region (the functions move there too; it cannot change later)'),
  );

  const after = await step(
    'Checking the database variables',
    () => listProductionKeys(link),
    () => 'Neon connected',
  );
  if (!after.includes('DATABASE_URL'))
    throw new Error('Neon did not add DATABASE_URL to Production: connect it in Vercel → Storage, then run again.');
  return region;
};

/**
 * Runs the functions next to the database. A run that did not create it reuses the region already set, or asks.
 * @param link The project
 * @param created The region of a database created in this run
 */
const setUpRegion = async (link: ProjectLink, created?: string) => {
  const current = created ? undefined : await getFunctionRegion(link).catch(() => undefined);
  if (current) {
    log.success(`Functions run in ${current}`);
    return current;
  }

  const region = created ?? (await askRegion('Which region is the database in? (the functions move there)'));
  await step(
    `Moving the functions to ${region}`,
    () => setFunctionRegion(link, region),
    () => `Functions run in ${region}`,
  ).catch(() => log.warn(`Set the functions region to ${region} in Vercel → Settings → Functions.`));
  return region;
};

/**
 * Connects the database and, when wanted, a Blob store.
 * @param link The project
 * @param offer Whether to offer the Blob store when there is none
 * @returns Whether it created anything
 */
const setUpStorage = async (link: ProjectLink, offer: boolean) => {
  const keys = await step(
    'Reading the project storage',
    () => listProductionKeys(link),
    () => 'Project storage read',
  );
  const created = await setUpDatabase(link, keys);
  const region = await setUpRegion(link, created);

  if (keys.includes('BLOB_READ_WRITE_TOKEN')) {
    log.success('Blob store already connected');
    return Boolean(created);
  }
  if (!offer) {
    skipOffer('No Blob store');
    return Boolean(created);
  }
  if (!answer(await confirm({ message: 'Create a Vercel Blob store for file uploads?', initialValue: true })))
    return Boolean(created);

  await step(
    `Creating the Blob store in ${region}`,
    () => addBlobStore(link, region),
    () => 'Blob store connected',
  );
  return true;
};

/**
 * Adds a custom domain when one is wanted.
 * @param link The project
 * @param offer Whether to ask for one when there is none
 * @returns Whether it added one
 */
const setUpDomain = async (link: ProjectLink, offer: boolean) => {
  const domains = await listProductionDomains(link);
  const custom = domains.find((name) => !name.endsWith('.vercel.app'));
  if (custom) {
    log.success(`Production domain ${bold(custom)}`);
    return false;
  }
  if (!offer) {
    skipOffer('No custom domain');
    return false;
  }

  const domain = answer(
    await text({
      message: 'Custom domain',
      placeholder: 'app.example.com (Enter keeps the vercel.app one)',
      defaultValue: '',
    }),
  ).trim();
  if (!domain) return false;

  await step(
    `Adding ${domain}`,
    () => addDomain(link, domain),
    () => `Domain ${bold(domain)} added`,
  );
  return true;
};

const askValue = async (key: string) => {
  const optional = isOptionalKey(key);
  const hint = [optional && 'optional, Enter to skip', DEPLOY.HINTS[key]].filter(Boolean).join('; ');
  const message = `${key}${hint ? dim(` (${hint})`) : ''}`;
  const validate = (value: string | undefined) => (optional && !value ? undefined : validateValue(key, value));

  if (isSecretKey(key)) return answer(await password({ message, validate }));
  return answer(
    await text({ message, initialValue: DEPLOY.DEFAULTS[key], defaultValue: optional ? '' : undefined, validate }),
  );
};

/**
 * Asks for the source-map and deploy-marker settings, unless both Vercel and GitHub hold them already.
 * @param keys The production variable names
 * @param githubVariables The GitHub repository variable names
 * @param offer Whether to offer them when no earlier run started them
 * @param ingestHost The `NEXT_PUBLIC_POSTHOG_HOST` given in this run, which tells the PostHog cloud
 */
const askPostHog = async (
  keys: string[],
  githubVariables: string[],
  offer: boolean,
  ingestHost?: string,
): Promise<PostHogDeploySettings | undefined> => {
  const started = keys.includes('POSTHOG_SOURCEMAPS_API_KEY');
  if (started && githubVariables.includes('POSTHOG_PROJECT_ID')) return undefined;

  if (started) log.info('Finishing the PostHog setup an earlier run started');
  else if (!offer) {
    skipOffer('No PostHog source maps');
    return undefined;
  } else if (
    !answer(
      await confirm({
        message: 'Upload source maps to PostHog error tracking and mark each deploy on its charts?',
        initialValue: false,
      }),
    )
  )
    return undefined;

  const region =
    ingestHost?.match(POSTHOG_INGEST_HOST)?.[1] ??
    answer(
      await select({
        message: 'PostHog cloud',
        options: [
          { value: 'us', label: 'US', hint: 'us.posthog.com' },
          { value: 'eu', label: 'EU', hint: 'eu.posthog.com' },
        ],
      }),
    );
  const apiKey = answer(
    await password({
      message: 'PostHog personal API key, used only for this (scopes: error_tracking:write, annotation:write)',
      validate: required,
    }),
  );
  const projectId = answer(
    await text({
      message: 'PostHog project id (the number in its URL)',
      validate: (value = '') => (/^\d+$/.test(value) ? undefined : 'Digits only'),
    }),
  );

  return { apiKey, projectId, appHost: POSTHOG_APP_HOSTS[region] };
};

/**
 * Fills the missing production variables.
 * @param link The project
 * @param githubVariables The GitHub repository variable names
 * @param offer Whether to offer the PostHog settings
 * @returns The PostHog settings given in this run, and whether it saved anything
 */
const setUpVariables = async (link: ProjectLink, githubVariables: string[], offer: boolean) => {
  const keys = await step(
    'Reading the production variables',
    () => listProductionKeys(link),
    (found) => `${found.length} already set`,
  );
  const missing = getSchemaKeys().filter(
    (key) => !keys.includes(key) && !DEPLOY.DERIVED.includes(key) && !(key in DEPLOY.PROVIDED),
  );
  const plan = planMissingKeys(missing);
  const values: Record<string, string> = {};
  for (const key of plan.generated) values[key] = generateSecret();

  const found = [
    ...Object.entries(plan.fromShell).map(([key, value]) => ({ key, value, source: 'shell' })),
    ...Object.entries(plan.fromDotenv).map(([key, value]) => ({ key, value, source: '.env' })),
  ];
  if (found.length) {
    const copied = answer(
      await multiselect({
        message: 'Copy these values to production? (Space toggles one; the others are asked)',
        options: found.map(({ key, source }) => ({ value: key, label: key, hint: source })),
        initialValues: found.map(({ key }) => key),
        required: false,
      }),
    );
    for (const { key, value } of found)
      if (copied.includes(key)) values[key] = value;
      else plan.toAsk.push(key);
  }

  for (const key of plan.toAsk) {
    const value = await askValue(key);
    if (value) values[key] = value;
  }

  const posthog = await askPostHog(keys, githubVariables, offer, values.NEXT_PUBLIC_POSTHOG_HOST);
  const config: Record<string, string> = Object.fromEntries(
    Object.entries(DEPLOY.BUILD).filter(([key]) => !keys.includes(key)),
  );
  if (posthog) {
    values.POSTHOG_SOURCEMAPS_API_KEY = posthog.apiKey;
    config.POSTHOG_PROJECT_ID = posthog.projectId;
    config.POSTHOG_APP_HOST = posthog.appHost;
  }

  // A NEXT_PUBLIC_ value ships in the browser bundle anyway, so it stays readable in the dashboard.
  const variables = [
    ...Object.entries(values).map(([key, value]) => ({ key, value, sensitive: !key.startsWith('NEXT_PUBLIC_') })),
    ...Object.entries(config).map(([key, value]) => ({ key, value, sensitive: false })),
  ];
  if (!variables.length) {
    log.success('Every production variable is already set');
    return { posthog, saved: false };
  }

  await step(
    'Saving the production variables',
    async (message) => {
      for (const { key, value, sensitive } of variables) {
        message(`Saving ${key}`);
        await addProductionVariable(link, key, value, { sensitive });
      }
    },
    () => `Saved ${variables.map(({ key }) => key).join(', ')}`,
  );
  if (plan.generated.length)
    log.info(`Generated for production: ${plan.generated.join(', ')} ${dim('(never your .env values)')}`);
  return { posthog, saved: true };
};

/**
 * Picks where the deploy secrets go: the deploy job's environment, or the repository when GitHub refuses environments.
 * @param repository The `owner/name` of the repository
 */
const prepareEnvironment = (repository: string) =>
  step(
    `Preparing the ${DEPLOY.GITHUB_ENVIRONMENT} environment`,
    () =>
      ensureEnvironment(repository, DEPLOY.GITHUB_ENVIRONMENT, DEPLOY.BRANCH).then(
        () => DEPLOY.GITHUB_ENVIRONMENT,
        () => undefined,
      ),
    (environment) =>
      environment
        ? `GitHub environment ${bold(environment)} ready`
        : 'GitHub refused the environment (a private repository on GitHub Free): the secrets go to the repository',
  );

/**
 * Stores the deploy token and ids in GitHub, and enables the deploy job.
 * @param repository The `owner/name` of the repository
 * @param link The project
 * @param reconfigure Whether to offer replacing a token GitHub holds already
 * @param posthog The PostHog settings given in this run
 * @returns Whether it stored a new secret
 */
const setUpGitHub = async (
  repository: string,
  link: ProjectLink,
  reconfigure: boolean,
  posthog?: PostHogDeploySettings,
) => {
  const environment = await prepareEnvironment(repository);
  const secrets = [
    ...(await listSecrets(repository)),
    ...(environment ? await listSecrets(repository, environment) : []),
  ];

  const hasToken = secrets.includes('VERCEL_TOKEN');
  const keepToken =
    hasToken &&
    (!reconfigure ||
      answer(await confirm({ message: 'GitHub already holds a VERCEL_TOKEN. Keep it?', initialValue: true })));
  if (keepToken) log.success('GitHub already holds VERCEL_TOKEN');

  if (!keepToken) {
    const token =
      (await step(
        'Creating a Vercel token for GitHub Actions',
        () => createDeployToken(link, `${repository} GitHub Actions`),
        (created) =>
          created
            ? `Vercel token created for ${link.projectName} only ${dim('(it never expires: revoke it on vercel.com/account/tokens)')}`
            : 'Vercel allows that only from a token login: create one',
      )) ||
      answer(
        await password({
          message: `Paste a Vercel token from ${bold('https://vercel.com/account/tokens')} (scope: the ${link.projectName} project)`,
          validate: required,
        }),
      );
    await step('Storing VERCEL_TOKEN in GitHub', () => setSecret(repository, 'VERCEL_TOKEN', token, environment));
  }

  await step(
    'Storing the deploy variables in GitHub',
    async () => {
      await setRepositoryVariable(repository, 'VERCEL_ORG_ID', link.orgId);
      await setRepositoryVariable(repository, 'VERCEL_PROJECT_ID', link.projectId);
      if (posthog) {
        await setSecret(repository, 'POSTHOG_ANNOTATIONS_API_KEY', posthog.apiKey, environment);
        await setRepositoryVariable(repository, 'POSTHOG_PROJECT_ID', posthog.projectId);
        await setRepositoryVariable(repository, 'POSTHOG_APP_HOST', posthog.appHost);
      }
      await setRepositoryVariable(repository, 'DEPLOYMENT_ENABLED', 'true');
    },
    () => 'GitHub deploys enabled',
  );
  return !keepToken || Boolean(posthog);
};

const verify = async (link: ProjectLink) => {
  const missing = await step('Checking production', async () =>
    findMissingProductionKeys(await listProductionKeys(link)),
  );
  if (missing.length) throw new Error(`Still missing in Vercel production: ${missing.join(', ')}.`);
  log.success('Production holds every variable the app requires');
};

/**
 * Offers to push the local branch when GitHub lacks some of its commits.
 * @returns Whether it pushed, which starts the CI/CD run by itself
 */
const pushBranch = async () => {
  const branch = DEPLOY.BRANCH;
  const onGitHub = await run('git', ['fetch', 'origin', branch]).then(
    () => true,
    () => false,
  );
  const ahead = onGitHub
    ? Number(await run('git', ['rev-list', '--count', `origin/${branch}..${branch}`]).catch(() => '0'))
    : 1;
  if (!ahead) return false;

  const push = answer(
    await confirm({
      message: onGitHub
        ? `Local ${branch} is ${ahead} commit(s) ahead of GitHub. Push it first?`
        : `GitHub has no ${branch} yet. Push it?`,
      initialValue: true,
    }),
  );
  if (push) await step(`Pushing ${branch}`, () => run('git', ['push', 'origin', branch]));
  return push;
};

/**
 * Waits for the run an event started.
 * @param repository The `owner/name` of the repository
 * @param event `push` or `workflow_dispatch`
 * @param since When the event happened
 */
const findRun = async (repository: string, event: string, since: number) => {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const latest = await getLatestRun(repository, DEPLOY.WORKFLOW, DEPLOY.BRANCH, event).catch(() => undefined);
    // A margin for the clock difference between this machine and GitHub.
    if (latest && new Date(latest.createdAt).getTime() >= since - 30_000) return latest.databaseId;
    await sleep(3000);
  }
  return undefined;
};

/**
 * Whether the latest CI/CD run on the branch finished with a successful deploy job.
 * @param repository The `owner/name` of the repository
 */
const isDeployed = async (repository: string) => {
  const runs = await Promise.all(
    ['push', 'workflow_dispatch'].map((event) =>
      getLatestRun(repository, DEPLOY.WORKFLOW, DEPLOY.BRANCH, event).catch(() => undefined),
    ),
  );
  const [latest] = runs.filter(isDefined).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (latest?.status !== 'completed') return false;

  const { jobs } = await getRun(repository, latest.databaseId);
  return jobs.some(({ name, conclusion }) => name === DEPLOY.DEPLOY_JOB && conclusion === 'success');
};

const deploy = async (repository: string) => {
  const since = Date.now();
  // A push to main starts the run already: a dispatch on top would deploy twice.
  const pushed = await pushBranch();
  if (!pushed) await dispatchWorkflow(repository, DEPLOY.WORKFLOW, DEPLOY.BRANCH);
  const deadline = Date.now() + RUN_TIMEOUT_MS;

  const indicator = spinner();
  indicator.start('Starting the CI/CD run');

  const id = await findRun(repository, pushed ? 'push' : 'workflow_dispatch', since);
  if (!id) {
    indicator.error('The run never started');
    throw new Error(`GitHub did not start the workflow. Is ${DEPLOY.WORKFLOW} on ${DEPLOY.BRANCH}?`);
  }
  const runUrl = `https://github.com/${repository}/actions/runs/${id}`;

  let failures = 0;
  while (Date.now() < deadline) {
    const current = await getRun(repository, id).catch((error: Error) => error);
    if (current instanceof Error) {
      failures += 1;
      if (failures >= MAX_POLL_FAILURES) {
        indicator.error('GitHub stopped answering');
        throw new Error(`${current.message}\nThe run goes on without the setup: follow it at ${runUrl}`);
      }
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    failures = 0;

    if (current.status === 'completed') {
      const deployJob = current.jobs.find(({ name }) => name === DEPLOY.DEPLOY_JOB);
      if (current.conclusion !== 'success') {
        indicator.error(`CI/CD ${current.conclusion}`);
        throw new Error(`The run did not succeed: ${current.url}`);
      }
      if (deployJob?.conclusion !== 'success') {
        indicator.error('Tests passed, but the deploy job did not run');
        throw new Error(`Check that the DEPLOYMENT_ENABLED variable is "true": ${current.url}`);
      }
      indicator.stop('Tests passed, then Vercel built, migrated and deployed');
      return current.url;
    }
    const active = current.jobs.filter(({ status }) => status === 'in_progress').map(({ name }) => name);
    indicator.message(`CI/CD: ${active.join(', ') || current.status} ${dim(current.url)}`);
    await sleep(POLL_INTERVAL_MS);
  }

  indicator.error('Still running after 45 minutes');
  throw new Error(`The run is still going; follow it at ${runUrl}`);
};

const main = async () => {
  intro(styleText(['bgCyan', 'black'], ' Deploy to Vercel '));
  note(
    [
      'Creates the Vercel project, its Neon database and Blob store,',
      'fills the production variables, enables the GitHub deploy job,',
      'then runs CI: tests, then the Vercel build, migrations, deploy.',
      dim('Finished steps are skipped, so it is safe to run again.'),
    ].join('\n'),
    'What happens',
  );

  const repository = await checkTools();
  const githubVariables = await listRepositoryVariables(repository);
  const reconfigure = process.argv.includes(RECONFIGURE_FLAG);
  const offer = reconfigure || !githubVariables.includes('DEPLOYMENT_ENABLED');

  const link = await setUpProject(repository);
  await step(
    'Applying the project settings',
    () => configureProject(link),
    (node) => `Next.js preset, Node ${node}`,
  );
  const stored = await setUpStorage(link, offer);
  const domainAdded = await setUpDomain(link, offer);
  const { posthog, saved } = await setUpVariables(link, githubVariables, offer);
  const secretsStored = await setUpGitHub(repository, link, reconfigure, posthog);
  await verify(link);

  const changed = stored || domainAdded || saved || secretsStored;
  if (!offer && !changed && (await step('Checking the last deploy', () => isDeployed(repository)))) {
    outro(`Nothing to change, and ${DEPLOY.BRANCH} is deployed. Every push to it deploys once the tests pass.`);
    return;
  }

  if (!answer(await confirm({ message: `Deploy ${DEPLOY.BRANCH} now?`, initialValue: true }))) {
    outro(`Ready. Every push to ${DEPLOY.BRANCH} deploys once the tests pass.`);
    return;
  }

  const runUrl = await deploy(repository);
  const [domain] = await listProductionDomains(link).catch(() => []);
  outro(
    [
      `${domain ? `Live at ${bold(`https://${domain}`)}` : 'Deployed'} ${dim(runUrl)}`,
      `Every push to ${DEPLOY.BRANCH} now deploys once the tests pass.`,
    ].join('\n'),
  );
};

main().catch((error: unknown) => {
  log.error(error instanceof Error ? error.message : String(error));
  cancel('Setup stopped. Fix the step above, then run `pnpm deploy:setup` again: finished steps are skipped.');
  process.exit(1);
});
