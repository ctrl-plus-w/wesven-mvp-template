'use client';

import NextLink from 'next/link';

import { Button } from '@astryxdesign/core/Button';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Link } from '@astryxdesign/core/Link';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import AuthCard from '@/layout/auth-card';

import TextField from '@/element/text-field';

import { RequestResetPasswordSchema, type RequestResetPasswordSchemaType } from '@/util/schemas/auth';
import { unwrapServerAction } from '@/util/server';
import { getErrorMessage } from '@/util/string';

import { requestResetPassword } from '@/app/actions/auth';

const getDefaultValues = (): RequestResetPasswordSchemaType => ({
  email: '',
});

const RequestResetPasswordPage = () => {
  const showToast = useToast();

  const { control, handleSubmit } = useForm<RequestResetPasswordSchemaType>({
    resolver: standardSchemaResolver(RequestResetPasswordSchema),
    defaultValues: getDefaultValues(),
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: RequestResetPasswordSchemaType) =>
      await unwrapServerAction(requestResetPassword(values)),
    onError: (err) => showToast({ type: 'error', body: getErrorMessage(err) }),
    // Astryx toasts are 'info' or 'error' — there is no success type, and the
    // absence of an error is itself the confirmation here.
    onSuccess: () =>
      showToast({
        body: 'Si un compte est lié à cet email, vous recevrez un lien de réinitialisation sous peu.',
      }),
  });

  return (
    <AuthCard
      title="Mot de passe perdu"
      description="Recevez un email et réinitialisez votre mot de passe."
      footer={
        <>
          Vous n'avez pas de compte ?{' '}
          <Link as={NextLink} href="/register">
            S'inscrire
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((values) => mutateAsync(values))} noValidate>
        <VStack gap={4}>
          <FormLayout>
            <TextField control={control} name="email" type="email" label="Email" isRequired />
          </FormLayout>

          <Button type="submit" label="Envoyez-moi un email" isLoading={isPending} width="100%" />
        </VStack>
      </form>
    </AuthCard>
  );
};

export default RequestResetPasswordPage;
