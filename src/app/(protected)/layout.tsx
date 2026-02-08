import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import type { ReactNode } from 'react';

import Hydrate from '@/element/hydrate';

import auth from '@/instance/auth/server';

import { USER_QUERY_KEY } from '@/hooks/data/use-user';

export const dynamic = 'force-dynamic';

const ProtectedLayout = async ({ children }: { children: ReactNode }) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  return (
    <Hydrate queryKey={USER_QUERY_KEY} value={session.user}>
      {children}
    </Hydrate>
  );
};

export default ProtectedLayout;
