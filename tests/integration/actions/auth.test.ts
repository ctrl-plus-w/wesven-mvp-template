import { APIError } from 'better-auth';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { ServerActionError, unwrapServerAction } from '@/util/server';

vi.mock('@/instance/auth/server', () => ({
  default: {
    api: {
      getSession: vi.fn(),
      signInEmail: vi.fn(),
      signUpEmail: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
      signOut: vi.fn(),
      deleteUser: vi.fn(),
      updateUser: vi.fn(),
      changePassword: vi.fn(),
    },
  },
}));

vi.mock('@/env.public', () => ({
  default: { NEXT_PUBLIC_APP_URL: 'https://test.example.com' },
}));

import auth from '@/instance/auth/server';

import {
  deleteAccount,
  login,
  logout,
  register,
  requestResetPassword,
  resetPassword,
  updatePassword,
  updateUserInfo,
} from '@/app/actions/auth';
import { createAuthSetup, type MockedAuth } from '@/test-util/auth';

type MockedAuthApi = {
  getSession: Mock;
  signInEmail: Mock;
  signUpEmail: Mock;
  requestPasswordReset: Mock;
  resetPassword: Mock;
  signOut: Mock;
  deleteUser: Mock;
  updateUser: Mock;
  changePassword: Mock;
};

const authApi = (auth as unknown as { api: MockedAuthApi }).api;
const { setupUnauthenticated } = createAuthSetup(auth as unknown as MockedAuth);

