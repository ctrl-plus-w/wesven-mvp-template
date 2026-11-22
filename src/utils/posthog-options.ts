import type { PostHogConfig } from 'posthog-js';

import { scrubPostHogEvent } from '@/util/posthog-scrub';

import ENV_PUBLIC from '@/env.public';

/**
 * The browser client's options, kept out of `instrumentation-client.ts` so a unit test can read them.
 * Pageviews fire on every history change, so client-side navigations count too. Uncaught errors and unhandled
 * rejections are captured as exceptions. A person profile is created only once `identify()` is called, so anonymous
 * visitors cost nothing. Replays mask every input, and `before_send` strips ids, emails and query strings.
 */
export const POSTHOG_OPTIONS: Partial<PostHogConfig> = {
  api_host: ENV_PUBLIC.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
  capture_pageview: 'history_change',
  capture_exceptions: true,
  person_profiles: 'identified_only',
  session_recording: { maskAllInputs: true },
  before_send: scrubPostHogEvent,
  debug: process.env.NODE_ENV === 'development',
};
