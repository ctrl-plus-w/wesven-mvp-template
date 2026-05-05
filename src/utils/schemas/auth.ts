import { z } from '@/instances/zod';

export const PasswordSchema = z.string().min(8);

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginSchemaType = z.infer<typeof LoginSchema>;

export const RequestResetPasswordSchema = z.object({
  email: z.email(),
});

export type RequestResetPasswordSchemaType = z.infer<typeof RequestResetPasswordSchema>;

export const RegisterSchema = z
  .object({
    name: z.string().min(2),
    email: z.email(),
    password: PasswordSchema,
    confirmPassword: PasswordSchema,
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les deux mot de passe doivent être égaux.',
  });

export type RegisterSchemaType = z.infer<typeof RegisterSchema>;

export const ResetPasswordSchema = z
  .object({
    password: PasswordSchema,
    confirmPassword: PasswordSchema,
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les deux mot de passe doivent être égaux.',
  });

export type ResetPasswordSchemaType = z.infer<typeof ResetPasswordSchema>;

export const UpdateUserInfoSchema = z.object({
  name: z.string().min(2),
});

export type UpdateUserInfoSchemaType = z.infer<typeof UpdateUserInfoSchema>;

export const UpdatePasswordSchema = z
  .object({
    password: z.string().min(1),
    newPassword: PasswordSchema,
    confirmNewPassword: PasswordSchema,
  })
  .refine(({ newPassword, confirmNewPassword }) => newPassword === confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'Les deux mot de passe doivent être égaux.',
  });

export type UpdatePasswordSchemaType = z.infer<typeof UpdatePasswordSchema>;

export const DeleteAccountSchema = z.object({
  password: z.string().min(1),
});

export type DeleteAccountSchemaType = z.infer<typeof DeleteAccountSchema>;
