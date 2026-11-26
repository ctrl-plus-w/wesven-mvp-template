/**
 * Get error message from unknown error
 * @param error The error to get the message from
 * @param fallback The fallback message if the error is not an instance of Error
 */
export const getErrorMessage = (error: unknown, fallback = 'An unexpected error occured'): string => {
  if (error instanceof Error) return error.message;
  return fallback;
};

/**
 * Check if the given color is hexadecimal
 * @param color The color to check
 */
export const isHex = (color: string) => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

/**
 * Get file extension from filename
 * @param filename The name of the file
 */
export const getExt = (filename: string) => {
  return filename.substring(filename.lastIndexOf('.') + 1, filename.length) || filename;
};

/**
 * Append query parameters to a URL
 * @param url The base URL
 * @param params The query parameters to append
 */
export const withQueryParams = (url: string, params: URLSearchParams) => {
  const separator = url.includes('?') ? '&' : '?';
  if (!params.size) return url;
  return `${url}${separator}${params.toString()}`;
};

/**
 * Format a number as currency in EUR
 * @param value The number to format
 */
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr', { currency: 'EUR', style: 'currency' }).format(value);
};

/**
 * Turn a bare host, such as Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, into an https URL
 * @param host The host without a protocol, or undefined when unset
 */
export const toHttpsUrl = (host: string | undefined) => {
  return host ? `https://${host}` : undefined;
};
