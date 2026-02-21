import { APIError } from 'better-auth';

import { isDefined, toArray } from '@/util/array.client';

import ERRORS from '@/constant/errors';

export type ServerActionResult<T> =
  | { success: true; value: T }
  | { success: false; error: { name: string; message: string; stack: string | undefined } };

export class ServerActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServerActionError';
  }

  static isError(err: unknown): err is ServerActionError {
    return err instanceof Error && err.name === ServerActionError.name;
  }
}

export class InvalidDataServerActionError extends ServerActionError {
  constructor(message = 'Les données sont invalides.') {
    super(message);
    this.name = 'InvalidDataServerActionError';
  }

  static isError(err: unknown): err is InvalidDataServerActionError {
    return err instanceof Error && err.name === InvalidDataServerActionError.name;
  }
}

export class NotFoundServerActionError extends ServerActionError {
  constructor(message = 'Ressource non trouvée.') {
    super(message);
    this.name = 'NotFoundServerActionError';
  }

  static isError(err: unknown): err is NotFoundServerActionError {
    return err instanceof Error && err.name === NotFoundServerActionError.name;
  }
}

export class UnauthorizedServerActionError extends ServerActionError {
  constructor(message = "Vous n'avez pas la permission d'effectuer cette action.") {
    super(message);
    this.name = 'UnauthorizedServerActionError';
  }

  static isError(err: unknown): err is UnauthorizedServerActionError {
    return err instanceof Error && err.name === UnauthorizedServerActionError.name;
  }
}

/**
 * Create a server action that handles errors and returns a standardized result
 * @param callback The callback function that performs the server action
 * @returns A function that takes the same arguments as the callback and returns a Promise of ServerActionResult
 *
 * @example
 * "use server";
 *
 * export const getUsers = createServerAction(async () => {
 *  const users = await getUsersFromDatabase();
 *  if(users.length < 1) throw new ServerActionError("Users not found!");
 *
 *  return users;
 * });
 */
export const createServerAction = <Return, Args extends unknown[] = []>(
  callback: (...args: Args) => Promise<Return>,
): ((...args: Args) => Promise<ServerActionResult<Return>>) => {
  return async (...args: Args) => {
    try {
      const value = await callback(...args);
      return { success: true, value };
    } catch (error) {
      if (error instanceof ServerActionError)
        return {
          success: false,
          error: {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
          },
        };
      console.error(error);
      if (error instanceof APIError)
        return {
          success: false,
          error: {
            name: 'Error',
            message:
              error.body?.code && error.body.code in ERRORS.AUTH
                ? ERRORS.AUTH[error.body.code as keyof typeof ERRORS.AUTH]
                : error.message || 'An error occurred',
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
          },
        };
      throw error;
    }
  };
};

/**
 * Unwrap the result of a server action
 * @param serverAction The server action result to unwrap, can be a Promise or a direct result
 * @returns A Promise that resolves to the value of the server action if successful, or throws an error if not
 *
 * @example
 * const snackbar = useSnackbar();
 *
 * const { data, isPending } = useQuery({
 *  mutationFn: () => unwrapServerAction(getUsers()),
 *  onError: (error) => snackbar.error(error.message),
 *  queryKey: ['users'],
 * });
 */
export const unwrapServerAction = async <T>(
  serverAction: ServerActionResult<T> | Promise<ServerActionResult<T>>,
): Promise<T> => {
  const result = await serverAction;

  if (result.success) return result.value;
  const error = new ServerActionError(result.error.message);
  error.name = result.error.name;
  error.stack = result.error.stack;
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
