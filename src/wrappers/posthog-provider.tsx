'use client';

import { type PropsWithChildren, useEffect } from 'react';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

import ENV_PUBLIC from '@/env.public';

const PostHogProvider = ({ children }: PropsWithChildren) => {
  useEffect(() => {
    posthog.init(ENV_PUBLIC.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: ENV_PUBLIC.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: 'always',
      defaults: '2025-05-24',
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
};

export default PostHogProvider;
