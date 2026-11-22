import { APIError } from 'better-auth';

import { z } from '@/instance/zod';

import { isDefined, toArray } from '@/util/array.client';
import { reportServerError } from '@/util/error-reporting';

import ERRORS from '@/constant/errors';

import type {
  ErrorParams,
  ServerActionErrorInit,
  ServerActionFailure,
  ServerActionResult,
  ServerErrorCode,
} from '@/type/server';

export type { ServerActionResult } from '@/type/server';

/** An expected refusal: its code and message reach the client as they are. */
export class ServerActionError extends Error {
  code: ServerErrorCode;
  params?: ErrorParams;

  constructor(init: ServerActionErrorInit) {
    super(init.message ?? ERRORS.SERVER[init.code]);
    this.name = 'ServerActionError';
    this.code = init.code;
    this.params = init.params;
  }

  static isError(err: unknown): err is ServerActionError {
    return err instanceof Error && err.name === ServerActionError.name;
  }
}

export class InvalidDataServerActionError extends ServerActionError {
  constructor(message?: string) {
    super({ code: 'invalid-data', message });
    this.name = 'InvalidDataServerActionError';
  }

  static isError(err: unknown): err is InvalidDataServerActionError {
    return err instanceof Error && err.name === InvalidDataServerActionError.name;
  }
}

export class NotFoundServerActionError extends ServerActionError {
  constructor(message?: string) {
    super({ code: 'not-found', message });
    this.name = 'NotFoundServerActionError';
  }

  static isError(err: unknown): err is NotFoundServerActionError {
    return err instanceof Error && err.name === NotFoundServerActionError.name;
  }
}

export class UnauthorizedServerActionError extends ServerActionError {
  constructor(message?: string) {
    super({ code: 'unauthorized', message });
    this.name = 'UnauthorizedServerActionError';
  }

  static isError(err: unknown): err is UnauthorizedServerActionError {
    return err instanceof Error && err.name === UnauthorizedServerActionError.name;
  }
}

/**
 * `redirect()` and `notFound()` throw an error carrying a `digest`: it is navigation, not a failure, and must
 * propagate. Matched by digest rather than `unstable_rethrow` because this module is bundled for the browser too.
 */
const isNextControlFlow = (error: unknown): boolean =>
  error instanceof Error &&
  'digest' in error &&
  typeof error.digest === 'string' &&
  (error.digest.startsWith('NEXT_REDIRECT') ||
    error.digest.startsWith('NEXT_HTTP_ERROR_FALLBACK') ||
    error.digest === 'NEXT_NOT_FOUND');

interface PostgresErrorLike extends Error {
  code: string;
  detail?: string;
}

const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;

const isPostgresError = (value: unknown): value is PostgresErrorLike =>
  value instanceof Error && 'code' in value && typeof value.code === 'string' && SQLSTATE_PATTERN.test(value.code);

/** The driver error, raw or wrapped by Drizzle in a `DrizzleQueryError` whose `cause` it is. */
const findPostgresError = (error: unknown): PostgresErrorLike | undefined => {
  if (isPostgresError(error)) return error;
  if (error instanceof Error && isPostgresError(error.cause)) return error.cause;
  return undefined;
};

/** The column(s) a unique violation names (`Key (email)=(…) already exists.`), never the value. */
const duplicateOf = (error: PostgresErrorLike): ServerActionErrorInit => {
  const field = error.detail?.match(/^Key \(([^)]+)\)=/)?.[1] ?? 'value';
  return { code: 'duplicate', message: `« ${field} » est déjà utilisé.`, params: { field } };
};

/** A constraint the database enforced, as a coded refusal; `undefined` for an error it does not know. */
const mapPostgresError = (error: PostgresErrorLike): ServerActionErrorInit | undefined => {
  switch (error.code) {
    case '23505':
      return duplicateOf(error);
    case '23503':
      return error.detail?.includes('is not present') ? { code: 'not-found' } : { code: 'in-use' };
    case '22001':
      return { code: 'too-long' };
    case '22P02':
      return { code: 'invalid-data' };
    default:
      return undefined;
  }
};

const failureOf = (name: string, init: ServerActionErrorInit): ServerActionFailure => ({
  name,
  message: init.message ?? ERRORS.SERVER[init.code],
  code: init.code,
  params: init.params,
});

const isKnownAuthCode = (code: unknown): code is keyof typeof ERRORS.AUTH =>
  typeof code === 'string' && code in ERRORS.AUTH;

