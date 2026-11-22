import type ERRORS from '@/constant/errors';

export type ServerErrorCode = keyof typeof ERRORS.SERVER;

export type ErrorParams = Record<string, string | number>;

export interface ServerActionErrorInit {
  code: ServerErrorCode;
  /** Defaults to the code's message in `ERRORS.SERVER`. */
  message?: string;
  params?: ErrorParams;
}

export interface ServerActionFailure {
  name: string;
  message: string;
  code: ServerErrorCode;
  params?: ErrorParams;
}

export type ServerActionResult<T> =
  | { success: true; action: string; value: T }
  | { success: false; action: string; error: ServerActionFailure };

/** Where an unexpected error happened: the action's name, or the route pattern (never the requested path). */
export type ServerErrorContext = Record<string, string>;

export type ServerErrorSink = (error: Error, context: ServerErrorContext) => void | Promise<void>;
