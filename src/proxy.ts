import { type NextRequest, NextResponse } from 'next/server';

import AUTH_CONFIG from '@/constant/auth';

const hasSessionCookie = (request: NextRequest) => {
  const prefix = AUTH_CONFIG.cookie_prefix;
  return request.cookies.has(`${prefix}.session_token`) || request.cookies.has(`__Secure-${prefix}.session_token`);
};

/**
 * Optimistic redirect only: it checks that a session cookie exists, not that it is valid.
 * The real session check happens in `(protected)/layout.tsx` and in every server action.
 */
export const proxy = (request: NextRequest) => {
  if (!hasSessionCookie(request)) return NextResponse.redirect(new URL('/login', request.url));

  return NextResponse.next();
};

export const config = { matcher: ['/dashboard/:path*'] };
