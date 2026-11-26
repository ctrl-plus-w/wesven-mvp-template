import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  findMissingProductionKeys,
  getRequiredKeys,
  getSchemaKeys,
  isOptionalKey,
  isSecretKey,
  planMissingKeys,
  productionKeysOf,
  validateValue,
} from '@/scripts/deploy/env-plan';

const files = vi.hoisted(() => new Map<string, string>());

vi.mock('node:fs', () => ({
  existsSync: (path: string) => files.has(path),
  readFileSync: (path: string) => files.get(path) ?? '',
}));

describe('Deploy env plan', () => {
  beforeEach(() => {
    files.clear();
    // CI and a developer's shell both export some of these: each test starts from none.
    for (const key of getSchemaKeys()) vi.stubEnv(key, '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getRequiredKeys', () => {
    it('lists the keys the app cannot start without', () => {
      expect(getRequiredKeys()).toEqual(
        expect.arrayContaining([
          'DATABASE_URL',
          'BETTER_AUTH_SECRET',
          'RESEND_FROM_EMAIL',
          'RESEND_API_KEY',
          'NEXT_PUBLIC_POSTHOG_KEY',
          'NEXT_PUBLIC_POSTHOG_HOST',
        ]),
      );
    });

    it('leaves out the keys Vercel derives and the optional ones', () => {
      const keys = getRequiredKeys();
      for (const key of ['BETTER_AUTH_URL', 'NEXT_PUBLIC_APP_URL', 'NODE_ENV', 'CRON_SECRET'])
        expect(keys).not.toContain(key);
    });
  });

  describe('findMissingProductionKeys', () => {
    it('names the required and build keys production lacks', () => {
      expect(findMissingProductionKeys(['DATABASE_URL'])).toEqual(
        expect.arrayContaining(['BETTER_AUTH_SECRET', 'ENABLE_EXPERIMENTAL_COREPACK']),
      );
      expect(findMissingProductionKeys(['DATABASE_URL'])).not.toContain('DATABASE_URL');
    });

    it('returns nothing once every key is set', () => {
      expect(findMissingProductionKeys([...getRequiredKeys(), 'ENABLE_EXPERIMENTAL_COREPACK'])).toEqual([]);
    });
  });

  describe('validateValue', () => {
    it('returns the schema message for an invalid value', () => {
      expect(validateValue('BETTER_AUTH_SECRET', 'short')).toEqual(expect.any(String));
      expect(validateValue('NEXT_PUBLIC_POSTHOG_HOST', 'not a url')).toEqual(expect.any(String));
    });

    it('returns undefined for a valid value', () => {
      expect(validateValue('BETTER_AUTH_SECRET', 'x'.repeat(32))).toBeUndefined();
      expect(validateValue('NEXT_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com')).toBeUndefined();
    });
  });

  it('tells secret and optional keys apart', () => {
    expect(isSecretKey('RESEND_API_KEY')).toBe(true);
    expect(isSecretKey('RESEND_FROM_EMAIL')).toBe(false);
    expect(isOptionalKey('CRON_SECRET')).toBe(true);
    expect(isOptionalKey('RESEND_API_KEY')).toBe(false);
  });

  describe('planMissingKeys', () => {
    it('generates secrets, prefers the shell over .env and asks for the rest', () => {
      vi.stubEnv('RESEND_API_KEY', 're_from_shell');
      files.set('.env', 'RESEND_API_KEY=re_from_dotenv\nNEXT_PUBLIC_POSTHOG_KEY=phc_real\n');

      const plan = planMissingKeys([
        'DATABASE_URL',
        'BETTER_AUTH_SECRET',
        'RESEND_API_KEY',
        'NEXT_PUBLIC_POSTHOG_KEY',
        'RESEND_FROM_EMAIL',
      ]);

      expect(plan.generated).toEqual(['BETTER_AUTH_SECRET']);
      expect(plan.fromShell).toEqual({ RESEND_API_KEY: 're_from_shell' });
      expect(plan.fromDotenv).toEqual({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_real' });
      expect(plan.toAsk).toEqual(['RESEND_FROM_EMAIL']);
    });

    it('never copies the .env.example placeholder, a local address or an empty value', () => {
      files.set('.env.example', 'RESEND_FROM_EMAIL=Me <me@example.com>\n');
      files.set(
        '.env',
        [
          'RESEND_FROM_EMAIL=Me <me@example.com>',
          'RESEND_API_KEY=re_REPLACE_ME',
          'NEXT_PUBLIC_POSTHOG_HOST=http://localhost:8000',
          'NEXT_PUBLIC_POSTHOG_KEY=',
        ].join('\n'),
      );

      const keys = ['RESEND_FROM_EMAIL', 'RESEND_API_KEY', 'NEXT_PUBLIC_POSTHOG_HOST', 'NEXT_PUBLIC_POSTHOG_KEY'];
      const plan = planMissingKeys(keys);

      expect(plan.fromDotenv).toEqual({});
      expect(plan.toAsk).toEqual(keys);
    });

    it('asks for a value the schema rejects, from the shell or .env', () => {
      vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'not-a-url');
      files.set('.env', 'BETTER_AUTH_URL=not-a-url\n');

      const plan = planMissingKeys(['NEXT_PUBLIC_POSTHOG_HOST', 'BETTER_AUTH_URL']);

      expect(plan.fromShell).toEqual({});
      expect(plan.fromDotenv).toEqual({});
      expect(plan.toAsk).toEqual(['NEXT_PUBLIC_POSTHOG_HOST', 'BETTER_AUTH_URL']);
    });
  });

  it('keeps only the Production variables of a Vercel listing', () => {
    const keys = productionKeysOf({
      envs: [
        { key: 'DATABASE_URL', target: ['production', 'preview'], type: 'encrypted' },
        { key: 'PREVIEW_ONLY', target: ['preview'], type: 'plain' },
        { key: 'SINGLE', target: 'production', type: 'sensitive' },
        { key: 'NO_TARGET', type: 'plain' },
      ],
    });

    expect(keys).toEqual(['DATABASE_URL', 'SINGLE']);
  });
});
