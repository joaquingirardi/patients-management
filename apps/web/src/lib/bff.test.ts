// @vitest-environment node
import { NextRequest } from 'next/server';

import { POST as login } from '@/app/api/auth/login/route';
import { DELETE as proxyDelete, GET as proxyGet } from '@/app/api/proxy/[...path]/route';

import { isSameOriginRequest, trustedClientIp } from './bff';

const request = (url: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
  new NextRequest(new URL(url, 'http://app.test'), {
    method: init.method ?? 'GET',
    headers: { host: 'app.test', ...init.headers },
  });

const params = (...path: string[]) => ({ params: Promise.resolve({ path }) });

describe('CSRF: isSameOriginRequest', () => {
  it.each([
    [{ 'sec-fetch-site': 'same-origin' }, true],
    [{ 'sec-fetch-site': 'cross-site' }, false],
    [{ 'sec-fetch-site': 'same-site' }, false],
    [{ origin: 'http://app.test' }, true],
    [{ origin: 'http://evil.test' }, false],
    [{}, false],
  ])('%j -> %s', (headers, expected) => {
    expect(isSameOriginRequest(request('/api/proxy/patients', { method: 'POST', headers }))).toBe(
      expected,
    );
  });
});

describe('trustedClientIp', () => {
  it('forwards nothing when no proxy is trusted (the header is client-controlled)', () => {
    expect(trustedClientIp('203.0.113.9', 0)).toBeUndefined();
  });

  it('takes the address appended by the Nth trusted hop, ignoring client-written entries', () => {
    expect(trustedClientIp('6.6.6.6, 203.0.113.9', 1)).toBe('203.0.113.9');
    expect(trustedClientIp('6.6.6.6, 203.0.113.9, 10.0.0.2', 2)).toBe('203.0.113.9');
  });
});

describe('BFF route handlers', () => {
  it('rejects a cross-site login attempt before contacting the API', async () => {
    const res = await login(
      request('/api/auth/login', { method: 'POST', headers: { origin: 'http://evil.test' } }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('is an allowlist, not an open relay', async () => {
    const res = await proxyGet(request('/api/proxy/health'), params('health'));
    expect(res.status).toBe(404);
    const traversal = await proxyGet(
      request('/api/proxy/patients/../auth/login'),
      params('patients', '..', 'auth', 'login'),
    );
    expect(traversal.status).toBe(404);
  });

  it('rejects cross-site mutations through the proxy', async () => {
    const res = await proxyDelete(
      request('/api/proxy/patients/00000000-0000-4000-8000-000000000000', {
        method: 'DELETE',
        headers: { 'sec-fetch-site': 'cross-site' },
      }),
      params('patients', '00000000-0000-4000-8000-000000000000'),
    );
    expect(res.status).toBe(403);
  });
});
