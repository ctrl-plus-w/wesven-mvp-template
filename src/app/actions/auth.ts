'use server';

import { headers } from 'next/headers';

import auth from '@/instance/auth/server';

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

export const login = createServerAction(async (values: LoginSchemaType) => {
  const { email, password } = LoginSchema.parse(values);

  await auth.api.signInEmail({
    body: {
      email: email,
      password: password,
    },
  });
});

export const register = createServerAction(async (values: RegisterSchemaType) => {
  const { name, email, password } = RegisterSchema.parse(values);

  await auth.api.signUpEmail({ body: { name, email, password } });
});

export const requestResetPassword = createServerAction(async (values: RequestResetPasswordSchemaType) => {
  const { email } = RequestResetPasswordSchema.parse(values);

  const redirectTo = `${ENV_PUBLIC.NEXT_PUBLIC_APP_URL}/reset-password`;

  await auth.api.requestPasswordReset({ body: { email, redirectTo } });
});

export const resetPassword = createServerAction(async (token: string, values: ResetPasswordSchemaType) => {
  const { password } = ResetPasswordSchema.parse(values);

  await auth.api.resetPassword({ body: { newPassword: password, token } });
});

export const logout = createServerAction(async () => {
  await auth.api.signOut({ headers: await headers() });
});

export const deleteAccount = createServerAction(async (values: DeleteAccountSchemaType) => {
  const { password } = DeleteAccountSchema.parse(values);

  await auth.api.deleteUser({ headers: await headers(), body: { password } });
});

export const updateUserInfo = createServerAction(async (values: UpdateUserInfoSchemaType) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new UnauthorizedServerActionError();

  const { name } = UpdateUserInfoSchema.parse(values);

  await auth.api.updateUser({ body: { name }, headers: await headers() });
});

export const updatePassword = createServerAction(async (values: UpdatePasswordSchemaType) => {
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
