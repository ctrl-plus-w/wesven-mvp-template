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
  // These run through the server actions in `@/action/auth`, which throttle them per email. Their HTTP routes would
  // be a way around that throttle, so they answer 404.
  disabledPaths: ['/sign-up/email', '/sign-in/email', '/request-password-reset'],

  emailAndPassword: {
    enabled: true,
    // A reset link is how a stolen account is recovered: it must end the thief's sessions too.
    revokeSessionsOnPasswordReset: true,

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
    schema,
  }),

  plugins: [admin(), nextCookies()],

  advanced: {
    cookiePrefix: AUTH_CONFIG.cookie_prefix,
    // Vercel sets `x-forwarded-for` to the client's address; behind Cloudflare, put `cf-connecting-ip` first.
    ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
    database: { generateId: false },
  },
});

export default auth;
