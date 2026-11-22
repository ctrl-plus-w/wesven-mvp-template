import { createHash } from 'node:crypto';

import { addMinutes } from 'date-fns';
import { and, count, eq, gt, sql } from 'drizzle-orm';

import { verification } from '@/schema/auth';

import { db } from '@/instance/drizzle';

import { ServerActionError } from '@/util/server';

/**
 * A per-email counter kept in Better Auth's `verification` table. Better Auth's own rate limiter only runs on its
 * HTTP routes, which the auth server actions never go through, and keeps its counts in process memory; rows here
 * survive deploys and serverless instances.
 *
 * Keyed on the hashed, lowercased email, so the table never holds the address. Never on the IP: someone who knows an
 * address can lock it for one window, which is accepted.
 *
 * A slot is counted and taken under one advisory lock per key, so parallel calls queue instead of all reading a
 * count below the limit.
 */
const emailThrottle = ({ kind, limit, windowMinutes }: { kind: string; limit: number; windowMinutes: number }) => {
  const identifierOf = (email: string) =>
    `${kind}-${createHash('sha256').update(email.trim().toLowerCase()).digest('base64url').slice(0, 32)}`;

  return {
    claim: (email: string) => {
      const identifier = identifierOf(email);

      return db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${identifier}))`);

        const [{ taken }] = await tx
          .select({ taken: count() })
          .from(verification)
          .where(and(eq(verification.identifier, identifier), gt(verification.expiresAt, new Date())));
        if (taken >= limit) return undefined;

        const [slot] = await tx
          .insert(verification)
          .values({ identifier, value: '', expiresAt: addMinutes(new Date(), windowMinutes) })
          .returning({ id: verification.id });
        return slot;
      });
    },
    release: (id: string) => db.delete(verification).where(eq(verification.id, id)),
  };
};

export const SIGN_IN_FAILURE_LIMIT = 10;
export const RESET_MAIL_LIMIT = 3;

const failedSignIns = emailThrottle({ kind: 'sign-in-failure', limit: SIGN_IN_FAILURE_LIMIT, windowMinutes: 15 });
const resetMails = emailThrottle({ kind: 'reset-mail', limit: RESET_MAIL_LIMIT, windowMinutes: 60 });

/**
 * Run one sign-in for this email, refused before the password is checked once the email failed 10 times in the last
 * 15 minutes. The attempt holds a slot while it runs and keeps it only when it failed on a wrong password, so
 * successful sign-ins are never counted.
 * @param email The email signing in
 * @param options `signIn` performs the sign-in; `isWrongPassword` tells a wrong password from any other failure
 */
export const throttledSignIn = async <T>(
  email: string,
  { signIn, isWrongPassword }: { signIn: () => Promise<T>; isWrongPassword: (error: unknown) => boolean },
): Promise<T> => {
  const slot = await failedSignIns.claim(email);
  if (!slot) throw new ServerActionError({ code: 'auth.sign-in-locked' });

  try {
    const outcome = await signIn();
    await failedSignIns.release(slot.id);
    return outcome;
  } catch (error) {
    if (!isWrongPassword(error)) await failedSignIns.release(slot.id);
    throw error;
  }
};

/**
 * Refuse a 4th reset mail for an email within the hour, and count the one allowed.
 * @param email The email asking for a reset link
 */
export const assertResetMailAllowed = async (email: string) => {
  if (!(await resetMails.claim(email))) throw new ServerActionError({ code: 'auth.reset-mail-limit' });
};
