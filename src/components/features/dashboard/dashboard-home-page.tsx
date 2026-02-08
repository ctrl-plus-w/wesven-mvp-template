'use client';

import DashboardLayout from '@/layout/dashboard-layout';

import useUser from '@/hook/data/use-user';

const DashboardHomePage = () => {
  const { data: user } = useUser();

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Bienvenue, {user?.name}</h1>
      <p className="text-muted-foreground">Bienvenue sur votre tableau de bord.</p>
    </DashboardLayout>
  );
};

export default DashboardHomePage;
