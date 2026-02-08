import { z } from '@/instance/zod';

const EnvPublicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),

  NEXT_PUBLIC_POSTHOG_KEY: z.string(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string(),
});

const ENV_PUBLIC = EnvPublicSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,

  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

export default ENV_PUBLIC;
