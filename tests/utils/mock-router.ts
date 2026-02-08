import { vi } from 'vitest';

export interface MockRouter {
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  prefetch: ReturnType<typeof vi.fn>;
  back: ReturnType<typeof vi.fn>;
  forward: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
}

export const createMockRouter = (overrides: Partial<MockRouter> = {}): MockRouter => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  ...overrides,
});

export interface MockNavigationOptions {
  pathname?: string;
  searchParams?: Record<string, string>;
  params?: Record<string, string>;
}

export const createMockNavigation = (options: MockNavigationOptions = {}) => {
  const { pathname = '/', searchParams = {}, params = {} } = options;

  return {
    useRouter: () => createMockRouter(),
    usePathname: () => pathname,
    useSearchParams: () => new URLSearchParams(searchParams),
    useParams: () => params,
    redirect: vi.fn(),
    notFound: vi.fn(),
  };
};

export const setupRouterMock = (options: MockNavigationOptions = {}) => {
  const navigation = createMockNavigation(options);

  vi.mock('next/navigation', () => navigation);

  return navigation;
};
