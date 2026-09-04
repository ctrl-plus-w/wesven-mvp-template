'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@astryxdesign/core/Button';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { HStack } from '@astryxdesign/core/HStack';
import { Link } from '@astryxdesign/core/Link';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import AuthCard from '@/layout/auth-card';

import TextField from '@/element/text-field';

import { LoginSchema, type LoginSchemaType } from '@/util/schemas/auth';
import { unwrapServerAction } from '@/util/server';
import { getErrorMessage } from '@/util/string';

import { login } from '@/app/actions/auth';

const getDefaultValues = (): LoginSchemaType => ({
  email: '',
  password: '',
});

const LoginPage = () => {
  const router = useRouter();
  const showToast = useToast();

  const { control, handleSubmit } = useForm<LoginSchemaType>({
    resolver: standardSchemaResolver(LoginSchema),
    defaultValues: getDefaultValues(),
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: LoginSchemaType) => await unwrapServerAction(login(values)),
    onError: (err) => showToast({ type: 'error', body: getErrorMessage(err) }),
    onSuccess: () => router.push('/dashboard'),
  });

  return (
    <AuthCard
      title="Connectez-vous à votre compte"
      description="Entrez votre email ci-dessous pour vous connecter"
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

            <VStack gap={1}>
              <TextField control={control} name="password" type="password" label="Mot de passe" isRequired />
              <HStack justify="end">
                <Link as={NextLink} href="/reset-password" size="sm">
                  Mot de passe oublié ?
                </Link>
              </HStack>
            </VStack>
          </FormLayout>

          <Button type="submit" label="Se connecter" isLoading={isPending} width="100%" />
        </VStack>
      </form>
    </AuthCard>
  );
};

export default LoginPage;
