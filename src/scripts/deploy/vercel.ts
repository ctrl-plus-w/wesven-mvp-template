import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { ProjectLink, RunOptions, VercelDomain, VercelEnvList, VercelProject, VercelScope } from '@/type/deploy';

import { productionKeysOf } from '@/scripts/deploy/env-plan';
import { run, runInteractive, succeeds } from '@/scripts/deploy/shell';

/** Pinned like the deploy job: keep it equal to `VERCEL_CLI_VERSION` in .github/workflows/ci.yaml. */
export const VERCEL_CLI = 'vercel@65.11.0';

const LINK_FILE = '.vercel/project.json';
const DLX = ['--reporter=silent', 'dlx', VERCEL_CLI];

/**
 * Runs a Vercel CLI command without prompts: one that would need an answer fails at once instead of waiting.
 * @param args The command and its flags, never a secret (pass one through `options.input`)
 * @param options The stdin content
 */
const vercel = (args: string[], options: RunOptions = {}) =>
  run('pnpm', [...DLX, ...args, '--non-interactive'], { ...options, label: `vercel ${args.slice(0, 2).join(' ')}` });

/**
 * Runs a Vercel CLI command attached to the terminal, for the steps only a person can do (a login, a choice).
 * @param args The command and its flags
 */
const vercelInteractive = (args: string[]) =>
  runInteractive('pnpm', [...DLX, ...args], `vercel ${args.slice(0, 2).join(' ')}`);

/**
 * Parses a JSON answer, skipping any banner the CLI prints before it.
 * @param output The command's stdout
 */
