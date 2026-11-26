// Vercel's build command (`vercel.json`): builds the app, then applies pending migrations on a production build. A
// failed `next build` leaves the database untouched, and a failed migration fails the deploy, so the live version keeps
// serving. Migrations commit before Vercel packages the output, though: a deploy that fails after them leaves the
// schema ahead of the live version, so keep each one backward compatible (add first, drop in a later deploy). A
// preview build never changes the schema.

import { execFileSync } from 'node:child_process';

/**
 * Runs pnpm attached to the build log.
 * @param args The pnpm arguments
 * @param env Variables set on top of the build's own
 */
const pnpm = (args: string[], env: Record<string, string | undefined> = {}) =>
  execFileSync('pnpm', args, { stdio: 'inherit', env: { ...process.env, ...env } });

pnpm(['run', 'build']);

// DDL goes through Neon's direct connection: the pooled one runs in transaction mode and can drop the session.
if (process.env.VERCEL_ENV === 'production')
  pnpm(['run', 'db:migrate'], { DATABASE_URL: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL });
