import nextEnv from '@next/env';

import { z } from '@/instance/zod';

const pwd = process.cwd();

// @next/env doesn't support ESM module: https://github.com/vercel/next.js/issues/68091
if (nextEnv && 'loadEnvConfig' in nextEnv) nextEnv.loadEnvConfig(pwd);
else require('@next/env').loadEnvConfig(pwd);

/** https://nextjs.org/docs/pages/guides/environment-variables
 * Next.js will load the environment variables in the following order :
 *
 * 1. `process.env`
 * 2. `.env.$(NODE_ENV).local`
 * 3. `.env.local` (Not checked when NODE_ENV is `test`.)
 * 4. `.env.$(NODE_ENV)`
 * 5. `.env`
 */

/** An empty value counts as unset, so `KEY=` in a `.env` file behaves like a missing key. */
const optionalSetting = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),

  RESEND_FROM_EMAIL: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),

  // Authenticates the `/api/cron/*` routes (Vercel Cron sends it as `Authorization: Bearer`). Unset, every cron
  // request is refused.
  CRON_SECRET: optionalSetting(z.string().min(16)),

  NODE_ENV: z.enum(['development', 'production', 'preview', 'test']).default('development'),
});

const ENV = EnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,

  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,

  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,

  CRON_SECRET: process.env.CRON_SECRET,

  NODE_ENV: process.env.NODE_ENV,
});

export default ENV;
