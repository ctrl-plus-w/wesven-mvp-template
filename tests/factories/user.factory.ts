import { faker } from '@faker-js/faker';
import type { User } from 'better-auth';

import type { account, session, user } from '@/schemas';

type UserInsert = typeof user.$inferInsert;
type SessionInsert = typeof session.$inferInsert;
type AccountInsert = typeof account.$inferInsert;

export const createUserData = (overrides: Partial<UserInsert> = {}): UserInsert => {
  const id = overrides.id ?? crypto.randomUUID();

  return {
    id,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    emailVerified: true,
    image: null,
    role: null,
    banned: false,
    banReason: null,
    banExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

export const createSessionData = (userId: string, overrides: Partial<SessionInsert> = {}): SessionInsert => {
  const id = overrides.id ?? crypto.randomUUID();

  return {
    id,
    userId,
    token: `test-token-${id}`,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    impersonatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

export const createAccountData = (userId: string, overrides: Partial<AccountInsert> = {}): AccountInsert => {
  const id = overrides.id ?? crypto.randomUUID();

  return {
    id,
    userId,
    accountId: userId,
    providerId: 'credential',
    password: 'hashed-password',
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

export const createMockUser = (overrides: Partial<User> = {}): User => {
  const id = overrides.id ?? crypto.randomUUID();

  return {
    id,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};
