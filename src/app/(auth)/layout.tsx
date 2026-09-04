import type { PropsWithChildren } from 'react';

import { Center } from '@astryxdesign/core/Center';

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <Center height="100dvh" padding={4}>
      {children}
    </Center>
  );
};

export default AuthLayout;
