import { ErrorCode, type Patient, type PatientList } from '@pm/contracts';

import { bearer, login } from './support/auth';
import { type SeededWorld, seedWorld } from './support/fixtures';
import { createPrisma, createTestApp, type TestApp } from './support/test-app';

const newPatient = {
  firstName: 'Hedy',
  lastName: 'Lamarr',
  email: 'Hedy@Example.com',
  phoneNumber: '+43 1 234 5678',
  dob: '1914-11-09',
};

describe('Patients (e2e)', () => {
  let t: TestApp;
  let world: SeededWorld;
  let admin: Record<string, string>;
  let user: Record<string, string>;
  let foreignAdmin: Record<string, string>;
  const prisma = createPrisma();

  beforeAll(async () => {
    world = await seedWorld(prisma);
    t = await createTestApp();
    admin = bearer(await login(t, world.northwind.adminEmail));
    user = bearer(await login(t, world.northwind.userEmail));
    foreignAdmin = bearer(await login(t, world.contoso.adminEmail));
  });

  afterAll(async () => {
    await t.close();
    await prisma.$disconnect();
  });

  const list = async (query: Record<string, string | number>, auth = user) =>
    (await t.http().get('/patients').query(query).set(auth).expect(200)).body as PatientList;

  describe('GET /patients', () => {
    it('returns the paginated envelope, sorted by last name by default', async () => {
      const body = await list({});
      expect(body).toMatchObject({ page: 1, limit: 10, total: 12 });
      expect(body.data).toHaveLength(10);
      const names = body.data.map((p) => p.lastName);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
      expect(Object.keys(body.data[0] ?? {}).sort()).toEqual(
        [
          'createdAt',
          'dob',
          'email',
          'firstName',
          'id',
          'lastName',
          'phoneNumber',
          'updatedAt',
          'version',
        ].sort(),
      );
    });

    it('paginates without overlaps or gaps', async () => {
      const first = await list({ limit: 5, page: 1 });
      const second = await list({ limit: 5, page: 2 });
      const third = await list({ limit: 5, page: 3 });
      const ids = [...first.data, ...second.data, ...third.data].map((p) => p.id);
      expect(new Set(ids).size).toBe(12);
      expect(third.data).toHaveLength(2);
    });

    it('sorts by date of birth in both directions', async () => {
      const asc = (await list({ sortBy: 'dob', order: 'asc', limit: 100 })).data.map((p) => p.dob);
      const desc = (await list({ sortBy: 'dob', order: 'desc', limit: 100 })).data.map(
        (p) => p.dob,
      );
      expect(asc).toEqual([...asc].sort());
      expect(desc).toEqual([...asc].reverse());
    });

    it('searches case-insensitively across name and email, all terms must match', async () => {
      expect((await list({ search: 'HOPPER' })).data.map((p) => p.firstName).sort()).toEqual([
        'Grace',
        'John',
      ]);
      expect((await list({ search: 'grace hop' })).data.map((p) => p.firstName)).toEqual(['Grace']);
      expect((await list({ search: 'linus@' })).data.map((p) => p.lastName)).toEqual(['Torvalds']);
      expect((await list({ search: 'zzz' })).total).toBe(0);
    });

    it('rejects control characters in search instead of failing in the database', async () => {
      const res = await t
        .http()
        .get('/patients')
        .query({ search: 'ada\u0000' })
        .set(user)
        .expect(400);
      expect(res.body).toMatchObject({
        code: ErrorCode.ValidationFailed,
        errors: [{ path: 'search' }],
      });
    });

    it('rejects invalid query parameters with field errors', async () => {
      const res = await t
        .http()
        .get('/patients')
        .query({ sortBy: 'password', limit: 1000 })
        .set(user)
        .expect(400);
      expect((res.body as { errors: { path: string }[] }).errors.map((e) => e.path).sort()).toEqual(
        ['limit', 'sortBy'],
      );
    });

    it('never shows another tenant’s patients', async () => {
      const ids = (await list({ limit: 100 })).data.map((p) => p.id);
      expect(ids).not.toContain(world.foreignPatientId);
      expect((await list({}, foreignAdmin)).total).toBe(1);
    });
  });

  describe('GET /patients/:id', () => {
    it('returns the full record with a date-only dob', async () => {
      const target = world.patients[0];
      const res = await t
        .http()
        .get(`/patients/${target?.id ?? ''}`)
        .set(user)
        .expect(200);
      expect(res.body).toMatchObject({ id: target?.id, dob: target?.dob, version: 1 });
    });

    it('404s (not 403) for another tenant’s patient — existence is not leaked', async () => {
      const res = await t.http().get(`/patients/${world.foreignPatientId}`).set(admin).expect(404);
      expect(res.body).toMatchObject({ code: ErrorCode.NotFound });
    });

    it('400s for a malformed id', async () => {
      const res = await t.http().get('/patients/not-a-uuid').set(user).expect(400);
      expect(res.body).toMatchObject({
        code: ErrorCode.ValidationFailed,
        errors: [{ path: 'id' }],
      });
    });
  });

  describe('role-based access', () => {
    it.each([
      ['POST', () => t.http().post('/patients').send(newPatient)],
      [
        'PUT',
        () =>
          t
            .http()
            .put(`/patients/${world.patients[1]?.id ?? ''}`)
            .send({ ...newPatient, version: 1 }),
      ],
      ['DELETE', () => t.http().delete(`/patients/${world.patients[1]?.id ?? ''}`)],
    ])('%s is 403 for the read-only user role', async (_, call) => {
      const res = await call().set(user).expect(403);
      expect(res.body).toMatchObject({ code: ErrorCode.Forbidden });
    });
  });

  describe('admin lifecycle: create → read → update → conflict → delete', () => {
    let created: Patient;

    it('POST creates, normalises input and returns 201 with Location', async () => {
      const res = await t
        .http()
        .post('/patients')
        .set(admin)
        .send({ ...newPatient, organizationId: world.contoso.id })
        .expect(201);
      created = res.body as Patient;
      expect(res.headers['location']).toBe(`/patients/${created.id}`);
      expect(created).toMatchObject({
        email: 'hedy@example.com',
        phoneNumber: '+4312345678',
        version: 1,
      });

      // Mass assignment is impossible: the record landed in the admin's own tenant.
      const row = await prisma.patient.findUniqueOrThrow({ where: { id: created.id } });
      expect(row.organizationId).toBe(world.northwind.id);
    });

    it('POST validates every field', async () => {
      const res = await t
        .http()
        .post('/patients')
        .set(admin)
        .send({ firstName: '', email: 'x', dob: '2999-01-01' })
        .expect(400);
      expect((res.body as { errors: { path: string }[] }).errors.map((e) => e.path).sort()).toEqual(
        ['dob', 'email', 'firstName', 'lastName', 'phoneNumber'].sort(),
      );
    });

    it('PUT replaces the record and bumps the version', async () => {
      const res = await t
        .http()
        .put(`/patients/${created.id}`)
        .set(admin)
        .send({ ...newPatient, lastName: 'Kiesler', version: 1 })
        .expect(200);
      expect(res.body).toMatchObject({ lastName: 'Kiesler', version: 2 });
    });

    it('PUT with a stale version is a 409 and changes nothing', async () => {
      const res = await t
        .http()
        .put(`/patients/${created.id}`)
        .set(admin)
        .send({ ...newPatient, lastName: 'Stale', version: 1 })
        .expect(409);
      expect(res.body).toMatchObject({ code: ErrorCode.VersionConflict });
      const current = await t.http().get(`/patients/${created.id}`).set(admin).expect(200);
      expect(current.body).toMatchObject({ lastName: 'Kiesler', version: 2 });
    });

    it('PUT accepts a plain contract Patient body (no version) as an unconditional replace', async () => {
      const res = await t
        .http()
        .put(`/patients/${created.id}`)
        .set(admin)
        .send({ ...newPatient, lastName: 'Kiesler' })
        .expect(200);
      expect(res.body).toMatchObject({ lastName: 'Kiesler', version: 3 });
    });

    it('PUT rejects a version outside the INT4 range as a 400, not a driver error', async () => {
      const res = await t
        .http()
        .put(`/patients/${created.id}`)
        .set(admin)
        .send({ ...newPatient, version: 3_000_000_000 })
        .expect(400);
      expect(res.body).toMatchObject({ errors: [{ path: 'version' }] });
    });

    it('PUT/DELETE on another tenant’s patient are 404', async () => {
      await t
        .http()
        .put(`/patients/${world.foreignPatientId}`)
        .set(admin)
        .send({ ...newPatient, version: 1 })
        .expect(404);
      await t.http().delete(`/patients/${world.foreignPatientId}`).set(admin).expect(404);
    });

    it('concurrent PUTs with the same version: exactly one wins, the other gets 409', async () => {
      const current = (await t.http().get(`/patients/${created.id}`).set(admin).expect(200))
        .body as Patient;
      const [a, b] = await Promise.all([
        t
          .http()
          .put(`/patients/${created.id}`)
          .set(admin)
          .send({ ...newPatient, lastName: 'RaceA', version: current.version }),
        t
          .http()
          .put(`/patients/${created.id}`)
          .set(admin)
          .send({ ...newPatient, lastName: 'RaceB', version: current.version }),
      ]);
      expect([a.status, b.status].sort()).toEqual([200, 409]);
    });

    it('DELETE soft-deletes: { ok: true }, then 404 everywhere, but the row is retained', async () => {
      await t.http().delete(`/patients/${created.id}`).set(admin).expect(200, { ok: true });
      await t.http().get(`/patients/${created.id}`).set(admin).expect(404);
      await t.http().delete(`/patients/${created.id}`).set(admin).expect(404);
      expect((await list({ search: 'Kiesler' }, admin)).total).toBe(0);

      const row = await prisma.patient.findUniqueOrThrow({ where: { id: created.id } });
      expect(row.deletedAt).not.toBeNull();
      expect(row.deletedById).not.toBeNull();
    });

    it('PUT on a soft-deleted patient is 404 (gone), never 409 (stale)', async () => {
      const row = await prisma.patient.findUniqueOrThrow({ where: { id: created.id } });
      const res = await t
        .http()
        .put(`/patients/${created.id}`)
        .set(admin)
        .send({ ...newPatient, version: row.version })
        .expect(404);
      expect(res.body).toMatchObject({ code: ErrorCode.NotFound });
    });
  });

  it('marks patient data as non-cacheable (PHI)', async () => {
    const res = await t.http().get('/patients').set(user).expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('serves the OpenAPI document generated from the contract, without auth', async () => {
    const res = await t.http().get('/docs/openapi.json').expect(200);
    expect(Object.keys((res.body as { paths: object }).paths)).toEqual(
      expect.arrayContaining(['/auth/login', '/patients', '/patients/{id}']),
    );
  });

  it('answers unknown routes with a problem document', async () => {
    const res = await t.http().get('/nope').set(user).expect(404);
    expect(res.headers['content-type']).toMatch(/problem\+json/);
  });
});
