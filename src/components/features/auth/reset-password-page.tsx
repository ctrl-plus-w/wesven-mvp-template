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

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<ResetPasswordSchemaType>({
    resolver: standardSchemaResolver(ResetPasswordSchema),
    defaultValues: getDefaultValues(),
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: ResetPasswordSchemaType) => unwrapServerAction(resetPassword(token, values)),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSuccess: () => router.push('/'),
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Mot de passe perdu</CardTitle>
        <CardDescription>Entrez votre nouveau mot de passe ci-dessous pour le réinitialiser.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit((values) => mutateAsync(values))}>
          <FieldGroup>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">
                Mot de passe <RequiredMark />
              </FieldLabel>
              <Input id="password" {...register('password')} required aria-invalid={!!errors.password} />
              {!!errors.password && <FieldError errors={[errors.password]} />}
            </Field>

            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="confirmPassword">
                Confirmer le mot de passe <RequiredMark />
              </FieldLabel>
              <Input
                id="confirmPassword"
                {...register('confirmPassword')}
                required
                aria-invalid={!!errors.confirmPassword}
              />
              {!!errors.confirmPassword && <FieldError errors={[errors.confirmPassword]} />}
            </Field>

            <Field>
              <Button type="submit" isLoading={isPending}>
                Réinitialiser le mot de passe
              </Button>

              <FieldDescription className="text-center">
                Vous avez déjà un compte ? <Link href="/login">Se connecter</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default ResetPasswordPage;
