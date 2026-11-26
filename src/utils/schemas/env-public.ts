import { z } from '@/instance/zod';

/**
 * The settings inlined into the browser bundle. Kept apart from `@/env.public`, which parses them on import, so tooling
 * such as the deploy setup can read the keys without a complete environment.
 */
export const EnvPublicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),

  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_HOST: z.url(),
});
