import { toNextJsHandler } from 'better-auth/next-js';

import auth from '@/instance/auth/server';

export const { GET, POST } = toNextJsHandler(auth);
