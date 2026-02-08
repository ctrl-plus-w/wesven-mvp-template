import type { Metadata } from 'next';

import DashboardHomePage from '@/feature/dashboard/dashboard-home-page';

export const metadata: Metadata = {
  title: 'Tableau de bord',
};

const Page = () => {
  return <DashboardHomePage />;
};

export default Page;
