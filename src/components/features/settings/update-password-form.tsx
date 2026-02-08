'use client';

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/element/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/element/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/element/field';
import { Input } from '@/element/input';
import RequiredMark from '@/element/required-mark';

import { UpdatePasswordSchema, type UpdatePasswordSchemaType } from '@/util/schemas/auth';
import { unwrapServerAction } from '@/util/server';
import { getErrorMessage } from '@/util/string';

import { updatePassword } from '@/app/actions/auth';

const getDefaultValues = (): UpdatePasswordSchemaType => ({
  password: '',
  newPassword: '',
  confirmNewPassword: '',
});

const UpdatePasswordForm = () => {
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<UpdatePasswordSchemaType>({
    resolver: standardSchemaResolver(UpdatePasswordSchema),
    defaultValues: getDefaultValues(),
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: UpdatePasswordSchemaType) => await unwrapServerAction(updatePassword(values)),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSuccess: () => {
      toast.success('Votre mot de passe a été mis à jour.');
      reset(getDefaultValues());
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modifier le mot de passe</CardTitle>
        <CardDescription>Mettez à jour votre mot de passe.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit((values) => mutateAsync(values))}>
          <FieldGroup>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">
                Mot de passe actuel <RequiredMark />
              </FieldLabel>
              <Input
                id="password"
                type="password"
                {...register('password')}
                required
                aria-invalid={!!errors.password}
              />
              {!!errors.password && <FieldError errors={[errors.password]} />}
            </Field>

            <Field data-invalid={!!errors.newPassword}>
              <FieldLabel htmlFor="newPassword">
                Nouveau mot de passe <RequiredMark />
              </FieldLabel>
              <Input
                id="newPassword"
                type="password"
                {...register('newPassword')}
                required
                aria-invalid={!!errors.newPassword}
              />
              <FieldDescription>Le mot de passe doit contenir au moins 8 caractères.</FieldDescription>
              {!!errors.newPassword && <FieldError errors={[errors.newPassword]} />}
            </Field>

            <Field data-invalid={!!errors.confirmNewPassword}>
              <FieldLabel htmlFor="confirmNewPassword">
                Confirmer le nouveau mot de passe <RequiredMark />
              </FieldLabel>
              <Input
                id="confirmNewPassword"
                type="password"
                {...register('confirmNewPassword')}
                required
                aria-invalid={!!errors.confirmNewPassword}
              />
              {!!errors.confirmNewPassword && <FieldError errors={[errors.confirmNewPassword]} />}
            </Field>

            <Field>
              <Button type="submit" isLoading={isPending}>
                Modifier le mot de passe
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default UpdatePasswordForm;
