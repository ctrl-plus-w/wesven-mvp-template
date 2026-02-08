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

const EnvSchema = z.object({
  DATABASE_URL: z.string(),

  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.url(),

  RESEND_FROM_EMAIL: z.string(),
  RESEND_API_KEY: z.string(),

  NODE_ENV: z.enum(['development', 'production', 'preview', 'test']).default('development'),
});

const ENV = EnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,

  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,

  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,

  NODE_ENV: process.env.NODE_ENV,
});

export default ENV;
