import { ErrorCode } from '@pm/contracts';
import { type NextRequest, NextResponse } from 'next/server';

import { callUpstream, isSameOriginRequest, problemResponse, upstreamFailure } from '@/lib/bff';
import { SESSION_COOKIE } from '@/lib/session/claims';
import { getSessionToken } from '@/lib/session/get-session';

/**
 * Same-origin gateway to the API: attaches the Bearer token from the httpOnly cookie.
 * It is an allowlist, not an open relay — only the patients resource is reachable.
 */
const ALLOWED_PATH = /^patients(\/[0-9a-f-]{36})?$/i;
const PASSTHROUGH_HEADERS = ['content-type', 'retry-after', 'x-request-id', 'www-authenticate'];

interface Context {
  params: Promise<{ path: string[] }>;
}

async function handler(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const path = (await params).path.join('/');
  if (!ALLOWED_PATH.test(path)) {
    return problemResponse(404, ErrorCode.NotFound, 'Unknown API route.');
  }

  const isMutation = request.method !== 'GET';
  if (isMutation && !isSameOriginRequest(request)) {
    return problemResponse(403, ErrorCode.Forbidden, 'Cross-site request rejected.');
  }

  const token = await getSessionToken();
  if (!token) {
    return problemResponse(401, ErrorCode.Unauthenticated, 'Please sign in to continue.');
  }

  let upstream: Response;
  try {
    upstream = await callUpstream(request, `/${path}${request.nextUrl.search}`, {
      method: request.method,
      token,
      body: isMutation && request.method !== 'DELETE' ? await request.text() : undefined,
    });
  } catch (error) {
    return upstreamFailure(error);
  }

  const headers = new Headers();
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Cache-Control', 'no-store');

  const response = new NextResponse(upstream.body, { status: upstream.status, headers });
  // The API rejected the token (expired/invalid): drop the dead cookie right away.
  if (upstream.status === 401) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export { handler as DELETE, handler as GET, handler as POST, handler as PUT };
