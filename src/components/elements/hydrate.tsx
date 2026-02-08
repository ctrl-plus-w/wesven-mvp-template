'use server';

import type { PropsWithChildren } from 'react';

import { dehydrate, HydrationBoundary, type QueryClient, type QueryKey } from '@tanstack/react-query';

import { getQueryClient } from '@/instance/query-client';

import { toArray } from '@/util/array.client';

export type QueryClientFn = (queryClient: QueryClient) => Promise<void>;

export interface HydrateFnProps extends PropsWithChildren {
  fn: QueryClientFn | QueryClientFn[];
}

export interface HydrateValueProps extends PropsWithChildren {
  queryKey: QueryKey;
  value: any;
}

const Hydrate = async ({ children, ...props }: HydrateFnProps | HydrateValueProps) => {
  const queryClient = getQueryClient();

  if ('fn' in props) {
    const { fn } = props;
    await Promise.all(toArray(fn).map(async (fn) => fn(queryClient)));
  } else {
    const { queryKey, value } = props;
    queryClient.setQueryData(queryKey, value);
  }

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
};

export default Hydrate;
