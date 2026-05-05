'use client';

import { useQuery } from '@tanstack/react-query';

import auth from '@/instance/auth/client';

export const USER_QUERY_KEY = ['users', 'current'];

const useGetUser = () => {
  return useQuery({
    queryFn: async () => {
      const response = await auth.getSession();
      if (!response.data) throw new Error('Session not found');

      return response.data.user;
    },
    queryKey: USER_QUERY_KEY,
  });
};

export default useGetUser;
