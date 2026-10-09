import 'server-only';

import { ErrorCode, type ProblemDetails } from '@pm/contracts';
import { type NextRequest, NextResponse } from 'next/server';

import { env } from './env';
import { SESSION_COOKIE } from './session/claims';

/** Upper bound for any upstream call; the API's own retries fit comfortably inside it. */
const UPSTREAM_TIMEOUT_MS = 15_000;

export function problemResponse(status: number, code: ErrorCode, detail: string): NextResponse {
  const body: ProblemDetails = {
    type: `urn:pm:problem:${code.toLowerCase().replace(/_/g, '-')}`,
    title: detail,
    status,
    code,
    detail,
  };
  return NextResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

/**
 * CSRF defence for cookie-authenticated, state-changing requests. The session cookie is
 * SameSite=Lax already; on top of that we require the browser to assert same-origin via
 * Fetch Metadata (`Sec-Fetch-Site`) or, for older browsers, a matching `Origin` host.
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * The client address as reported by our *own* trusted proxies. Each trusted hop appends the
 * address it saw, so with N trusted hops the real client is the Nth entry from the right;
 * anything further left was written by the client and is ignored. With no trusted proxy the
 * header is entirely client-controlled, so nothing is forwarded — the API then rate-limits on
 * the BFF's address plus, for logins, the target account (see the API's throttler config).
 */
export function trustedClientIp(
  forwardedFor: string | null,
  trustedHops: number,
): string | undefined {
  if (!forwardedFor || trustedHops < 1) return undefined;
  const hops = forwardedFor
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return hops.at(-trustedHops);
}

/** Calls the API, forwarding the caller's IP (for rate limiting) and a correlation id. */
export async function callUpstream(
  request: NextRequest,
  path: string,
  init: { method: string; token?: string; body?: string },
): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' });
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`);
  headers.set('X-Request-Id', request.headers.get('x-request-id') ?? crypto.randomUUID());
  const clientIp = trustedClientIp(request.headers.get('x-forwarded-for'), env.TRUSTED_PROXY_HOPS);
  if (clientIp) headers.set('X-Forwarded-For', clientIp);

  return fetch(new URL(path, env.API_URL), {
    method: init.method,
    headers,
    body: init.body,
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

export function upstreamFailure(error: unknown): NextResponse {
  const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
  return problemResponse(
    timedOut ? 504 : 502,
    ErrorCode.ServiceUnavailable,
    timedOut
      ? 'The server took too long to respond. Please try again.'
      : 'The server is unreachable right now. Please try again shortly.',
  );
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}
