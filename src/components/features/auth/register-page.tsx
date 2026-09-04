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

import { RegisterSchema, type RegisterSchemaType } from '@/util/schemas/auth';
import { unwrapServerAction } from '@/util/server';
import { getErrorMessage } from '@/util/string';

import { register as registerAction } from '@/app/actions/auth';

const getDefaultValues = (): RegisterSchemaType => ({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const RegisterPage = () => {
  const router = useRouter();
  const showToast = useToast();

  const { control, handleSubmit } = useForm<RegisterSchemaType>({
    resolver: standardSchemaResolver(RegisterSchema),
    defaultValues: getDefaultValues(),
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: RegisterSchemaType) => await unwrapServerAction(registerAction(values)),
    onError: (err) => showToast({ type: 'error', body: getErrorMessage(err) }),
    onSuccess: () => router.push('/dashboard'),
  });

  return (
    <AuthCard
      title="Créer un compte"
      description="Entrez vos informations ci-dessous pour créer votre compte"
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
            <TextField control={control} name="name" label="Nom complet" isRequired />
            <TextField control={control} name="email" type="email" label="Email" isRequired />
            <TextField
              control={control}
              name="password"
              type="password"
              label="Mot de passe"
              description="Doit contenir au moins 8 caractères."
              isRequired
            />
            <TextField
              control={control}
              name="confirmPassword"
              type="password"
              label="Confirmer le mot de passe"
              description="Veuillez confirmer votre mot de passe."
              isRequired
            />
          </FormLayout>

          <Button type="submit" label="Créer mon compte" isLoading={isPending} width="100%" />
        </VStack>
      </form>
    </AuthCard>
  );
};

export default RegisterPage;
