import { del, put } from '@vercel/blob';

import { toArray } from '@/util/array.client';
import { InvalidDataServerActionError } from '@/util/server';

/**
 * Uploads a file to the specified path in the blob storage
 * @param path The path where the file will be uploaded
 * @param file The file to be uploaded
 */
export const uploadFile = async (path: string, file: File) => {
  return put(path, file, { access: 'public', allowOverwrite: true });
};

/**
 * Deletes a file from the specified path in the blob storage
 * @param pathOrPaths The path or paths of the file(s) to be deleted
 */
export const deleteFile = async (pathOrPaths: string | string[]) => {
  return del(toArray(pathOrPaths));
};

/**
 * Calculates the size of a file in megabytes
 * @param file The file whose size is to be calculated
 */
export const getFileSizeInMb = (file: File) => {
  return file.size / 1024 / 1024;
};

/**
 * Validates if the file is an image and its size is within the specified limit
 * @param file The file to be validated
 * @param maxSize The maximum allowed size in Mb
 */
export const validateImage = (file: File, maxSize: number) => {
  if (!file.type.startsWith('image/') || getFileSizeInMb(file) > maxSize) throw new InvalidDataServerActionError();
  return file;
};
