import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import LoginPage from '@/feature/auth/login-page';

import auth from '@/instance/auth/server';

export const dynamic = 'force-dynamic';

const Page = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) return redirect('/dashboard');

  return <LoginPage />;
};

export default Page;
