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

/*
 * The module's DTOs. Each one *is* a schema from @pm/contracts (ADR 0001): naming them here gives
 * the module the conventional Nest shape without creating a second source of truth. Every DTO is
 * both a runtime validator (the value, used by ZodValidationPipe) and a type (same name).
 */

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
