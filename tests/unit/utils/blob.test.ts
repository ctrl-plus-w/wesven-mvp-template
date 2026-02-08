import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
}));

import { del, put } from '@vercel/blob';

import { deleteFile, getFileSizeInMb, uploadFile, validateImage } from '@/util/blob';
import { InvalidDataServerActionError } from '@/util/server';

const createFile = (name: string, sizeInBytes: number, type: string) => {
  return new File([new ArrayBuffer(sizeInBytes)], name, { type });
};

describe('Blob Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFileSizeInMb', () => {
    it('returns file size in megabytes', () => {
      const file = createFile('test.png', 1024 * 1024 * 2, 'image/png');
      expect(getFileSizeInMb(file)).toBe(2);
    });

    it('returns 0 for an empty file', () => {
      const file = createFile('empty.png', 0, 'image/png');
      expect(getFileSizeInMb(file)).toBe(0);
    });

    it('returns fractional megabytes', () => {
      const file = createFile('small.png', 512 * 1024, 'image/png');
      expect(getFileSizeInMb(file)).toBe(0.5);
    });
  });

  describe('validateImage', () => {
    it('returns the file when it is a valid image under the size limit', () => {
      const file = createFile('photo.jpg', 1024 * 1024, 'image/jpeg');
      expect(validateImage(file, 5)).toBe(file);
    });

    it('throws when the file is not an image', () => {
      const file = createFile('doc.pdf', 1024, 'application/pdf');
      expect(() => validateImage(file, 5)).toThrow(InvalidDataServerActionError);
    });

    it('throws when the image exceeds the max size', () => {
      const file = createFile('large.png', 1024 * 1024 * 10, 'image/png');
      expect(() => validateImage(file, 5)).toThrow(InvalidDataServerActionError);
    });

    it('throws when file is not an image and exceeds the max size', () => {
      const file = createFile('large.pdf', 1024 * 1024 * 10, 'application/pdf');
      expect(() => validateImage(file, 5)).toThrow(InvalidDataServerActionError);
    });
  });

  describe('uploadFile', () => {
    it('calls put with the correct arguments', async () => {
      const file = createFile('test.png', 1024, 'image/png');
      const mockResult = { url: 'https://blob.vercel-storage.com/test.png' };
      vi.mocked(put).mockResolvedValue(mockResult as never);

      const result = await uploadFile('uploads/test.png', file);

      expect(put).toHaveBeenCalledWith('uploads/test.png', file, { access: 'public', allowOverwrite: true });
      expect(result).toBe(mockResult);
    });
  });

  describe('deleteFile', () => {
    it('calls del with a single path wrapped in an array', async () => {
      await deleteFile('uploads/test.png');
      expect(del).toHaveBeenCalledWith(['uploads/test.png']);
    });

    it('calls del with an array of paths', async () => {
      const paths = ['uploads/a.png', 'uploads/b.png'];
      await deleteFile(paths);
      expect(del).toHaveBeenCalledWith(paths);
    });
  });
});