describe('Auth Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login', () => {
    it('calls signInEmail with valid credentials', async () => {
      authApi.signInEmail.mockResolvedValue(undefined);

      await unwrapServerAction(login({ email: 'user@example.com', password: 'securepass' }));

      expect(authApi.signInEmail).toHaveBeenCalledWith({
        body: { email: 'user@example.com', password: 'securepass' },
      });
    });

    it('rejects with invalid email format', async () => {
      await expect(unwrapServerAction(login({ email: 'not-an-email', password: 'securepass' }))).rejects.toThrow();
    });

    it('rejects with empty password', async () => {
      await expect(unwrapServerAction(login({ email: 'user@example.com', password: '' }))).rejects.toThrow();
    });

    it('returns error when signInEmail throws APIError', async () => {
      authApi.signInEmail.mockRejectedValue(new APIError('UNAUTHORIZED'));

      await expect(unwrapServerAction(login({ email: 'user@example.com', password: 'wrongpass' }))).rejects.toThrow(
        ServerActionError,
      );
    });
  });

  describe('Register', () => {
    it('creates user on successful registration', async () => {
      authApi.signUpEmail.mockResolvedValue(undefined);

      await unwrapServerAction(
        register({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'securepass',
          confirmPassword: 'securepass',
        }),
      );

      expect(authApi.signUpEmail).toHaveBeenCalledWith({
        body: { name: 'John Doe', email: 'john@example.com', password: 'securepass' },
      });
    });

    it('rejects with invalid registration data', async () => {
      await expect(
        unwrapServerAction(
          register({
            name: '',
            email: 'invalid',
            password: 'p',
            confirmPassword: 'p',
          }),
        ),
      ).rejects.toThrow();
    });

    it('rejects when passwords do not match', async () => {
      await expect(
        unwrapServerAction(
          register({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password1',
            confirmPassword: 'password2',
          }),
        ),
      ).rejects.toThrow();
    });
  });

  describe('Request Reset Password', () => {
    it('calls requestPasswordReset with correct redirectTo URL', async () => {
      authApi.requestPasswordReset.mockResolvedValue(undefined);

      await unwrapServerAction(requestResetPassword({ email: 'user@example.com' }));

      expect(authApi.requestPasswordReset).toHaveBeenCalledWith({
        body: {
          email: 'user@example.com',
          redirectTo: 'https://test.example.com/reset-password',
        },
      });
    });

    it('rejects with invalid email', async () => {
      await expect(unwrapServerAction(requestResetPassword({ email: 'not-an-email' }))).rejects.toThrow();
    });
  });

  describe('Reset Password', () => {
    it('calls resetPassword with token and new password', async () => {
      authApi.resetPassword.mockResolvedValue(undefined);

      const token = 'reset-token-123';
      await unwrapServerAction(resetPassword(token, { password: 'mynewpassword', confirmPassword: 'mynewpassword' }));

      expect(authApi.resetPassword).toHaveBeenCalledWith({
        body: { newPassword: 'mynewpassword', token },
      });
    });

    it('rejects when passwords do not match', async () => {
      await expect(
        unwrapServerAction(resetPassword('token', { password: 'newpass1', confirmPassword: 'newpass2' })),
      ).rejects.toThrow();
    });

    it('rejects with too short password', async () => {
      await expect(
        unwrapServerAction(resetPassword('token', { password: 'a', confirmPassword: 'a' })),
      ).rejects.toThrow();
    });
  });

  describe('Logout', () => {
    it('calls signOut with headers', async () => {
      authApi.signOut.mockResolvedValue(undefined);

      await unwrapServerAction(logout());

      expect(authApi.signOut).toHaveBeenCalledWith({ headers: expect.any(Headers) });
    });
  });

  describe('Delete Account', () => {
    it('calls deleteUser with password and headers', async () => {
      authApi.deleteUser.mockResolvedValue(undefined);

      await unwrapServerAction(deleteAccount({ password: 'mypassword' }));

      expect(authApi.deleteUser).toHaveBeenCalledWith({
        headers: expect.any(Headers),
        body: { password: 'mypassword' },
      });
    });

    it('rejects with empty password', async () => {
      await expect(unwrapServerAction(deleteAccount({ password: '' }))).rejects.toThrow();
    });
  });

  describe('Update User Info', () => {
    it('throws when not authenticated', async () => {
      setupUnauthenticated();

      await expect(unwrapServerAction(updateUserInfo({ name: 'New Name' }))).rejects.toThrow(ServerActionError);
    });

    it('updates user name when authenticated', async () => {
      authApi.getSession.mockResolvedValue({ user: { id: '1' }, session: {} });
      authApi.updateUser.mockResolvedValue(undefined);

      await unwrapServerAction(updateUserInfo({ name: 'New Name' }));

      expect(authApi.updateUser).toHaveBeenCalledWith({
        body: { name: 'New Name' },
        headers: expect.any(Headers),
      });
    });

    it('rejects with name shorter than 2 characters', async () => {
      authApi.getSession.mockResolvedValue({ user: { id: '1' }, session: {} });

      await expect(unwrapServerAction(updateUserInfo({ name: 'A' }))).rejects.toThrow();
    });
  });

  describe('Update Password', () => {
    it('throws when not authenticated', async () => {
      setupUnauthenticated();

      await expect(
        unwrapServerAction(
          updatePassword({ password: 'oldpass', newPassword: 'newpassword', confirmNewPassword: 'newpassword' }),
        ),
      ).rejects.toThrow(ServerActionError);
    });

    it('changes password when authenticated', async () => {
      authApi.getSession.mockResolvedValue({ user: { id: '1' }, session: {} });
      authApi.changePassword.mockResolvedValue(undefined);

      await unwrapServerAction(
        updatePassword({ password: 'oldpass', newPassword: 'newpassword', confirmNewPassword: 'newpassword' }),
      );

      expect(authApi.changePassword).toHaveBeenCalledWith({
        body: { currentPassword: 'oldpass', newPassword: 'newpassword' },
        headers: expect.any(Headers),
      });
    });

    it('rejects with too short password', async () => {
      authApi.getSession.mockResolvedValue({ user: { id: '1' }, session: {} });

      await expect(
        unwrapServerAction(updatePassword({ password: 'a', newPassword: 'b', confirmNewPassword: 'b' })),
      ).rejects.toThrow();
    });
  });

  // TODO: requestShopResetPassword and requestRegister are not tested here because they
  // query db.query.organization.findFirst() which requires the organization table from
  // better-auth's organization plugin. These should be added once the organization schema
  // is available in the test database.
});
