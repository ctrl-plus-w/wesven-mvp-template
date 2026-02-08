import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createServerAction, getTypedSearchParam, ServerActionError, unwrapServerAction } from '@/util/server';

describe('Server Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createServerAction', () => {
    it('wraps success in { success: true, value }', async () => {
      const action = createServerAction(async () => 'hello');
      const result = await action();
      expect(result).toEqual({ success: true, value: 'hello' });
    });

    it('wraps ServerActionError in { success: false, error }', async () => {
      const action = createServerAction(async () => {
        throw new ServerActionError('Something went wrong');
      });
      const result = await action();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Something went wrong');
        expect(result.error.name).toBe('ServerActionError');
      }
    });

    it('re-throws non-ServerActionError errors', async () => {
      const action = createServerAction(async () => {
        throw new TypeError('type error');
      });
      await expect(action()).rejects.toThrow(TypeError);
    });

    it('passes arguments to callback', async () => {
      const action = createServerAction(async (a: number, b: number) => a + b);
      const result = await action(3, 4);
      expect(result).toEqual({ success: true, value: 7 });
    });
  });

  describe('unwrapServerAction', () => {
    it('returns value on success', async () => {
      const result = await unwrapServerAction({ success: true, value: 42 });
      expect(result).toBe(42);
    });

    it('throws on error', async () => {
      await expect(
        unwrapServerAction({
          success: false,
          error: { name: 'ServerActionError', message: 'fail', stack: undefined },
        }),
      ).rejects.toThrow('fail');
    });

    it('handles Promise input', async () => {
      const promise = Promise.resolve({ success: true as const, value: 'async' });
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
