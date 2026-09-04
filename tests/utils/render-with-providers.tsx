import type { ReactElement, ReactNode } from 'react';

import { ToastViewport } from '@astryxdesign/core/Toast';
import { Theme } from '@astryxdesign/core/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';

import { neutralTheme } from '@/instance/astryx/theme';

export interface MockSessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
}

export interface MockSession {
  user: MockSessionUser;
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  };
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export interface ProvidersOptions {
  queryClient?: QueryClient;
}

const createWrapper = (options: ProvidersOptions = {}) => {
  const queryClient = options.queryClient ?? createTestQueryClient();

  /**
   * Mirrors the provider stack in the root layout. Astryx components read
   * their tokens from `Theme`, and anything calling `useToast` needs a
   * viewport to render into, so a test that skips these renders an unthemed
   * tree and silently diverges from the app.
   */
  const Wrapper = ({ children }: { children: ReactNode }) => {
    return (
      <Theme theme={neutralTheme} mode="light">
        <ToastViewport>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </ToastViewport>
      </Theme>
    );
  };

  return Wrapper;
};

export const renderWithProviders = (
  ui: ReactElement,
  options: ProvidersOptions & Omit<RenderOptions, 'wrapper'> = {},
): RenderResult & { queryClient: QueryClient } => {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const result = render(ui, {
    wrapper: createWrapper({ queryClient }),
    ...renderOptions,
  });

  return {
    ...result,
    queryClient,
  };
};

export { createTestQueryClient };
