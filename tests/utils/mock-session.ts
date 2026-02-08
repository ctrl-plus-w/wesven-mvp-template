import { vi } from 'vitest';

import type { MockSession, MockSessionUser } from './render-with-providers';

export const createMockUser = (overrides: Partial<MockSessionUser> = {}): MockSessionUser => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  image: null,
  ...overrides,
});

export const createMockSession = (overrides: Partial<MockSession> = {}): MockSession => {
  const user = createMockUser(overrides.user);

  return {
    user,
    session: {
      id: 'test-session-id',
      userId: user.id,
      token: 'test-session-token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides.session,
    },
  };
};

export const mockUseSession = (session: MockSession | null = null) => {
  return {
    data: session,
    isPending: false,
    error: null,
  };
};

export const createAuthMock = (session: MockSession | null = null) => ({
  useSession: vi.fn(() => mockUseSession(session)),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
});

export const setupAuthMock = (session: MockSession | null = null) => {
  const authMock = createAuthMock(session);

  vi.mock('@/instance/auth/client', () => ({
    default: authMock,
  }));

  return authMock;
};
