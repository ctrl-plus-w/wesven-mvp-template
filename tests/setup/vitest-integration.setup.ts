import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { server } from '@/mock/node';
import { resetTables, setupTestDatabase, teardownTestDatabase } from '@/test-util/db';

beforeAll(async () => {
  server.listen({ onUnhandledRequest: 'warn' });
  await setupTestDatabase();
});

afterAll(async () => {
  server.close();
  await teardownTestDatabase();
});

beforeEach(() => {
  server.resetHandlers();

  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await resetTables();
  vi.clearAllMocks();
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
    has: vi.fn(() => false),
  }),
  headers: () => new Headers(),
}));