/** What a throw becomes on the wire; `unexpected` carries the thrown error when no branch knew it. */
const toFailure = (action: string, error: unknown): { failure: ServerActionFailure; unexpected?: Error } => {
  if (error instanceof ServerActionError) {
    if (!(error instanceof UnauthorizedServerActionError))
      console.warn(`[action:${action}] ${error.name} (${error.code}): ${error.message}`);
    return { failure: failureOf(error.name, error) };
  }

  if (error instanceof APIError) {
    const code = error.body?.code;
    console.warn(`[action:${action}] AuthError (${error.status}): ${code ?? error.message}`);
    const message = isKnownAuthCode(code) ? ERRORS.AUTH[code] : ERRORS.SERVER.auth;
    return { failure: failureOf('AuthError', { code: 'auth', message, params: code ? { reason: code } : undefined }) };
  }

  if (error instanceof z.ZodError) {
    const issue = error.issues.find(({ path }) => path.length > 0);
    console.warn(`[action:${action}] InvalidData: ${error.issues.map(({ message }) => message).join('; ')}`);
    if (!issue) return { failure: failureOf('InvalidDataServerActionError', { code: 'invalid-data' }) };

    const field = issue.path.map(String).join('.');
    return {
      failure: failureOf('InvalidDataServerActionError', {
        code: 'invalid-data',
        message: `Valeur invalide pour « ${field} » : ${issue.message}`,
        params: { field, reason: issue.message },
      }),
    };
  }

  const postgresError = findPostgresError(error);
  const refusal = postgresError && mapPostgresError(postgresError);
  if (postgresError && refusal) {
    console.warn(`[action:${action}] Postgres ${postgresError.code} → ${refusal.code}`);
    return { failure: failureOf('ServerActionError', refusal) };
  }

  const unexpected = error instanceof Error ? error : new Error(String(error));
  console.error(`[action:${action}]`, unexpected);
  return { failure: failureOf('ServerActionError', { code: 'unexpected' }), unexpected };
};

/**
 * Create a server action that never throws to the client: every outcome is a `ServerActionResult`.
 * Expected refusals (`ServerActionError`, Better Auth, zod, database constraints) keep their code and message;
 * anything else is logged and reported with its stack, and reaches the client only as `unexpected`.
 * `redirect()` and `notFound()` still propagate.
 * @param name The action's name, used in logs and error reports
 * @param callback The function that performs the server action
 * @returns A function taking the same arguments as the callback and resolving to a ServerActionResult
 *
 * @example
 * "use server";
 *
 * export const getUsers = createServerAction('getUsers', async () => {
 *  const users = await getUsersFromDatabase();
 *  if (users.length < 1) throw new NotFoundServerActionError();
 *
 *  return users;
 * });
 */
export const createServerAction = <Return, Args extends unknown[] = []>(
  name: string,
  callback: (...args: Args) => Promise<Return>,
): ((...args: Args) => Promise<ServerActionResult<Return>>) => {
  return async (...args: Args) => {
    try {
      const value = await callback(...args);
      return { success: true, action: name, value };
    } catch (error) {
      if (isNextControlFlow(error)) throw error;

      const { failure, unexpected } = toFailure(name, error);
      if (unexpected) await reportServerError(unexpected, { action: name });

      return { success: false, action: name, error: failure };
    }
  };
};

/**
 * Unwrap the result of a server action
 * @param serverAction The server action result to unwrap, can be a Promise or a direct result
 * @returns A Promise that resolves to the value of the server action if successful, or throws a ServerActionError
 * carrying the failure's name, code and params if not
 *
 * @example
 * const showToast = useToast();
 *
 * const { data, isPending } = useQuery({
 *  queryFn: () => unwrapServerAction(getUsers()),
 *  queryKey: ['users'],
 * });
 */
export const unwrapServerAction = async <T>(
  serverAction: ServerActionResult<T> | Promise<ServerActionResult<T>>,
): Promise<T> => {
  const result = await serverAction;

  if (result.success) return result.value;

  const { name, message, code, params } = result.error;
  const error = new ServerActionError({ code, message, params });
  error.name = name;
  throw error;
};

export type WrappedImage = FormData & { readonly __brand: 'WrappedImage' };

/**
 * Wrap an image file in a FormData object (in order to be passed in a server action)
 * @param image The image file to wrap
 * @returns A FormData object containing the image file
 */
export const wrapImage = (image: File): WrappedImage => {
  const formData = new FormData();
  formData.set('image', image);
  return formData as WrappedImage;
};

/**
 * Unwrap a WrappedImage object to get the original File
 * @param image The WrappedImage object to unwrap
 * @returns The original File object
 */
export const unwrapImage = (image: WrappedImage): File => {
  const file = image.get('image');
  if (!file) throw new Error('Failed to unwrap the image (key not found)');
  if (!(file instanceof File)) throw new Error('Failed to unwrap the image (value is not a File)');

  return file;
};

/**
 * Get a typed search param from the given param values
 * @param paramValues The search params value(s)
 * @param values The allowed values to check the search param against
 */
export const getTypedSearchParam = <T extends readonly string[]>(
  paramValues: string | string[] | undefined,
  values: T,
): ArrayElement<T> | undefined => {
  return toArray(paramValues)
    .filter(isDefined)
    .find((v): v is ArrayElement<T> => values.includes(v));
};
