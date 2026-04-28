import { describe, expect, it, type Mock } from 'vitest';

import { ServerActionError, type ServerActionResult, unwrapServerAction } from '@/util/server';

import { createSessionData, createUserData } from '@/factory/index';
import type * as schema from '@/schemas';
import { insertSession, insertUser } from '@/test-util/db';

// Mocked auth object from '@/instance/auth/server'
export type MockedAuth = { api: { getSession: Mock } };

// Server action that returns a ServerActionResult
export type ServerAction = () => Promise<ServerActionResult<unknown>>;

// Map of action names to their invocations for testing
export type ProtectedActions = Record<string, ServerAction>;

// Context returned by setupAuthenticatedUser
export interface AuthenticatedContext {
  user: typeof schema.user.$inferSelect;
  session: typeof schema.session.$inferSelect;
}

/**
 * Creates auth setup functions bound to a mocked auth object.
 *
 * @example
 * vi.mock('@/instance/auth/server', () => ({
 *   default: { api: { getSession: vi.fn() } },
 * }));
 * import auth from '@/instance/auth/server';
 *
 * const { setupUnauthenticated, setupNoActiveOrganization, setupAuthenticatedUser } =
 *   createAuthSetup(auth);
 */
export const createAuthSetup = (auth: MockedAuth) => {
  return {
    /** Mock auth to return null (unauthenticated user) */
    setupUnauthenticated: () => {
      auth.api.getSession.mockResolvedValue(null);
    },

    /** Create fully authenticated user */
    setupAuthenticatedUser: async (): Promise<AuthenticatedContext> => {
      const user = await insertUser(createUserData());
      const session = await insertSession(createSessionData(user.id));
      auth.api.getSession.mockResolvedValue({ user, session });
      return { user, session };
    },
  };
};

/**
 * Generates describe.each block testing auth guards for protected actions.
 * Tests both unauthenticated and no-active-organization scenarios.
 *
 * @example
 * const { setupUnauthenticated, setupNoActiveOrganization } = createAuthSetup(auth);
 *
 * const protectedActions = {
 *   getUsers: () => getUsers(),
 *   createUser: () => createUser({ name: 'Test' }),
 * };
 *
 * describeProtectedActions(protectedActions, { setupUnauthenticated, setupNoActiveOrganization });
 */
export const describeProtectedActions = (
  actions: ProtectedActions,
  setup: {
    setupUnauthenticated: VoidFunction;
    setupNoActiveOrganization: () => Promise<unknown>;
  },
) => {
  describe.each(Object.entries(actions))('%s', (_, action) => {
    it('throws when not authenticated', async () => {
      setup.setupUnauthenticated();
      await expect(unwrapServerAction(action())).rejects.toThrow(ServerActionError);
    });

    it('throws when no active organization', async () => {
      await setup.setupNoActiveOrganization();
      await expect(unwrapServerAction(action())).rejects.toThrow(ServerActionError);
    });
  });
};
