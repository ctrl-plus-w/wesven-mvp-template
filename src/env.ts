import { loadEnv } from '@/util/load-env.server';
import { EnvSchema } from '@/util/schemas/env';
import { toHttpsUrl } from '@/util/string';

loadEnv();

/** https://nextjs.org/docs/pages/guides/environment-variables
 * Next.js will load the environment variables in the following order :
 *
 * 1. `process.env`
 * 2. `.env.$(NODE_ENV).local`
 * 3. `.env.local` (Not checked when NODE_ENV is `test`.)
 * 4. `.env.$(NODE_ENV)`
 * 5. `.env`
 */
const ENV = EnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,

  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  // On Vercel, unset means the project's production domain: its shortest custom domain, else its vercel.app one.
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || toHttpsUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL),

  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,

  CRON_SECRET: process.env.CRON_SECRET,

  NODE_ENV: process.env.NODE_ENV,
});

export default ENV;
