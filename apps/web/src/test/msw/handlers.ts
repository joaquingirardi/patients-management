import {
  ErrorCode,
  ListPatientsQuerySchema,
  type Patient,
  PatientInputSchema,
  UpdatePatientSchema,
} from '@pm/contracts';
import { http, HttpResponse } from 'msw';

import { makePatients } from '../fixtures';

/** In-memory fake of the API behind the BFF proxy, honouring the real contract. */
export const db = { patients: makePatients() };

export function resetDb(patients = makePatients()): void {
  db.patients = patients;
}

const problem = (status: number, code: string, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: detail, status, code, detail, requestId: 'req-test-123' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

export const notFound = () => problem(404, ErrorCode.NotFound, 'Patient not found.');
export const unavailable = () =>
  problem(503, ErrorCode.ServiceUnavailable, 'The service is temporarily unavailable.');

const BASE = '*/api/proxy/patients';

export const handlers = [
  http.get(BASE, ({ request }) => {
    const query = ListPatientsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const terms = query.search?.toLowerCase().split(/\s+/) ?? [];
    const matches = db.patients.filter((p) =>
      terms.every((t) =>
        [p.firstName, p.lastName, p.email].some((f) => f.toLowerCase().includes(t)),
      ),
    );
    const direction = query.order === 'asc' ? 1 : -1;
    matches.sort((a, b) => direction * a[query.sortBy].localeCompare(b[query.sortBy]));
    const start = (query.page - 1) * query.limit;
    return HttpResponse.json({
      data: matches.slice(start, start + query.limit),
      page: query.page,
      limit: query.limit,
      total: matches.length,
    });
  }),

  http.get(`${BASE}/:id`, ({ params }) => {
    const patient = db.patients.find((p) => p.id === params['id']);
    return patient ? HttpResponse.json(patient) : notFound();
  }),

  http.post(BASE, async ({ request }) => {
    const input = PatientInputSchema.parse(await request.json());
    const now = new Date().toISOString();
    const patient: Patient = {
      ...input,
      id: crypto.randomUUID(),
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    db.patients.push(patient);
    return HttpResponse.json(patient, { status: 201 });
  }),

  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const { version, ...input } = UpdatePatientSchema.parse(await request.json());
    const index = db.patients.findIndex((p) => p.id === params['id']);
    const current = db.patients[index];
    if (!current) return notFound();
    if (current.version !== version)
      return problem(409, ErrorCode.VersionConflict, 'Modified by someone else.');
    const updated = {
      ...current,
      ...input,
      version: version + 1,
      updatedAt: new Date().toISOString(),
    };
    db.patients[index] = updated;
    return HttpResponse.json(updated);
  }),

  http.delete(`${BASE}/:id`, ({ params }) => {
    const before = db.patients.length;
    db.patients = db.patients.filter((p) => p.id !== params['id']);
    return before === db.patients.length ? notFound() : HttpResponse.json({ ok: true });
  }),
];
