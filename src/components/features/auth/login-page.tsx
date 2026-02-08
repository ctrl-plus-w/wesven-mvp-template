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

import { LoginSchema, type LoginSchemaType } from '@/util/schemas/auth';
import { unwrapServerAction } from '@/util/server';
import { getErrorMessage } from '@/util/string';

import { login } from '@/app/actions/auth';

const LoginPage = () => {
  const router = useRouter();

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    resolver: standardSchemaResolver(LoginSchema),
    defaultValues: {},
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: LoginSchemaType) => await unwrapServerAction(login(values)),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSuccess: () => router.push('/dashboard'),
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connectez-vous à votre compte</CardTitle>
        <CardDescription>Entrez votre email ci-dessous pour vous connecter</CardDescription>
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

            <Field data-invalid={!!errors.password}>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">
                  Mot de passe <RequiredMark />
                </FieldLabel>
                <Link
                  href="/reset-password"
                  className="ml-auto inline-block text-xs underline-offset-4 hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <Input
                id="password"
                type="password"
                {...register('password')}
                required
                aria-invalid={!!errors.password}
              />
              {!!errors.password && <FieldError errors={[errors.password]} />}
            </Field>

            <Field>
              <Button type="submit" isLoading={isPending}>
                Se connecter
              </Button>
              <FieldDescription className="text-center">
                Vous n'avez pas de compte ? <Link href="/register">S'inscrire</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginPage;
