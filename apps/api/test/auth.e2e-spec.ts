import { ErrorCode } from '@pm/contracts';
import jwt from 'jsonwebtoken';

import { bearer, login } from './support/auth';
import { PASSWORD, seedWorld } from './support/fixtures';
import { createPrisma, createTestApp, TEST_JWT_SECRET, type TestApp } from './support/test-app';

describe('Authentication (e2e)', () => {
  let t: TestApp;
  const prisma = createPrisma();

  beforeAll(async () => {
    await seedWorld(prisma);
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
    await prisma.$disconnect();
  });

  describe('POST /auth/login', () => {
    it('returns the contract shape with a role claim and expiry', async () => {
      const res = await t
        .http()
        .post('/auth/login')
        .send({ email: 'Admin@Northwind.test ', password: PASSWORD })
        .expect(200);

      expect(res.body).toEqual({
        token: expect.any(String),
        expiresAt: expect.any(String),
        user: {
          id: expect.any(String),
          email: 'admin@northwind.test',
          name: 'admin',
          role: 'admin',
        },
      });
      const claims = jwt.decode((res.body as { token: string }).token) as Record<string, unknown>;
      expect(claims).toMatchObject({
        role: 'admin',
        email: 'admin@northwind.test',
        iss: 'patients-api',
        aud: 'patients-web',
      });
    });

    it.each([
      ['wrong password', 'admin@northwind.test', 'wrong-password'],
      ['unknown email', 'nobody@northwind.test', PASSWORD],
    ])('rejects a %s with the same generic 401', async (_, email, password) => {
      const res = await t.http().post('/auth/login').send({ email, password }).expect(401);
      expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
      expect(res.body).toMatchObject({
        status: 401,
        code: ErrorCode.InvalidCredentials,
        detail: 'Invalid email or password.',
      });
    });

    it('validates the body and reports field errors', async () => {
      const res = await t.http().post('/auth/login').send({ email: 'nope' }).expect(400);
      expect(res.body).toMatchObject({ code: ErrorCode.ValidationFailed });
      expect((res.body as { errors: { path: string }[] }).errors.map((e) => e.path)).toEqual([
        'email',
        'password',
      ]);
    });

    it('rejects malformed JSON as a 400 problem, not a 500', async () => {
      const res = await t
        .http()
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email":')
        .expect(400);
      expect(res.body).toMatchObject({ code: ErrorCode.BadRequest, requestId: expect.any(String) });
    });
  });

  describe('protected routes', () => {
    it('401s without a token and advertises the Bearer scheme', async () => {
      const res = await t.http().get('/patients').expect(401);
      expect(res.headers['www-authenticate']).toBe('Bearer');
      expect(res.body).toMatchObject({ code: ErrorCode.Unauthenticated, instance: '/patients' });
    });

    it('401s with TOKEN_EXPIRED for an expired token', async () => {
      const expired = jwt.sign(
        {
          sub: crypto.randomUUID(),
          email: 'a@b.test',
          name: 'A',
          role: 'admin',
          org: crypto.randomUUID(),
        },
        TEST_JWT_SECRET,
        { algorithm: 'HS256', expiresIn: -10, issuer: 'patients-api', audience: 'patients-web' },
      );
      const res = await t.http().get('/patients').set(bearer(expired)).expect(401);
      expect(res.body).toMatchObject({ code: ErrorCode.TokenExpired });
      expect(res.headers['www-authenticate']).toContain('invalid_token');
    });

    it.each([
      [
        'a forged signature',
        jwt.sign({ role: 'admin' }, 'some-other-secret-that-is-long-enough!!', { expiresIn: 60 }),
      ],
      [
        'the "none" algorithm',
        `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from('{"role":"admin"}').toString('base64url')}.`,
      ],
      ['garbage', 'not-a-jwt'],
    ])('401s for %s', async (_, token) => {
      const res = await t.http().get('/patients').set(bearer(token)).expect(401);
      expect(res.body).toMatchObject({ code: ErrorCode.Unauthenticated });
    });

    it('accepts the Bearer scheme case-insensitively (RFC 9110)', async () => {
      const token = await login(t, 'user@northwind.test');
      await t.http().get('/patients').set('Authorization', `bearer ${token}`).expect(200);
    });

    it('401s for a validly signed token with a malformed claim set', async () => {
      const token = jwt.sign({ sub: 'not-a-uuid', role: 'superuser' }, TEST_JWT_SECRET, {
        expiresIn: 60,
        issuer: 'patients-api',
        audience: 'patients-web',
      });
      await t.http().get('/patients').set(bearer(token)).expect(401);
    });

    it('accepts a fresh token', async () => {
      const token = await login(t, 'user@northwind.test');
      await t.http().get('/patients').set(bearer(token)).expect(200);
    });
  });

  describe('rate limiting', () => {
    it('limits attempts per account even when the attacker rotates X-Forwarded-For', async () => {
      const limited = await createTestApp({ THROTTLE_LOGIN_LIMIT: '3', TRUST_PROXY_HOPS: '1' });
      try {
        const attempt = (ip: string) =>
          limited
            .http()
            .post('/auth/login')
            .set('X-Forwarded-For', ip)
            .send({ email: 'admin@northwind.test', password: 'guess' });
        for (const ip of ['198.51.100.1', '198.51.100.2', '198.51.100.3'])
          await attempt(ip).expect(401);
        const res = await attempt('198.51.100.4').expect(429);
        expect(res.body).toMatchObject({ code: ErrorCode.RateLimited });
      } finally {
        await limited.close();
      }
    });

    it('throttles repeated login attempts with 429 RATE_LIMITED', async () => {
      const limited = await createTestApp({ THROTTLE_LOGIN_LIMIT: '3' });
      try {
        for (let i = 0; i < 3; i++) {
          await limited
            .http()
            .post('/auth/login')
            .send({ email: 'x@y.test', password: 'bad' })
            .expect(401);
        }
        const res = await limited
          .http()
          .post('/auth/login')
          .send({ email: 'x@y.test', password: 'bad' })
          .expect(429);
        expect(res.body).toMatchObject({ code: ErrorCode.RateLimited });
        expect(res.headers['retry-after']).toBeDefined();
      } finally {
        await limited.close();
      }
    });
  });
});
