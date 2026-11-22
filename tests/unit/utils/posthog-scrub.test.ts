import type { CaptureResult } from 'posthog-js';
import { describe, expect, it } from 'vitest';

import { scrubPostHogEvent, scrubProperties, scrubText, scrubUrl } from '@/util/posthog-scrub';

const ID = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';

const eventWith = (event: string, properties: Record<string, unknown>): CaptureResult => ({
  uuid: 'event-uuid',
  event,
  properties,
});

describe('posthog-scrub', () => {
  describe('scrubText', () => {
    it('replaces UUIDs and emails', () => {
      expect(scrubText(`user ${ID} (jane.doe+x@example.co.uk) failed`)).toBe('user :id (:email) failed');
    });

    it('removes a query string quoted in the text', () => {
      expect(scrubText('GET /reset-password?token=abc123 failed')).toBe('GET /reset-password failed');
    });
  });

  describe('scrubUrl', () => {
    it('drops the query string and fragment, keeps the origin and path', () => {
      expect(scrubUrl(`https://app.test/dashboard/projects/${ID}?tab=1#top`)).toBe(
        'https://app.test/dashboard/projects/:id',
      );
    });

    it('drops a reset token', () => {
      expect(scrubUrl('https://app.test/reset-password?token=secret-token')).toBe('https://app.test/reset-password');
    });
  });

  describe('scrubProperties', () => {
    it('scrubs URL properties, free text, nested objects and arrays', () => {
      expect(
        scrubProperties({
          $current_url: `https://app.test/users/${ID}?email=a@b.co`,
          $pathname: `/users/${ID}`,
          note: 'contact a@b.co',
          nested: { list: [`id ${ID}`, { href: 'https://app.test/x?y=1' }] },
          count: 3,
        }),
      ).toEqual({
        $current_url: 'https://app.test/users/:id',
        $pathname: '/users/:id',
        note: 'contact :email',
        nested: { list: ['id :id', { href: 'https://app.test/x' }] },
        count: 3,
      });
    });

    it("keeps PostHog's own identity ids", () => {
      expect(scrubProperties({ distinct_id: ID, $session_id: ID, $device_id: ID })).toEqual({
        distinct_id: ID,
        $session_id: ID,
        $device_id: ID,
      });
    });
  });

  describe('scrubPostHogEvent', () => {
    it('scrubs properties, $set and $set_once', () => {
      const event = {
        ...eventWith('$pageview', { $current_url: 'https://app.test/?q=x' }),
        $set: { email: 'jane@example.com' },
        $set_once: { $initial_referrer: 'https://ref.test/?utm=1' },
      };

      expect(scrubPostHogEvent(event)).toEqual({
        ...event,
        properties: { $current_url: 'https://app.test/' },
        $set: { email: ':email' },
        $set_once: { $initial_referrer: 'https://ref.test/' },
      });
    });

    it('passes a dropped event and replay snapshots through untouched', () => {
      expect(scrubPostHogEvent(null)).toBeNull();
      const snapshot = eventWith('$snapshot', { $snapshot_data: [{ href: 'https://app.test/?q=x' }] });
      expect(scrubPostHogEvent(snapshot)).toBe(snapshot);
    });
  });
});
