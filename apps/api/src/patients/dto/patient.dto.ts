import {
  type DeletePatientResponse,
  type ListPatientsQuery,
  ListPatientsQuerySchema,
  type Patient,
  type PatientInput,
  PatientInputSchema,
  type PatientList,
  type UpdatePatientInput,
  UpdatePatientSchema,
} from '@pm/contracts';
import { z } from 'zod';

// Each DTO is a schema from @pm/contracts (ADR 0001), re-exported under the usual Nest names.
// The value is the validator used by ZodValidationPipe; the type has the same name.

export const CreatePatientDto = PatientInputSchema;
export type CreatePatientDto = PatientInput;

export const UpdatePatientDto = UpdatePatientSchema;
export type UpdatePatientDto = UpdatePatientInput;

export const ListPatientsQueryDto = ListPatientsQuerySchema;
export type ListPatientsQueryDto = ListPatientsQuery;

export const PatientIdParam = z.uuid({ error: 'Must be a valid UUID' });

export type PatientResponseDto = Patient;
export type PatientListResponseDto = PatientList;
export type DeletePatientResponseDto = DeletePatientResponse;
