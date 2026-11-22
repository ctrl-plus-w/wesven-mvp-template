import type { ServerErrorContext, ServerErrorSink } from '@/type/server';

declare global {
  // A global, not a module variable: `instrumentation.ts` is bundled apart from the app, so each bundle has its own
  // copy of this module but they share one `globalThis`.
  var serverErrorSink: ServerErrorSink | undefined;
}

/**
 * Register where unexpected server errors go. Called once at server start (`instrumentation.ts`): `@/util/server` is
 * bundled for the browser too, so it cannot import the PostHog server client itself.
 * @param sink The function receiving each unexpected error, or `undefined` to stop reporting
 */
export const registerServerErrorSink = (sink: ServerErrorSink | undefined) => {
  globalThis.serverErrorSink = sink;
};

/**
 * Report an error no handler expected. Reporting never fails the operation it describes.
 * @param error The unexpected error
 * @param context Where it happened
 */
export const reportServerError = async (error: Error, context: ServerErrorContext) => {
  try {
    await globalThis.serverErrorSink?.(error, context);
  } catch (reportError) {
    console.warn('[error-reporting] error not reported:', reportError);
  }
};
