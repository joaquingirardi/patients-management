import { ErrorCode } from '@pm/contracts';
import { type NextRequest, NextResponse } from 'next/server';

import { isSameOriginRequest, problemResponse } from '@/lib/bff';
import { SESSION_COOKIE } from '@/lib/session/claims';

/** Stateless JWTs cannot be revoked server-side; logging out means discarding the cookie. */
export function POST(request: NextRequest): NextResponse {
  if (!isSameOriginRequest(request)) {
    return problemResponse(403, ErrorCode.Forbidden, 'Cross-site request rejected.');
  }
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
