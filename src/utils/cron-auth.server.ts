import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Check that a request comes from the scheduler. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; other
 * schedulers can send `x-cron-secret`. Compared on SHA-256 digests in constant time, so neither the timing nor the
 * length of the secret leaks. Fails closed: with no secret configured, every request is refused.
 * @param request The incoming cron request
 * @param secret The expected secret (`ENV.CRON_SECRET`)
 *
 * @example
 * export const GET = async (request: Request) => {
 *   if (!verifyCronAuth(request, ENV.CRON_SECRET)) return new Response('Unauthorized', { status: 401 });
 *   // ...
 * };
 */
export const verifyCronAuth = (request: Request, secret: string | undefined): boolean => {
  if (!secret) return false;

  const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  const provided = bearer ?? request.headers.get('x-cron-secret');
  if (!provided) return false;

  return timingSafeEqual(digest(provided), digest(secret));
};
