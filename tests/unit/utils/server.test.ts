import { APIError } from 'better-auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { z } from '@/instance/zod';

import { registerServerErrorSink } from '@/util/error-reporting';
import {
  createServerAction,
  getTypedSearchParam,
  NotFoundServerActionError,
  ServerActionError,
  unwrapServerAction,
} from '@/util/server';

import ERRORS from '@/constant/errors';

describe('Server Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createServerAction', () => {
    it('wraps success in { success: true, action, value }', async () => {
      const action = createServerAction('greet', async () => 'hello');
      const result = await action();
      expect(result).toEqual({ success: true, action: 'greet', value: 'hello' });
    });

    it('passes arguments to callback', async () => {
      const action = createServerAction('add', async (a: number, b: number) => a + b);
      const result = await action(3, 4);
      expect(result).toEqual({ success: true, action: 'add', value: 7 });
    });

    it('keeps the code, message and params of a ServerActionError', async () => {
      const action = createServerAction('fail', async () => {
        throw new ServerActionError({ code: 'duplicate', message: 'Already there', params: { field: 'email' } });
      });
      const result = await action();
      expect(result).toEqual({
        success: false,
        action: 'fail',
        error: { name: 'ServerActionError', message: 'Already there', code: 'duplicate', params: { field: 'email' } },
      });
    });

    it('falls back to the code message for subclasses', async () => {
      const action = createServerAction('find', async () => {
        throw new NotFoundServerActionError();
      });
      const result = await action();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatchObject({ name: 'NotFoundServerActionError', code: 'not-found' });
        expect(result.error.message).toBe(ERRORS.SERVER['not-found']);
      }
    });

    it('maps a Better Auth APIError to an auth failure with its French message', async () => {
      const action = createServerAction('login', async () => {
        throw new APIError('UNAUTHORIZED', { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' });
      });
      const result = await action();
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error).toEqual({
          name: 'AuthError',
          code: 'auth',
          message: ERRORS.AUTH.INVALID_EMAIL_OR_PASSWORD,
          params: { reason: 'INVALID_EMAIL_OR_PASSWORD' },
        });
    });

    it('names the invalid field of a ZodError instead of throwing', async () => {
      const action = createServerAction('parse', async () => z.object({ email: z.email() }).parse({ email: 'nope' }));
      const result = await action();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('invalid-data');
        expect(result.error.params?.field).toBe('email');
        expect(result.error.message).toContain('« email »');
      }
    });

    it.each([
      ['23505', 'Key (email)=(a@b.c) already exists.', 'duplicate'],
      ['23503', 'Key (id)=(x) is still referenced from table "post".', 'in-use'],
      ['23503', 'Key (user_id)=(x) is not present in table "user".', 'not-found'],
      ['22001', undefined, 'too-long'],
      ['22P02', undefined, 'invalid-data'],
    ])('maps Postgres %s to %s', async (code, detail, expected) => {
      const driverError = Object.assign(new Error('pg'), { code, detail });
      const action = createServerAction('write', async () => {
        throw new Error('Failed query', { cause: driverError });
      });
      const result = await action();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe(expected);
    });

    it('names the column of a unique violation, never the value', async () => {
      const driverError = Object.assign(new Error('pg'), {
        code: '23505',
        detail: 'Key (email)=(secret@example.com) already exists.',
      });
      const action = createServerAction('write', async () => {
        throw driverError;
      });
      const result = await action();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.params).toEqual({ field: 'email' });
        expect(JSON.stringify(result.error)).not.toContain('secret@example.com');
      }
    });

    it('hides unexpected errors behind a generic message and reports them', async () => {
      const sink = vi.fn();
      registerServerErrorSink(sink);
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const boom = new TypeError('cannot read properties of undefined (secret internals)');
      const action = createServerAction('explode', async () => {
        throw boom;
      });
      const result = await action();

      expect(result).toEqual({
        success: false,
        action: 'explode',
        error: { name: 'ServerActionError', message: ERRORS.SERVER.unexpected, code: 'unexpected', params: undefined },
      });
      expect(sink).toHaveBeenCalledWith(boom, { action: 'explode' });
      registerServerErrorSink(undefined);
    });

    it('still resolves when the error sink throws', async () => {
      registerServerErrorSink(() => {
        throw new Error('sink down');
      });
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const action = createServerAction('explode', async () => {
        throw new Error('boom');
      });
      await expect(action()).resolves.toMatchObject({ success: false, error: { code: 'unexpected' } });
      registerServerErrorSink(undefined);
    });

    it.each([
      'NEXT_REDIRECT;replace;/login;307;',
      'NEXT_HTTP_ERROR_FALLBACK;404',
      'NEXT_NOT_FOUND',
    ])('lets Next control flow (%s) propagate', async (digest) => {
      const control = Object.assign(new Error(digest), { digest });
      const action = createServerAction('navigate', async () => {
        throw control;
      });
      await expect(action()).rejects.toBe(control);
    });
  });

  describe('unwrapServerAction', () => {
    it('returns value on success', async () => {
      const result = await unwrapServerAction({ success: true, action: 'get', value: 42 });
      expect(result).toBe(42);
    });

    it('throws a ServerActionError carrying the failure', async () => {
      const promise = unwrapServerAction({
        success: false,
        action: 'get',
        error: { name: 'NotFoundServerActionError', message: 'fail', code: 'not-found', params: { id: 1 } },
      });
      await expect(promise).rejects.toThrow('fail');
      await expect(promise).rejects.toBeInstanceOf(ServerActionError);
      await expect(promise).rejects.toMatchObject({
        name: 'NotFoundServerActionError',
        code: 'not-found',
        params: { id: 1 },
      });
    });

    it('handles Promise input', async () => {
      const promise = Promise.resolve({ success: true as const, action: 'get', value: 'async' });
      const result = await unwrapServerAction(promise);
      expect(result).toBe('async');
    });
  });

  describe('getTypedSearchParam', () => {
    const values = ['draft', 'pending', 'accepted'] as const;

    it('returns matching param', () => {
      expect(getTypedSearchParam('pending', values)).toBe('pending');
    });

    it('returns undefined for no match', () => {
      expect(getTypedSearchParam('unknown', values)).toBeUndefined();
    });

    it('handles array input', () => {
      expect(getTypedSearchParam(['unknown', 'accepted'], values)).toBe('accepted');
    });

    it('handles undefined input', () => {
      expect(getTypedSearchParam(undefined, values)).toBeUndefined();
    });
  });
});
