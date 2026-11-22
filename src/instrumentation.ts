import type { Instrumentation } from 'next';

import { registerServerErrorSink, reportServerError } from '@/util/error-reporting';

// The runtime check must wrap the import: the edge build drops the branch only when it is a constant condition.
export const register = async () => {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    // Error reporting must never keep the server from starting.
    try {
      const { captureServerException } = await import('@/instance/posthog-server');
      registerServerErrorSink(captureServerException);
    } catch (error) {
      console.warn('[error-reporting] PostHog server client not started:', error);
    }
  }
};

/** Errors thrown while rendering a page or running a route handler; server actions report their own. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // The route pattern, not `request.path`: the requested path carries ids, tokens and the query string.
    console.error(`[request-error] ${request.method} ${context.routeType} ${context.routePath}`);

    const reported = error instanceof Error ? error : new Error(String(error));
    await reportServerError(reported, {
      method: request.method,
      routeType: context.routeType,
      routePath: context.routePath,
    });
  }
};
