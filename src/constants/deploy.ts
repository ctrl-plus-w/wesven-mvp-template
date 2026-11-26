import type { DeployConfig } from '@/type/deploy';

/**
 * How `pnpm deploy:setup` and `pnpm deploy:check` treat each key of the env schemas (`@/util/schemas/env*`). A key
 * listed nowhere is asked for (or copied from `.env`), so a new required setting needs no change here.
 */
const DEPLOY: DeployConfig = {
  /** Written into the Vercel project by the integration that `deploy:setup` provisions. */
  PROVIDED: {
    DATABASE_URL: 'Neon',
  },

  /** Generated once for production: a development value is never reused. */
  GENERATED: ['BETTER_AUTH_SECRET', 'CRON_SECRET'],

  /** Left unset: `@/env` and `@/env.public` fall back to Vercel's production domain, and Vercel sets `NODE_ENV`. */
  DERIVED: ['BETTER_AUTH_URL', 'NEXT_PUBLIC_APP_URL', 'NODE_ENV'],

  /** Proposed when neither the shell nor `.env` holds a value. */
  DEFAULTS: {
    NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
  },

  /** Shown next to the prompt of a key. */
  HINTS: {
    NEXT_PUBLIC_POSTHOG_HOST: 'EU cloud: https://eu.i.posthog.com',
  },

  /** Build settings the app never reads. Corepack makes Vercel install the pnpm pinned in `packageManager`. */
  BUILD: {
    ENABLE_EXPERIMENTAL_COREPACK: '1',
  },

  /** The GitHub environment that holds `VERCEL_TOKEN`, the workflow that deploys, and the `name` of its deploy job. */
  GITHUB_ENVIRONMENT: 'ci-cd',
  WORKFLOW: 'ci.yaml',
  DEPLOY_JOB: 'Deploy to Vercel',
  BRANCH: 'main',

  /** Where Neon can host the database. The functions move with it: every query would cross an ocean otherwise. */
  REGIONS: [
    { value: 'iad1', label: 'Washington, D.C. (Vercel default)' },
    { value: 'cle1', label: 'Cleveland' },
    { value: 'pdx1', label: 'Portland' },
    { value: 'fra1', label: 'Frankfurt' },
    { value: 'lhr1', label: 'London' },
    { value: 'sin1', label: 'Singapore' },
    { value: 'syd1', label: 'Sydney' },
    { value: 'gru1', label: 'São Paulo' },
  ],
};

export default DEPLOY;
