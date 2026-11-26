// `pnpm deploy:check`: the deploy job's preflight. Names every missing setting (the token, the ids, a production
// variable the env schemas require) and why, instead of letting the build fail later on a zod error. Reads only the
// variable names, so it works with Sensitive values.

import type { VercelEnvList } from '@/type/deploy';

import { findMissingProductionKeys, productionKeysOf } from '@/scripts/deploy/env-plan';

/**
 * Prints each message (as an error annotation on GitHub Actions), then exits with code 1.
 * @param messages One line per missing setting
 */
const fail = (messages: string[]): never => {
  const prefix = process.env.GITHUB_ACTIONS === 'true' ? '::error::' : '✖ ';
  for (const message of messages) console.error(`${prefix}${message}`);
  process.exit(1);
};

const { VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID } = process.env;

const unset = Object.entries({ VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID }).filter(([, value]) => !value);
if (unset.length)
  fail(unset.map(([name]) => `${name} is empty: run \`pnpm deploy:setup\`, or set it in the GitHub settings.`));

// A personal account's id is a user id, which the API refuses as a `teamId`.
const scope = VERCEL_ORG_ID?.startsWith('team_') ? `?teamId=${VERCEL_ORG_ID}` : '';
const response = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env${scope}`, {
  headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
});

if (response.status === 401 || response.status === 403)
  fail([`Vercel refused VERCEL_TOKEN (${response.status}): it is invalid, expired, or not scoped to this team.`]);
if (!response.ok)
  fail([`Vercel answered ${response.status} for project ${VERCEL_PROJECT_ID}: ${await response.text()}`]);

const list: VercelEnvList = await response.json();
const productionKeys = productionKeysOf(list);

const missing = findMissingProductionKeys(productionKeys);
if (missing.length)
  fail(missing.map((key) => `${key} is not set for Production in Vercel: run \`pnpm deploy:setup\` to add it.`));

process.stdout.write(`Vercel production holds every required variable (${productionKeys.length} set).\n`);
