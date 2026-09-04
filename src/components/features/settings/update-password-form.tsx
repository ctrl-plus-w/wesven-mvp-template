'use client';

import { Button } from '@astryxdesign/core/Button';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { HStack } from '@astryxdesign/core/HStack';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import FormCard from '@/layout/form-card';

import TextField from '@/element/text-field';

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
  const showToast = useToast();

  const { control, handleSubmit, reset } = useForm<UpdatePasswordSchemaType>({
    resolver: standardSchemaResolver(UpdatePasswordSchema),
    defaultValues: getDefaultValues(),
  });

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: UpdatePasswordSchemaType) => await unwrapServerAction(updatePassword(values)),
    onError: (err) => showToast({ type: 'error', body: getErrorMessage(err) }),
    onSuccess: () => {
      showToast({ body: 'Votre mot de passe a été mis à jour.' });
      reset(getDefaultValues());
    },
  });

  return (
    <FormCard title="Modifier le mot de passe" description="Mettez à jour votre mot de passe.">
      <form onSubmit={handleSubmit((values) => mutateAsync(values))} noValidate>
        <VStack gap={4}>
          <FormLayout>
            <TextField control={control} name="password" type="password" label="Mot de passe actuel" isRequired />
            <TextField
              control={control}
              name="newPassword"
              type="password"
              label="Nouveau mot de passe"
              description="Le mot de passe doit contenir au moins 8 caractères."
              isRequired
            />
            <TextField
              control={control}
              name="confirmNewPassword"
              type="password"
              label="Confirmer le nouveau mot de passe"
              isRequired
            />
          </FormLayout>

          <HStack justify="start">
            <Button type="submit" label="Modifier le mot de passe" isLoading={isPending} />
          </HStack>
        </VStack>
      </form>
    </FormCard>
  );
};

export default UpdatePasswordForm;
