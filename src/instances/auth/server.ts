import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';

import { db } from '@/instance/drizzle';
import resend from '@/instance/resend';

import AUTH_CONFIG from '@/constant/auth';

import ENV from '@/env';
import * as schema from '@/schemas';

const auth = betterAuth({
  emailAndPassword: {
    enabled: true,

    sendResetPassword: async ({ user, url }) => {
      const urlObject = new URL(url);
      const callbackUrl = urlObject.searchParams.get('callbackURL');

      await resend.emails.send({
        from: ENV.RESEND_FROM_EMAIL,
        to: [user.email],
        template: {
          id: callbackUrl?.endsWith('/register') ? 'set-password' : 'reset-password',
          variables: {
            url: url,
            name: user.name,
          },
        },
      });
    },
  },

  user: {
    deleteUser: {
      enabled: true,
    },
  },

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
  }),

  plugins: [admin(), nextCookies()],

  advanced: {
    cookiePrefix: AUTH_CONFIG.cookie_prefix,
    database: { generateId: false },
  },
});

export default auth;
