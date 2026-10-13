import {
  DeletePatientResponseSchema,
  ErrorCode,
  ListPatientsQuerySchema,
  LoginRequestSchema,
  LoginResponseSchema,
  PatientInputSchema,
  PatientListSchema,
  PatientSchema,
  ProblemDetailsSchema,
  UpdatePatientSchema,
} from '@pm/contracts';
import { z } from 'zod';

/**
 * Generated from the same Zod schemas in @pm/contracts that the API validates with. Request
 * bodies are described as clients send them (`io: 'input'`), responses as returned.
 */
type JsonSchema = Record<string, unknown>;

const toSchema = (schema: z.ZodType, io: 'input' | 'output'): JsonSchema =>
  z.toJSONSchema(schema, { target: 'openapi-3.0', io, unrepresentable: 'any' });

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: JsonSchema) => ({ content: { 'application/json': { schema } } });

const problem = (description: string, ...codes: ErrorCode[]) => ({
  description: `${description} (\`code\`: ${codes.map((c) => `\`${c}\``).join(', ')})`,
  content: { 'application/problem+json': { schema: ref('ProblemDetails') } },
});

const COMMON_ERRORS = {
  401: problem(
    'Missing, invalid or expired token',
    ErrorCode.Unauthenticated,
    ErrorCode.TokenExpired,
  ),
  429: problem('Rate limited (see Retry-After)', ErrorCode.RateLimited),
  503: problem(
    'Database unavailable after retries (Retry-After), or a write whose outcome is unknown',
    ErrorCode.ServiceUnavailable,
    ErrorCode.OutcomeUnknown,
  ),
};
const READ_ERRORS = { ...COMMON_ERRORS, 403: problem('Lacks patients:read', ErrorCode.Forbidden) };
const WRITE_ERRORS = {
  ...COMMON_ERRORS,
  403: problem('Lacks patients:write (admin only)', ErrorCode.Forbidden),
};
const VALIDATION = problem('Invalid input (per-field `errors`)', ErrorCode.ValidationFailed);
const NOT_FOUND = problem(
  'No such patient in your organization (or soft-deleted)',
  ErrorCode.NotFound,
);

const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};

const listParameters = Object.entries(
  (toSchema(ListPatientsQuerySchema, 'input')['properties'] ?? {}) as Record<string, JsonSchema>,
).map(([name, schema]) => ({ name, in: 'query', required: false, schema }));

export function buildOpenApiDocument() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Patients Management API',
      version: '1.0.0',
      description:
        'Role-aware patient records. All errors are RFC 9457 Problem Details with a stable `code` and a `requestId`. ' +
        "Patients are scoped to the caller's organization: other tenants' records are indistinguishable from missing ones (404).",
    },
    tags: [{ name: 'auth' }, { name: 'patients' }, { name: 'health' }],
    security: [{ bearer: [] }],
    components: {
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        LoginRequest: toSchema(LoginRequestSchema, 'input'),
        LoginResponse: toSchema(LoginResponseSchema, 'output'),
        PatientInput: toSchema(PatientInputSchema, 'input'),
        UpdatePatient: toSchema(UpdatePatientSchema, 'input'),
        Patient: toSchema(PatientSchema, 'output'),
        PatientList: toSchema(PatientListSchema, 'output'),
        DeletePatientResponse: toSchema(DeletePatientResponseSchema, 'output'),
        ProblemDetails: toSchema(ProblemDetailsSchema, 'output'),
      },
    },
    paths: {
      '/auth/login': {
        post: {
          tags: ['auth'],
          summary: 'Exchange credentials for a JWT (role claim: admin | user)',
          security: [],
          requestBody: { required: true, ...json(ref('LoginRequest')) },
          responses: {
            200: { description: 'Signed in', ...json(ref('LoginResponse')) },
            400: VALIDATION,
            401: problem('Wrong email or password', ErrorCode.InvalidCredentials),
            429: COMMON_ERRORS[429],
          },
        },
      },
      '/patients': {
        get: {
          tags: ['patients'],
          summary: 'Search, sort and paginate patients',
          parameters: listParameters,
          responses: {
            200: { description: 'A page of patients', ...json(ref('PatientList')) },
            400: VALIDATION,
            ...READ_ERRORS,
          },
        },
        post: {
          tags: ['patients'],
          summary: 'Create a patient (admin)',
          requestBody: { required: true, ...json(ref('PatientInput')) },
          responses: {
            201: {
              description: 'Created (Location header points at the new resource)',
              ...json(ref('Patient')),
            },
            400: VALIDATION,
            ...WRITE_ERRORS,
          },
        },
      },
      '/patients/{id}': {
        parameters: [idParameter],
        get: {
          tags: ['patients'],
          summary: 'Get one patient',
          responses: {
            200: { description: 'The patient', ...json(ref('Patient')) },
            400: VALIDATION,
            404: NOT_FOUND,
            ...READ_ERRORS,
          },
        },
        put: {
          tags: ['patients'],
          summary: 'Replace a patient (admin). Send `version` for lost-update protection.',
          requestBody: { required: true, ...json(ref('UpdatePatient')) },
          responses: {
            200: { description: 'Updated (version incremented)', ...json(ref('Patient')) },
            400: VALIDATION,
            404: NOT_FOUND,
            409: problem('`version` is stale: someone else saved first', ErrorCode.VersionConflict),
            ...WRITE_ERRORS,
          },
        },
        delete: {
          tags: ['patients'],
          summary: 'Delete a patient (admin; soft delete, record retained)',
          responses: {
            200: { description: 'Deleted', ...json(ref('DeletePatientResponse')) },
            400: VALIDATION,
            404: NOT_FOUND,
            ...WRITE_ERRORS,
          },
        },
      },
      '/health': {
        get: {
          tags: ['health'],
          summary: 'Readiness (database reachable)',
          security: [],
          responses: { 200: { description: 'Ready' }, 503: { description: 'Not ready' } },
        },
      },
      '/health/live': {
        get: {
          tags: ['health'],
          summary: 'Liveness',
          security: [],
          responses: { 200: { description: 'Alive' } },
        },
      },
    },
  };
}
