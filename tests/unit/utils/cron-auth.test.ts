import { describe, expect, it } from 'vitest';

import { verifyCronAuth } from '@/util/cron-auth.server';

const SECRET = 'a-long-enough-cron-secret';

const requestWith = (headers: Record<string, string>) => new Request('https://app.test/api/cron/job', { headers });

describe('verifyCronAuth', () => {
  it('accepts the secret as a bearer token', () => {
    expect(verifyCronAuth(requestWith({ authorization: `Bearer ${SECRET}` }), SECRET)).toBe(true);
  });

  it('accepts the secret in x-cron-secret', () => {
    expect(verifyCronAuth(requestWith({ 'x-cron-secret': SECRET }), SECRET)).toBe(true);
  });

  it('refuses a wrong secret', () => {
    expect(verifyCronAuth(requestWith({ authorization: 'Bearer wrong' }), SECRET)).toBe(false);
    expect(verifyCronAuth(requestWith({ 'x-cron-secret': `${SECRET}x` }), SECRET)).toBe(false);
  });

  it('refuses a request without credentials', () => {
    expect(verifyCronAuth(requestWith({}), SECRET)).toBe(false);
  });

  it('refuses an authorization header that is not a bearer token', () => {
    expect(verifyCronAuth(requestWith({ authorization: SECRET }), SECRET)).toBe(false);
  });

  it('fails closed when no secret is configured', () => {
    expect(verifyCronAuth(requestWith({ authorization: 'Bearer ' }), undefined)).toBe(false);
    expect(verifyCronAuth(requestWith({ 'x-cron-secret': '' }), '')).toBe(false);
  });
});
