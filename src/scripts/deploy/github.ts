import type { WorkflowRun, WorkflowRunDetails } from '@/type/deploy';

import { run, runInteractive, succeeds } from '@/scripts/deploy/shell';

const GITHUB_REMOTE = /github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/;

/** Whether the GitHub CLI is installed. */
export const hasGitHubCli = () => succeeds('gh', ['--version']);

/** Whether the GitHub CLI is logged in. */
export const isGitHubLoggedIn = () => succeeds('gh', ['auth', 'status']);

/** Runs `gh auth login` in the terminal. */
export const loginToGitHub = () => runInteractive('gh', ['auth', 'login']);

/**
 * The `owner/name` of the repository `origin` points to: the one the setup pushes to, never the `gh` default (an
 * `upstream` template, after a fork).
 */
export const getRepository = async () => {
  const url = await run('git', ['remote', 'get-url', 'origin']);
  const [, repository] = url.match(GITHUB_REMOTE) ?? [];
  // The URL itself stays out of the message: an HTTPS remote can hold a token.
  if (!repository) throw new Error('The `origin` remote does not point to a github.com repository.');
  return run('gh', ['repo', 'view', repository, '--json', 'nameWithOwner', '--jq', '.nameWithOwner']);
};

/**
 * Creates the deployment environment, restricted to one branch, or keeps an existing one as it is. Rejects when GitHub
 * refuses environments (a private repository on GitHub Free).
 * @param repository The `owner/name` of the repository
 * @param environment The environment name
 * @param branch The only branch allowed to deploy from it
 */
export const ensureEnvironment = async (repository: string, environment: string, branch: string) => {
  const path = `repos/${repository}/environments/${environment}`;
  if (await succeeds('gh', ['api', path, '--silent'])) return;

  const restrict = (policy: object | null) =>
    run('gh', ['api', '--method', 'PUT', path, '--input', '-', '--silent'], {
      input: JSON.stringify({ deployment_branch_policy: policy }),
    });

  await restrict({ protected_branches: false, custom_branch_policies: true });
  try {
    await run('gh', [
      'api',
      '--method',
      'POST',
      `${path}/deployment-branch-policies`,
      '-f',
      `name=${branch}`,
      '--silent',
    ]);
  } catch (error) {
    // An environment no branch may use would block every deploy.
    await restrict(null);
    throw error;
  }
};

/**
 * The names of the secrets the repository, or one of its environments, holds.
 * @param repository The `owner/name` of the repository
 * @param environment The environment name, if any
 */
export const listSecrets = async (repository: string, environment?: string) => {
  const scope = environment ? ['--env', environment] : [];
  const output = await run('gh', ['secret', 'list', '--repo', repository, ...scope, '--json', 'name']);
  const secrets: { name: string }[] = JSON.parse(output || '[]');
  return secrets.map(({ name }) => name);
};

/**
 * Stores a secret in the repository or one of its environments. The value goes through stdin and an empty one is
 * refused, since `gh` would store it.
 * @param repository The `owner/name` of the repository
 * @param name The secret name
 * @param value The secret value
 * @param environment The environment name, if any
 */
export const setSecret = (repository: string, name: string, value: string, environment?: string) => {
  if (!value) throw new Error(`Refusing to store an empty ${name}.`);
  const scope = environment ? ['--env', environment] : [];
  return run('gh', ['secret', 'set', name, '--repo', repository, ...scope], { input: value });
};

/**
 * The names of the repository variables.
 * @param repository The `owner/name` of the repository
 */
export const listRepositoryVariables = async (repository: string) => {
  const output = await run('gh', ['variable', 'list', '--repo', repository, '--json', 'name']);
  const variables: { name: string }[] = JSON.parse(output || '[]');
  return variables.map(({ name }) => name);
};

/**
 * Stores a repository variable. Variables are not secret: they show in the logs.
 * @param repository The `owner/name` of the repository
 * @param name The variable name
 * @param value The variable value
 */
export const setRepositoryVariable = (repository: string, name: string, value: string) =>
  run('gh', ['variable', 'set', name, '--repo', repository, '--body', value]);

/**
 * Starts a `workflow_dispatch` run.
 * @param repository The `owner/name` of the repository
 * @param workflow The workflow file name
 * @param branch The branch to run on
 */
export const dispatchWorkflow = (repository: string, workflow: string, branch: string) =>
  run('gh', ['workflow', 'run', workflow, '--repo', repository, '--ref', branch]);

/**
 * The most recent run of a workflow on a branch, started by one event.
 * @param repository The `owner/name` of the repository
 * @param workflow The workflow file name
 * @param branch The branch
 * @param event The event that started it: `push` or `workflow_dispatch`
 */
export const getLatestRun = async (repository: string, workflow: string, branch: string, event: string) => {
  const output = await run('gh', [
    'run',
    'list',
    '--repo',
    repository,
    '--workflow',
    workflow,
    '--branch',
    branch,
    '--event',
    event,
    '--limit',
    '1',
    '--json',
    'databaseId,url,status,conclusion,createdAt',
  ]);
  const runs: WorkflowRun[] = JSON.parse(output || '[]');
  return runs.at(0);
};

/**
 * A run's status and its jobs.
 * @param repository The `owner/name` of the repository
 * @param id The run id
 */
export const getRun = async (repository: string, id: number): Promise<WorkflowRunDetails> => {
  const output = await run('gh', [
    'run',
    'view',
    String(id),
    '--repo',
    repository,
    '--json',
    'databaseId,url,status,conclusion,createdAt,jobs',
  ]);
  return JSON.parse(output);
};
