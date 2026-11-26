export interface DeployConfig {
  PROVIDED: Record<string, string>;
  GENERATED: string[];
  DERIVED: string[];
  DEFAULTS: Record<string, string>;
  HINTS: Record<string, string>;
  BUILD: Record<string, string>;
  GITHUB_ENVIRONMENT: string;
  WORKFLOW: string;
  DEPLOY_JOB: string;
  BRANCH: string;
  REGIONS: DeployRegion[];
}

export interface DeployRegion {
  value: string;
  label: string;
}

export interface RunOptions {
  /** Written to the command's stdin, so a secret never appears in its arguments or the process list. */
  input?: string;
  env?: Record<string, string | undefined>;
  /** Names the command in its error, when its own name says little (`pnpm dlx …`). */
  label?: string;
}

export interface WorkflowRun {
  databaseId: number;
  url: string;
  status: string;
  conclusion: string;
  createdAt: string;
}

export interface WorkflowJob {
  name: string;
  status: string;
  conclusion: string;
}

export interface WorkflowRunDetails extends WorkflowRun {
  jobs: WorkflowJob[];
}

export interface VercelEnvVariable {
  key: string;
  target?: string[] | string;
  type: string;
}

export interface VercelEnvList {
  envs: VercelEnvVariable[];
}

/** A project, as `GET /v9/projects/:idOrName` returns it (the fields the setup reads). */
export interface VercelProject {
  id: string;
  accountId: string;
  name: string;
  serverlessFunctionRegion?: string | null;
}

/** The ids `.vercel/project.json` holds, which every `vercel` command reads to find the project. */
export interface ProjectLink {
  orgId: string;
  projectId: string;
  projectName: string;
}

export interface VercelScope {
  slug: string;
  name: string;
}

export interface VercelDomain {
  name: string;
  redirect?: string | null;
  gitBranch?: string | null;
}

/** The PostHog settings source-map uploads and deploy markers need. */
export interface PostHogDeploySettings {
  apiKey: string;
  projectId: string;
  appHost: string;
}
