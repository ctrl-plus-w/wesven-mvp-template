'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/element/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/element/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/element/field';
import { Input } from '@/element/input';
import RequiredMark from '@/element/required-mark';

import { RegisterSchema, type RegisterSchemaType } from '@/util/schemas/auth';
import { unwrapServerAction } from '@/util/server';
import { getErrorMessage } from '@/util/string';

import { register as registerAction } from '@/app/actions/auth';

const RegisterPage = () => {
  const router = useRouter();

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<RegisterSchemaType>({
    resolver: standardSchemaResolver(RegisterSchema),
    defaultValues: {},
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: RegisterSchemaType) => await unwrapServerAction(registerAction(values)),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSuccess: () => router.push('/dashboard'),
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>Entrez vos informations ci-dessous pour créer votre compte</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit((values) => mutateAsync(values))}>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">
                Nom complet <RequiredMark />
              </FieldLabel>
              <Input id="name" {...register('name')} required aria-invalid={!!errors.name} />
              {!!errors.name && <FieldError errors={[errors.name]} />}
            </Field>

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">
                Email <RequiredMark />
              </FieldLabel>
              <Input id="email" {...register('email')} required aria-invalid={!!errors.email} />
              {!!errors.email && <FieldError errors={[errors.email]} />}
            </Field>

            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">
                Mot de passe <RequiredMark />
              </FieldLabel>
              <Input type="password" {...register('password')} required aria-invalid={!!errors.password} />
              {!!errors.password && <FieldError errors={[errors.password]} />}
              <FieldDescription>Doit contenir au moins 8 caractères.</FieldDescription>
            </Field>

            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="confirm-password">
                Confirmer le mot de passe <RequiredMark />
              </FieldLabel>
              <Input
                type="password"
                {...register('confirmPassword')}
                required
                aria-invalid={!!errors.confirmPassword}
              />
              {!!errors.confirmPassword && <FieldError errors={[errors.confirmPassword]} />}
              <FieldDescription>Veuillez confirmer votre mot de passe.</FieldDescription>
            </Field>

            <FieldGroup>
              <Field>
                <Button type="submit" isLoading={isPending}>
                  Créer mon compte
                </Button>

                <FieldDescription className="px-6 text-center">
                  Vous avez déjà un compte ? <Link href="/login">Se connecter</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default RegisterPage;
