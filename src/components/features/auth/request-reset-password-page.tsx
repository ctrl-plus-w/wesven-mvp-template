'use client';

import NextLink from 'next/link';

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/element/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/element/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/element/field';
import { Input } from '@/element/input';
import RequiredMark from '@/element/required-mark';

import { RequestResetPasswordSchema, type RequestResetPasswordSchemaType } from '@/util/schemas/auth';
import { unwrapServerAction } from '@/util/server';
import { getErrorMessage } from '@/util/string';

import { requestResetPassword } from '@/app/actions/auth';

const getDefaultValues = (): RequestResetPasswordSchemaType => ({
  email: '',
});

const RequestResetPasswordPage = () => {
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<RequestResetPasswordSchemaType>({
    resolver: standardSchemaResolver(RequestResetPasswordSchema),
    defaultValues: getDefaultValues(),
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: RequestResetPasswordSchemaType) =>
      await unwrapServerAction(requestResetPassword(values)),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSuccess: () =>
      toast.success('If an account is linked to this email, you will receive a password reset email shortly.'),
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Mot de passe perdu</CardTitle>
        <CardDescription>Recevez un email et réinitialisez votre mot de passe.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit((values) => mutateAsync(values))}>
          <FieldGroup>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">
                Email <RequiredMark />
              </FieldLabel>
              <Input id="email" {...register('email')} required aria-invalid={!!errors.email} />
              {!!errors.email && <FieldError errors={[errors.email]} />}
            </Field>

            <Field>
              <Button type="submit" isLoading={isPending}>
                Envoyez-moi un email
              </Button>

              <FieldDescription className="text-center">
                Vous n'avez pas de compte ? <NextLink href="/register">S'inscrire</NextLink>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default RequestResetPasswordPage;
