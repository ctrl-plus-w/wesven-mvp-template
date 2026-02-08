import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const auth = createAuthClient({
  plugins: [adminClient()],
});

export default auth;
