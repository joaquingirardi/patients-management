import { ErrorCode, LoginResponseSchema } from '@pm/contracts';
import { type NextRequest, NextResponse } from 'next/server';

import {
  callUpstream,
  isSameOriginRequest,
  problemResponse,
  sessionCookieOptions,
  upstreamFailure,
} from '@/lib/bff';

/**
 * BFF login: exchanges credentials for a token with the API and stores it in an httpOnly
 * cookie. The token is never readable by JavaScript (XSS cannot exfiltrate it); the browser
 * only receives the public user profile and the expiry.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return problemResponse(403, ErrorCode.Forbidden, 'Cross-site request rejected.');
  }

  let upstream: Response;
  try {
    upstream = await callUpstream(request, '/auth/login', {
      method: 'POST',
      body: await request.text(),
    });
  } catch (error) {
    return upstreamFailure(error);
  }

  if (!upstream.ok) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: pickHeaders(upstream, ['content-type', 'retry-after', 'x-request-id']),
    });
  }

  const parsed = LoginResponseSchema.safeParse(await upstream.json().catch(() => null));
  if (!parsed.success) {
    return problemResponse(
      502,
      ErrorCode.ServiceUnavailable,
      'Unexpected response from the server.',
    );
  }
  const { token, expiresAt, user } = parsed.data;
  const response = NextResponse.json({ user, expiresAt });
  response.cookies.set({ ...sessionCookieOptions(new Date(expiresAt)), value: token });
  return response;
}

function pickHeaders(response: Response, names: string[]): Headers {
  const headers = new Headers();
  for (const name of names) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}
