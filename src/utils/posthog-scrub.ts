import type { CaptureResult } from 'posthog-js';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// Bounded, so a long run of word characters cannot make the scan quadratic.
const EMAIL_PATTERN = /[\w.+%-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){1,8}/g;
const URL_KEY_PATTERN = /(url|pathname|referrer|href)$/i;
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
// A query string quoted inside free text (an error message), up to the next space or fragment.
const EMBEDDED_QUERY_PATTERN = /\?[^\s#]*=[^\s#]*/g;
// PostHog's own ids for the person, device, session and page: without them every event is one person's.
const IDENTITY_KEYS = new Set([
  'distinct_id',
  '$device_id',
  '$user_id',
  '$anon_distinct_id',
  '$session_id',
  '$window_id',
  '$pageview_id',
  '$prev_pageview_id',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Free text with its UUIDs replaced by `:id`, its emails by `:email` and the query strings it quotes removed. */
export const scrubText = (value: string) =>
  value.replace(EMBEDDED_QUERY_PATTERN, '').replace(UUID_PATTERN, ':id').replace(EMAIL_PATTERN, ':email');

/** A URL without its query string and fragment (reset tokens, search terms), and with its ids replaced. */
export const scrubUrl = (value: string) => scrubText(value.split(/[?#]/)[0]);

const scrubValue = (key: string, value: unknown): unknown => {
  if (IDENTITY_KEYS.has(key)) return value;
  if (typeof value === 'string')
    return URL_KEY_PATTERN.test(key) || ABSOLUTE_URL_PATTERN.test(value) ? scrubUrl(value) : scrubText(value);
  if (Array.isArray(value)) return value.map((item) => scrubValue(isRecord(item) ? '' : key, item));
  if (isRecord(value)) return scrubProperties(value);
  return value;
};

/**
 * Every property with its ids, emails and query strings scrubbed, recursively; PostHog's own identity ids are kept.
 * @param properties An event's properties, `$set` or `$set_once`
 */
export const scrubProperties = (properties: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, scrubValue(key, value)]));

/**
 * PostHog's `before_send`: what leaves the browser carries no UUID, email, query string or URL fragment. Replay
 * snapshots are left to the recorder's own masking (`maskAllInputs`), as walking each DOM mutation would be costly.
 * @param event The event about to be sent, or `null` when an earlier `before_send` dropped it
 */
export const scrubPostHogEvent = (event: CaptureResult | null): CaptureResult | null => {
  if (!event || event.event === '$snapshot') return event;

  return {
    ...event,
    properties: scrubProperties(event.properties),
    ...(event.$set && { $set: scrubProperties(event.$set) }),
    ...(event.$set_once && { $set_once: scrubProperties(event.$set_once) }),
  };
};
