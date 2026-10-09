import {
  DeletePatientResponseSchema,
  type ListPatientsQuery,
  type PatientInput,
  PatientListSchema,
  PatientSchema,
  type UpdatePatientInput,
} from '@pm/contracts';

import { apiRequest } from '@/lib/api/client';

export const patientsApi = {
  list: (query: ListPatientsQuery, signal?: AbortSignal) =>
    apiRequest('patients', { query, schema: PatientListSchema, signal }),

  get: (id: string, signal?: AbortSignal) =>
    apiRequest(`patients/${id}`, { schema: PatientSchema, signal }),

  create: (input: PatientInput) =>
    apiRequest('patients', { method: 'POST', body: input, schema: PatientSchema }),

  update: (id: string, input: UpdatePatientInput) =>
    apiRequest(`patients/${id}`, { method: 'PUT', body: input, schema: PatientSchema }),

  remove: (id: string) =>
    apiRequest(`patients/${id}`, { method: 'DELETE', schema: DeletePatientResponseSchema }),
};
