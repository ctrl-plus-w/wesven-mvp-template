import posthog from 'posthog-js';

import { POSTHOG_OPTIONS } from '@/util/posthog-options';

import ENV_PUBLIC from '@/env.public';

// Runs before the app hydrates, so an error thrown while React mounts is already captured.
posthog.init(ENV_PUBLIC.NEXT_PUBLIC_POSTHOG_KEY, POSTHOG_OPTIONS);
