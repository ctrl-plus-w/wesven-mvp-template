import { EnvPublicSchema } from '@/util/schemas/env-public';
import { toHttpsUrl } from '@/util/string';

const ENV_PUBLIC = EnvPublicSchema.parse({
  // On Vercel, unset means the project's production domain, inlined at build time like any `NEXT_PUBLIC_` value.
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL || toHttpsUrl(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL),

  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

export default ENV_PUBLIC;
