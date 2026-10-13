import { type NextRequest, NextResponse } from 'next/server';

import { isExpired, readClaims, SESSION_COOKIE } from '@/lib/session/claims';

/**
 * Route protection at the edge of the app (Next.js 16 "proxy", formerly middleware):
 *  - no / expired session: redirect to /login?next=<where you were going>[&reason=expired]
 *  - signed in and on /login: redirect to /patients
 * This is a UX gate; the API independently authorizes every data request.
 */
export function proxy(request: NextRequest): NextResponse {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = readClaims(token);
  const authenticated = claims !== null && !isExpired(claims);
  const { pathname, search } = request.nextUrl;
  const onLogin = pathname === '/login';

  if (!authenticated && !onLogin) {
    const url = new URL('/login', request.url);
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
    if (token) url.searchParams.set('reason', 'expired');
    const response = NextResponse.redirect(url);
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (authenticated && onLogin) {
    return NextResponse.redirect(new URL('/patients', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals and static files.
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)'],
};
