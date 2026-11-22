'use client';

import type { PropsWithChildren } from 'react';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

/** Exposes the PostHog client to `usePostHog()`; it is initialised in `instrumentation-client.ts`. */
const PostHogProvider = ({ children }: PropsWithChildren) => {
  return <PHProvider client={posthog}>{children}</PHProvider>;
};

export default PostHogProvider;