const parseJson = <T>(output: string): T => JSON.parse(output.slice(output.search(/[[{]/)));

/**
 * Calls the Vercel REST API with the CLI's credentials.
 * @param path The endpoint, such as `/v2/teams`
 * @param team The team the call runs in (an id or a slug), if any
 * @param body A JSON body, sent through stdin with PATCH
 */
const api = async <T>(path: string, team?: string, body?: object): Promise<T> => {
  const scope = team ? ['--scope', team] : [];
  const method = body ? ['-X', 'PATCH', '--input', '-'] : [];
  const output = await vercel(['api', path, '--raw', ...method, ...scope], { input: body && JSON.stringify(body) });
  return parseJson<T>(output || '{}');
};

const getNodeVersion = () => `${readFileSync('.nvmrc', 'utf8').trim().replace(/^v/, '').split('.')[0]}.x`;

/** Whether the CLI holds a valid login. */
export const isVercelLoggedIn = () => succeeds('pnpm', [...DLX, 'whoami', '--non-interactive']);

/** Runs `vercel login` in the terminal. */
export const loginToVercel = () => vercelInteractive(['login']);

/** The teams the login can create a project in. */
export const listScopes = async (): Promise<VercelScope[]> => {
  const { teams } = await api<{ teams?: VercelScope[] }>('/v2/teams');
  if (teams?.length) return teams.map(({ slug, name }) => ({ slug, name: name || slug }));

  const { user } = await api<{ user: { username: string; name?: string } }>('/v2/user');
  return [{ slug: user.username, name: user.name || user.username }];
};

/** The project this folder is linked to, from `.vercel/project.json`. */
export const readProjectLink = (): ProjectLink | undefined => {
  if (!existsSync(LINK_FILE)) return undefined;
  const { orgId, projectId, projectName }: Partial<ProjectLink> = JSON.parse(readFileSync(LINK_FILE, 'utf8'));
  return orgId && projectId && projectName ? { orgId, projectId, projectName } : undefined;
};

/**
 * Whether the team already has a project with this name.
 * @param projectName The project name
 * @param scope The team slug
 */
export const projectExists = async (projectName: string, scope: string) => {
  const { projects } = await api<{ projects: { name: string }[] }>(
    `/v10/projects?search=${encodeURIComponent(projectName)}&limit=100`,
    scope,
  );
  return projects.some(({ name }) => name === projectName);
};

/**
 * Links this folder to the project, creating it first unless it exists. It writes `.vercel/project.json` itself, as
 * `vercel link` would also connect the Git repository on create (every push would then deploy outside CI), and always
 * writes a `VERCEL_OIDC_TOKEN` to `.env.local` and appends `.env*` to `.gitignore`.
 * @param projectName The project name
 * @param scope The team slug
 * @param create Whether the project still has to be created
 */
export const linkProject = async (projectName: string, scope: string, create: boolean) => {
  if (create) await vercel(['project', 'create', projectName, '--scope', scope]);
  const project = await api<VercelProject>(`/v9/projects/${encodeURIComponent(projectName)}`, scope);

  const link: ProjectLink = { orgId: project.accountId, projectId: project.id, projectName: project.name };
  mkdirSync(dirname(LINK_FILE), { recursive: true });
  writeFileSync(LINK_FILE, `${JSON.stringify(link)}\n`);
  return link;
};

/**
 * Sets what the build relies on: the Next.js preset, the Node major of `.nvmrc`, and the system variables (the
 * production domain `@/env` falls back to).
 * @param link The project
 */
export const configureProject = async (link: ProjectLink) => {
  const nodeVersion = getNodeVersion();
  await api(`/v9/projects/${link.projectId}`, link.orgId, {
    framework: 'nextjs',
    nodeVersion,
    autoExposeSystemEnvs: true,
  });
  return nodeVersion;
};

/**
 * The region the functions run in, when one was ever chosen.
 * @param link The project
 */
export const getFunctionRegion = async (link: ProjectLink) => {
  const { serverlessFunctionRegion } = await api<VercelProject>(`/v9/projects/${link.projectId}`, link.orgId);
  return serverlessFunctionRegion ?? undefined;
};

/**
 * Runs the functions in the database's region.
 * @param link The project
 * @param region A Vercel region id, such as `fra1`
 */
export const setFunctionRegion = (link: ProjectLink, region: string) =>
  api(`/v9/projects/${link.projectId}`, link.orgId, { serverlessFunctionRegion: region });

/**
 * The names of the project's Production variables. Values are never read.
 * @param link The project
 */
export const listProductionKeys = async (link: ProjectLink) =>
  productionKeysOf(await api<VercelEnvList>(`/v10/projects/${link.projectId}/env`, link.orgId));

/**
 * Creates a free Neon database connected to Production only, so a preview can never write to it. Its terms are
 * accepted for the team first, which the CLI allows without a browser for Neon only.
 * @param link The project
 * @param region The Neon region, such as `fra1`
 */
export const addNeonDatabase = async (link: ProjectLink, region: string) => {
  const scope = ['--scope', link.orgId];
  await vercel(['integration', 'accept-terms', 'neon', '--yes', ...scope]);
  await vercel([
    'integration',
    'add',
    'neon',
    '--billing-plan',
    'free_v3',
    '--meta',
    `region=${region}`,
    // Better Auth handles sign-in; Neon Auth would add a second user table.
    '--meta',
    'auth=false',
    '--name',
    `${link.projectName}-db`,
    '--environment',
    'production',
    '--no-env-pull',
    ...scope,
  ]);
};

/**
 * The fallback when the free plan or the region is refused: the CLI asks for them itself.
 * @param link The project
 */
export const addNeonDatabaseInteractively = (link: ProjectLink) =>
  vercelInteractive([
    'integration',
    'add',
    'neon',
    '--environment',
    'production',
    '--no-env-pull',
    '--scope',
    link.orgId,
  ]);

/**
 * Creates a public Blob store (what `@/util/blob` uploads to) and gives Production its `BLOB_READ_WRITE_TOKEN`. The
 * name ends with the project id, so a store left by an earlier run is reused and another project's never is.
 * @param link The project
 * @param region The region to store the files in, if known
 */
export const addBlobStore = async (link: ProjectLink, region?: string) => {
  const scope = ['--scope', link.orgId];
  const name = `${link.projectName.slice(0, 16)}-${link.projectId.slice(-8).toLowerCase()}-blob`;
  const location = region ? ['--region', region] : [];
  const created = await vercel([
    'storage',
    'create',
    name,
    '--type',
    'blob',
    '--access',
    'public',
    ...location,
    ...scope,
  ]).catch((error: Error) => error);

  try {
    await vercel([
      'storage',
      'connect',
      name,
      '--auth',
      'token',
      '--add-rw-token',
      '--environment',
      'production',
      '--yes',
      ...scope,
    ]);
  } catch (error) {
    throw created instanceof Error ? created : error;
  }
};

/**
 * Adds a Production variable. The value goes through stdin, and an empty one is refused.
 * @param link The project
 * @param key The variable name
 * @param value The variable value
 * @param options Whether Vercel stores it as a write-only Secret
 */
export const addProductionVariable = (
  link: ProjectLink,
  key: string,
  value: string,
  { sensitive }: { sensitive: boolean },
) => {
  if (!value) throw new Error(`Refusing to store an empty ${key}.`);
  return vercel(
    [
      'env',
      'add',
      key,
      '--environment',
      'production',
      sensitive ? '--sensitive' : '--no-sensitive',
      '--force',
      '--yes',
      '--scope',
      link.orgId,
    ],
    { input: value },
  );
};

/**
 * The domains production answers on, custom ones first, shortest first (the order `VERCEL_PROJECT_PRODUCTION_URL`
 * follows).
 * @param link The project
 */
export const listProductionDomains = async (link: ProjectLink) => {
  const { domains } = await api<{ domains: VercelDomain[] }>(`/v9/projects/${link.projectId}/domains`, link.orgId);
  const isVercelDomain = (name: string) => name.endsWith('.vercel.app');

  return domains
    .filter(({ redirect, gitBranch }) => !redirect && !gitBranch)
    .map(({ name }) => name)
    .sort((a, b) => Number(isVercelDomain(a)) - Number(isVercelDomain(b)) || a.length - b.length);
};

/**
 * Assigns a domain the team owns or will point at Vercel, then prints the DNS records it still needs.
 * @param link The project
 * @param domain The domain, such as `app.example.com`
 */
export const addDomain = async (link: ProjectLink, domain: string) => {
  await vercel(['domains', 'add', domain, link.projectName, '--scope', link.orgId]);
  // Exits non-zero until the DNS records exist, which is expected right after adding the domain.
  await vercelInteractive(['domains', 'verify', domain, '--scope', link.orgId]).catch(() => undefined);
};

/**
 * Creates a token for GitHub Actions that can act on this project only. Vercel only allows it from a classic token
 * login, so the browser login gets undefined and the token is asked for instead.
 * @param link The project
 * @param name The token name shown on the Vercel tokens page
 */
export const createDeployToken = async (link: ProjectLink, name: string) => {
  try {
    const { bearerToken } = parseJson<{ bearerToken?: string }>(
      await vercel(['tokens', 'create', name, '--project', link.projectId, '--json']),
    );
    return bearerToken;
  } catch {
    return undefined;
  }
};
