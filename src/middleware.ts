import { type NextRequest, NextResponse } from 'next/server';

import AUTH_CONFIG from '@/constant/auth';

const hasSessionCookie = (request: NextRequest) => {
  const prefix = AUTH_CONFIG.cookie_prefix;
  return request.cookies.has(`${prefix}.session_token`) || request.cookies.has(`__Secure-${prefix}.session_token`);
};

export function middleware(request: NextRequest) {
  // THIS IS NOT SECURE!
  // Optimistic redirect only — real session validation happens per page/route.
  if (!hasSessionCookie(request)) return NextResponse.redirect(new URL('/', request.url));

  return NextResponse.next();
}

export const config = { matcher: ['/dashboard'] };
