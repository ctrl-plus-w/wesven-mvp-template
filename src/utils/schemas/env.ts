import { z } from '@/instance/zod';

/** An empty value counts as unset, so `KEY=` in a `.env` file behaves like a missing key. */
const optionalSetting = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

/**
 * The server settings. Kept apart from `@/env`, which parses them on import, so tooling such as the deploy setup can
 * read the keys without a complete environment.
 */
export const EnvSchema = z.object({
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
