import { isServer, QueryClient } from '@tanstack/react-query';

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: false,
        staleTime: 60 * 1000,
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

export const getQueryClient = () => {
  if (isServer) return makeQueryClient();
  // Reuse the browser client across renders so React suspending during initial render doesn't recreate it.
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
};
