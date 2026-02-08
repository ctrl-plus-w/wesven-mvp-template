import { beforeEach, describe, expect, it, vi } from 'vitest';

import { arrayToString, diffHelper, isDefined, searchArray, toArray, unique, uniqueById } from '@/util/array.client';

describe('Array Client Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('arrayToString', () => {
    it('returns single element as-is', () => {
      expect(arrayToString(['hello'])).toBe('hello');
    });

    it('joins multiple elements with comma and "and"', () => {
      expect(arrayToString(['a', 'b', 'c'])).toBe('a, b and c');
    });

    it('joins two elements with "and"', () => {
      expect(arrayToString(['a', 'b'])).toBe('a and b');
    });
  });

  describe('toArray', () => {
    it('wraps single value in array', () => {
      expect(toArray('hello')).toEqual(['hello']);
    });

    it('passes arrays through', () => {
      const arr = [1, 2, 3];
      expect(toArray(arr)).toBe(arr);
    });
  });

  describe('unique', () => {
    it('removes duplicates', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it('returns empty array for empty input', () => {
      expect(unique([])).toEqual([]);
    });
  });

  describe('uniqueById', () => {
    it('removes duplicates by id', () => {
      const items = [
        { id: '1', name: 'a' },
        { id: '2', name: 'b' },
        { id: '1', name: 'c' },
      ];
      const result = uniqueById(items);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('a');
    });
  });

  describe('isDefined', () => {
    it('returns true for defined values', () => {
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined(false)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isDefined(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isDefined(undefined)).toBe(false);
    });
  });

  describe('diffHelper', () => {
    const getAreIdsEqual = (a: { id: number }, b: { id: number }) => a.id === b.id;
    const areEquals = (a: { id: number; val: string }, b: { id: number; val: string }) => a.val === b.val;
    const diff = diffHelper(getAreIdsEqual, areEquals);

    it('identifies added items', () => {
      const result = diff(
        [{ id: 1, val: 'a' }],
        [
          { id: 1, val: 'a' },
          { id: 2, val: 'b' },
        ],
      );
      expect(result.added).toHaveLength(1);
      expect(result.added[0].id).toBe(2);
    });

    it('identifies removed items', () => {
      const result = diff(
        [
          { id: 1, val: 'a' },
          { id: 2, val: 'b' },
        ],
        [{ id: 1, val: 'a' }],
      );
      expect(result.removed).toHaveLength(1);
      expect(result.removed[0].id).toBe(2);
    });

    it('identifies updated items', () => {
      const result = diff([{ id: 1, val: 'a' }], [{ id: 1, val: 'b' }]);
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0].val).toBe('b');
    });

    it('identifies unchanged items', () => {
      const result = diff([{ id: 1, val: 'a' }], [{ id: 1, val: 'a' }]);
      expect(result.notUpdated).toHaveLength(1);
      expect(result.notUpdated[0].id).toBe(1);
    });
  });

  describe('searchArray', () => {
    const items = [
      { id: '1', name: 'Apple' },
      { id: '2', name: 'Banana' },
      { id: '3', name: 'Pineapple' },
      { id: '4', name: 'Orange' },
    ];

    it('filters by query', () => {
      const result = searchArray(items, 'apple', (item) => item.name);
      expect(result).toHaveLength(2);
    });

    it('is case insensitive', () => {
      const result = searchArray(items, 'APPLE', (item) => item.name);
      expect(result).toHaveLength(2);
    });

    it('sorts by match quality (shorter name = better match)', () => {
      const result = searchArray(items, 'apple', (item) => item.name);
      expect(result[0].name).toBe('Apple');
      expect(result[1].name).toBe('Pineapple');
    });

    it('respects limit', () => {
      const result = searchArray(items, 'a', (item) => item.name, 2);
      expect(result).toHaveLength(2);
    });

    it('returns full array when query is empty', () => {
      const result = searchArray(items, '', (item) => item.name);
      expect(result).toHaveLength(4);
    });
  });
});
