// @vitest-environment node
import { NextRequest } from 'next/server';

import { proxy } from './proxy';

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = (exp: number) =>
  `${encode({ alg: 'HS256' })}.${encode({
    sub: '11111111-1111-4111-8111-111111111111',
    org: '22222222-2222-4222-8222-222222222222',
    email: 'a@b.test',
    name: 'A',
    role: 'admin',
    iat: 0,
    exp,
  })}.sig`;

const visit = (path: string, cookie?: string) =>
  proxy(
    new NextRequest(new URL(path, 'http://app.test'), {
      headers: cookie ? { cookie: `pm_session=${cookie}` } : {},
    }),
  );

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;

describe('route protection (proxy.ts)', () => {
  it('sends anonymous visitors to login, remembering where they were going', () => {
    const res = visit('/patients?search=ada');
    expect(res.headers.get('location')).toBe(
      'http://app.test/login?next=%2Fpatients%3Fsearch%3Dada',
    );
  });

  it('explains an expired session and clears the dead cookie', () => {
    const res = visit('/patients', token(1));
    expect(res.headers.get('location')).toContain('reason=expired');
    expect(res.headers.get('set-cookie')).toMatch(/pm_session=;/);
  });

  it('lets a valid session through and bounces it away from the login page', () => {
    expect(visit('/patients', token(inOneHour())).headers.get('location')).toBeNull();
    expect(visit('/login', token(inOneHour())).headers.get('location')).toBe(
      'http://app.test/patients',
    );
  });
});
