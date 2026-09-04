'use client';

import { Button } from '@astryxdesign/core/Button';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { HStack } from '@astryxdesign/core/HStack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from 'better-auth';
import { useForm } from 'react-hook-form';

import FormCard from '@/layout/form-card';

import TextField from '@/element/text-field';

import useGetUser, { USER_QUERY_KEY } from '@/hook/data/use-user';

import { UpdateUserInfoSchema, type UpdateUserInfoSchemaType } from '@/util/schemas/auth';
import { unwrapServerAction } from '@/util/server';
import { getErrorMessage } from '@/util/string';

import { updateUserInfo } from '@/app/actions/auth';

const getDefaultValues = (user?: User): UpdateUserInfoSchemaType => ({
  name: user?.name ?? '',
});

const UpdateUserInfoForm = () => {
  const { data: user } = useGetUser();
  const queryClient = useQueryClient();
  const showToast = useToast();

  const { control, handleSubmit } = useForm<UpdateUserInfoSchemaType>({
    resolver: standardSchemaResolver(UpdateUserInfoSchema),
    defaultValues: getDefaultValues(user),
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: UpdateUserInfoSchemaType) => await unwrapServerAction(updateUserInfo(values)),
    onError: (err) => showToast({ type: 'error', body: getErrorMessage(err) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      showToast({ body: 'Vos informations ont été mises à jour.' });
    },
  });

  return (
    <FormCard title="Informations personnelles" description="Mettez à jour vos informations personnelles.">
      <form onSubmit={handleSubmit((values) => mutateAsync(values))} noValidate>
        <VStack gap={4}>
          <FormLayout>
            {/* Outside the form: the address is shown for context, not edited. */}
            <TextInput
              label="Email"
              description="L'adresse email ne peut pas être modifiée."
              value={user?.email ?? ''}
              isReadOnly
            />

            <TextField control={control} name="name" label="Nom" isRequired />
          </FormLayout>

          <HStack justify="start">
            <Button type="submit" label="Enregistrer" isLoading={isPending} />
          </HStack>
        </VStack>
      </form>
    </FormCard>
  );
};

export default UpdateUserInfoForm;
