'use client';

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from 'better-auth';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/element/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/element/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/element/field';
import { Input } from '@/element/input';
import RequiredMark from '@/element/required-mark';

import useUser, { USER_QUERY_KEY } from '@/hook/data/use-user';

import { UpdateUserInfoSchema, type UpdateUserInfoSchemaType } from '@/util/schemas/auth';
import { unwrapServerAction } from '@/util/server';
import { getErrorMessage } from '@/util/string';

import { updateUserInfo } from '@/app/actions/auth';

const getDefaultValues = (user?: User): UpdateUserInfoSchemaType => ({
  name: user?.name ?? '',
});

const UpdateUserInfoForm = () => {
  const { data: user } = useUser();
  const queryClient = useQueryClient();

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<UpdateUserInfoSchemaType>({
    resolver: standardSchemaResolver(UpdateUserInfoSchema),
    defaultValues: getDefaultValues(user),
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: UpdateUserInfoSchemaType) => await unwrapServerAction(updateUserInfo(values)),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      toast.success('Vos informations ont été mises à jour.');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations personnelles</CardTitle>
        <CardDescription>Mettez à jour vos informations personnelles.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit((values) => mutateAsync(values))}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" value={user?.email ?? ''} disabled />
              <FieldDescription>L'adresse email ne peut pas être modifiée.</FieldDescription>
            </Field>

            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">
                Nom <RequiredMark />
              </FieldLabel>
              <Input id="name" {...register('name')} required aria-invalid={!!errors.name} />
              {!!errors.name && <FieldError errors={[errors.name]} />}
            </Field>

            <Field>
              <Button type="submit" isLoading={isPending}>
                Enregistrer
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default UpdateUserInfoForm;
