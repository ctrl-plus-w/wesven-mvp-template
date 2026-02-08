import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatCurrency, getExt, isHex, withQueryParams } from '@/util/string';

describe('String Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isHex', () => {
    it('validates 6-digit hex color', () => {
      expect(isHex('#FF00AA')).toBe(true);
      expect(isHex('#ff00aa')).toBe(true);
    });

    it('validates 3-digit hex color', () => {
      expect(isHex('#F0A')).toBe(true);
    });

    it('rejects invalid hex strings', () => {
      expect(isHex('FF00AA')).toBe(false);
      expect(isHex('#GG00AA')).toBe(false);
      expect(isHex('#FF00A')).toBe(false);
      expect(isHex('')).toBe(false);
    });
  });

  describe('getExt', () => {
    it('extracts file extension', () => {
      expect(getExt('photo.jpg')).toBe('jpg');
      expect(getExt('document.pdf')).toBe('pdf');
    });

    it('handles multiple dots', () => {
      expect(getExt('archive.tar.gz')).toBe('gz');
    });

    it('returns filename when no extension', () => {
      expect(getExt('Makefile')).toBe('Makefile');
    });
  });

  describe('withQueryParams', () => {
    it('appends params with ? separator', () => {
      const params = new URLSearchParams({ page: '1' });
      expect(withQueryParams('https://example.com', params)).toBe('https://example.com?page=1');
    });

    it('appends params with & separator when URL already has query', () => {
      const params = new URLSearchParams({ page: '1' });
      expect(withQueryParams('https://example.com?foo=bar', params)).toBe('https://example.com?foo=bar&page=1');
    });

    it('returns URL unchanged when params are empty', () => {
      const params = new URLSearchParams();
      expect(withQueryParams('https://example.com', params)).toBe('https://example.com');
    });
  });

  describe('formatCurrency', () => {
    it('formats numbers as EUR', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('€');
    });
  });
});
