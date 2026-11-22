'use server';

import { headers } from 'next/headers';

import { APIError } from 'better-auth';

import auth from '@/instance/auth/server';

import { assertResetMailAllowed, throttledSignIn } from '@/util/auth-throttle.server';
import {
  DeleteAccountSchema,
  type DeleteAccountSchemaType,
  LoginSchema,
  type LoginSchemaType,
  RegisterSchema,
  type RegisterSchemaType,
  RequestResetPasswordSchema,
  type RequestResetPasswordSchemaType,
  ResetPasswordSchema,
  type ResetPasswordSchemaType,
  UpdatePasswordSchema,
  type UpdatePasswordSchemaType,
  UpdateUserInfoSchema,
  type UpdateUserInfoSchemaType,
} from '@/util/schemas';
import { createServerAction, UnauthorizedServerActionError } from '@/util/server';

import ENV_PUBLIC from '@/env.public';

const isWrongPassword = (error: unknown) =>
  error instanceof APIError && error.body?.code === 'INVALID_EMAIL_OR_PASSWORD';

export const login = createServerAction('login', async (values: LoginSchemaType) => {
  const { email, password } = LoginSchema.parse(values);

  await throttledSignIn(email, {
    signIn: () => auth.api.signInEmail({ body: { email, password } }),
    isWrongPassword,
  });
});

export const register = createServerAction('register', async (values: RegisterSchemaType) => {
  const { name, email, password } = RegisterSchema.parse(values);

  await auth.api.signUpEmail({ body: { name, email, password } });
});

export const requestResetPassword = createServerAction(
  'requestResetPassword',
  async (values: RequestResetPasswordSchemaType) => {
    const { email } = RequestResetPasswordSchema.parse(values);
    await assertResetMailAllowed(email);

    const redirectTo = `${ENV_PUBLIC.NEXT_PUBLIC_APP_URL}/reset-password`;

    await auth.api.requestPasswordReset({ body: { email, redirectTo } });
  },
);

export const resetPassword = createServerAction(
  'resetPassword',
  async (token: string, values: ResetPasswordSchemaType) => {
    const { password } = ResetPasswordSchema.parse(values);

    await auth.api.resetPassword({ body: { newPassword: password, token } });
  },
);

export const logout = createServerAction('logout', async () => {
  await auth.api.signOut({ headers: await headers() });
});

export const deleteAccount = createServerAction('deleteAccount', async (values: DeleteAccountSchemaType) => {
  const { password } = DeleteAccountSchema.parse(values);

  await auth.api.deleteUser({ headers: await headers(), body: { password } });
});

export const updateUserInfo = createServerAction('updateUserInfo', async (values: UpdateUserInfoSchemaType) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new UnauthorizedServerActionError();

  const { name } = UpdateUserInfoSchema.parse(values);

  await auth.api.updateUser({ body: { name }, headers: await headers() });
});

export const updatePassword = createServerAction('updatePassword', async (values: UpdatePasswordSchemaType) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new UnauthorizedServerActionError();

  const { password, newPassword } = UpdatePasswordSchema.parse(values);

  await auth.api.changePassword({
    body: {
      currentPassword: password,
      newPassword: newPassword,
    },
    headers: await headers(),
  });
});
