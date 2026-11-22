import { PostHog } from 'posthog-node';

import { scrubProperties } from '@/util/posthog-scrub';

import type { ServerErrorSink } from '@/type/server';

import ENV_PUBLIC from '@/env.public';

/**
 * The server client. Each event leaves at once (`flushAt: 1`): a serverless function can be frozen right after the
 * response, so a batched tail would be lost. Events pass the same scrubber as the browser's.
 */
const posthogServer = new PostHog(ENV_PUBLIC.NEXT_PUBLIC_POSTHOG_KEY, {
  host: ENV_PUBLIC.NEXT_PUBLIC_POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0,
  fetchRetryCount: 1,
  before_send: (event) => event && { ...event, properties: event.properties && scrubProperties(event.properties) },
});

/** Sends an unexpected server error to PostHog error tracking, as an anonymous event (no person profile). */
export const captureServerException: ServerErrorSink = (error, context) =>
  posthogServer.captureExceptionImmediate(error, undefined, { ...context, $process_person_profile: false });

export default posthogServer;
