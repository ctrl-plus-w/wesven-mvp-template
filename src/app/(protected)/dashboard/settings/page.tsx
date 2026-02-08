import type { Metadata } from 'next';

import SettingsPage from '@/feature/settings/settings-page';

export const metadata: Metadata = {
  title: 'Paramètres',
};

const Page = () => {
  return <SettingsPage />;
};

export default Page;
