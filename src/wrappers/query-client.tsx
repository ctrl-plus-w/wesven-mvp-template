'use client';

import type { PropsWithChildren } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { getQueryClient } from '@/instance/query-client';

const QueryClientWrapper = ({ children }: PropsWithChildren) => {
  const queryClient = getQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export default QueryClientWrapper;
