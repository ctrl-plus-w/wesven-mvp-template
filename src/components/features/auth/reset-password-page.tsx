'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';

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

import { ResetPasswordSchema, type ResetPasswordSchemaType } from '@/util/schemas/auth';
import { unwrapServerAction } from '@/util/server';
import { getErrorMessage } from '@/util/string';

import { resetPassword } from '@/app/actions/auth';

export interface ResetPasswordPageProps {
  token: string;
}

const getDefaultValues = (): ResetPasswordSchemaType => ({
  password: '',
  confirmPassword: '',
});

const ResetPasswordPage = ({ token }: ResetPasswordPageProps) => {
  const router = useRouter();
  const showToast = useToast();

  const { control, handleSubmit } = useForm<ResetPasswordSchemaType>({
    resolver: standardSchemaResolver(ResetPasswordSchema),
    defaultValues: getDefaultValues(),
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: ResetPasswordSchemaType) => unwrapServerAction(resetPassword(token, values)),
    onError: (err) => showToast({ type: 'error', body: getErrorMessage(err) }),
    onSuccess: () => router.push('/'),
  });

  return (
    <AuthCard
      title="Mot de passe perdu"
      description="Entrez votre nouveau mot de passe ci-dessous pour le réinitialiser."
      footer={
        <>
          Vous avez déjà un compte ?{' '}
          <Link as={NextLink} href="/login">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((values) => mutateAsync(values))} noValidate>
        <VStack gap={4}>
          <FormLayout>
            <TextField control={control} name="password" type="password" label="Mot de passe" isRequired />
            <TextField
              control={control}
              name="confirmPassword"
              type="password"
              label="Confirmer le mot de passe"
              isRequired
            />
          </FormLayout>

          <Button type="submit" label="Réinitialiser le mot de passe" isLoading={isPending} width="100%" />
        </VStack>
      </form>
    </AuthCard>
  );
};

export default ResetPasswordPage;
