import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import RequestResetPasswordPage from '@/feature/auth/request-reset-password-page';
import ResetPasswordPage from '@/feature/auth/reset-password-page';

import auth from '@/instance/auth/server';

export const dynamic = 'force-dynamic';

export interface PageParams {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const Page = async ({ searchParams: searchParamsPromise }: PageParams) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) return redirect('/dashboard');

  const searchParams = await searchParamsPromise;

  const token = typeof searchParams.token === 'string' ? searchParams.token : undefined;

  return token ? <ResetPasswordPage token={token} /> : <RequestResetPasswordPage />;
};

export default Page;
