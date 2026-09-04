'use client';

import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

import DashboardLayout from '@/layout/dashboard-layout';

import useGetUser from '@/hook/data/use-user';

const DashboardHomePage = () => {
  const { data: user } = useGetUser();

  return (
    <DashboardLayout>
      <VStack gap={1}>
        <Heading level={1}>Bienvenue, {user?.name}</Heading>
        <Text color="secondary">Bienvenue sur votre tableau de bord.</Text>
      </VStack>
    </DashboardLayout>
  );
};

export default DashboardHomePage;
