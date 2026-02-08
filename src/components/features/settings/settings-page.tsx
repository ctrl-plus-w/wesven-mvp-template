'use client';

import UpdatePasswordForm from '@/feature/settings/update-password-form';
import UpdateUserInfoForm from '@/feature/settings/update-user-info-form';

import DashboardLayout from '@/layout/dashboard-layout';

const SettingsPage = () => {
  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground text-sm">Gérez vos informations personnelles et votre sécurité.</p>
      </div>

      <div className="grid max-w-2xl gap-6">
        <UpdateUserInfoForm />
        <UpdatePasswordForm />
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
