import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import RegisterPage from '@/feature/auth/register-page';

import auth from '@/instance/auth/server';

export const dynamic = 'force-dynamic';

const Page = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) return redirect('/dashboard');

  return <RegisterPage />;
};

export default Page;
