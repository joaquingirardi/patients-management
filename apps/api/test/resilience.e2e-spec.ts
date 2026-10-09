import { ErrorCode, type PatientList } from '@pm/contracts';

import { bearer, login } from './support/auth';
import { seedWorld } from './support/fixtures';
import { createPrisma, createTestApp, type TestApp } from './support/test-app';

/**
 * The database is made deliberately flaky (deterministically, via ChaosController) to prove the
 * retry policy end to end through the real HTTP stack.
 */
describe('Resilience against a flaky database (e2e)', () => {
  let t: TestApp;
  let auth: Record<string, string>;
  const prisma = createPrisma();

  beforeAll(async () => {
    await seedWorld(prisma);
    t = await createTestApp({ DB_RETRY_MAX_ATTEMPTS: '3' });
    auth = bearer(await login(t, 'admin@northwind.test'));
  });

  afterAll(async () => {
    await t.close();
    await prisma.$disconnect();
  });

  it('absorbs transient failures with retries — the client never notices', async () => {
    t.chaos.failNext(2);
    const res = await t.http().get('/patients').set(auth).expect(200);
    expect((res.body as PatientList).total).toBe(12);
    expect(t.chaos.attempts).toBeGreaterThanOrEqual(4); // 2 failed + findMany + count
  });

  it('retries writes that provably never reached the database', async () => {
    t.chaos.failNext(1);
    await t
      .http()
      .post('/patients')
      .set(auth)
      .send({
        firstName: 'Retry',
        lastName: 'Safe',
        email: 'r@example.com',
        phoneNumber: '+14155550100',
        dob: '1990-01-01',
      })
      .expect(201);
    expect(await prisma.patient.count({ where: { lastName: 'Safe' } })).toBe(1);
  });

  it('degrades to 503 + Retry-After once the retry budget is exhausted', async () => {
    t.chaos.failNext(1_000);
    const res = await t.http().get('/patients').set(auth).expect(503);
    expect(res.headers['retry-after']).toBe('1');
    expect(res.body).toMatchObject({
      code: ErrorCode.ServiceUnavailable,
      requestId: expect.any(String),
    });
    t.chaos.failNext(0);
  });

  it('keeps health probes independent of chaos', async () => {
    t.chaos.failNext(1_000);
    await t.http().get('/health').expect(200);
    t.chaos.failNext(0);
  });

  it('echoes a caller-supplied request id for log correlation', async () => {
    const res = await t
      .http()
      .get('/patients')
      .set(auth)
      .set('X-Request-Id', 'trace-12345678')
      .expect(200);
    expect(res.headers['x-request-id']).toBe('trace-12345678');
  });
});
