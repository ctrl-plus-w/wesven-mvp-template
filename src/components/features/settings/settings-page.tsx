'use client';

import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

import UpdatePasswordForm from '@/feature/settings/update-password-form';
import UpdateUserInfoForm from '@/feature/settings/update-user-info-form';

import DashboardLayout from '@/layout/dashboard-layout';

const SettingsPage = () => {
  return (
    <DashboardLayout>
      <VStack gap={1}>
        <Heading level={1}>Paramètres</Heading>
        <Text color="secondary" size="sm">
          Gérez vos informations personnelles et votre sécurité.
        </Text>
      </VStack>

      <VStack gap={4} maxWidth={672}>
        <UpdateUserInfoForm />
        <UpdatePasswordForm />
      </VStack>
    </DashboardLayout>
  );
};

export default SettingsPage;
