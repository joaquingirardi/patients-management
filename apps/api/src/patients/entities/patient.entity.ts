import { type Patient } from '@pm/contracts';
import { type Patient as PatientRow } from '@prisma/client';

/**
 * The persistence entity is the Prisma model (`prisma/schema.prisma`). This file defines the
 * slice of it the module works with, and the mapping to the public representation.
 */

/** Columns ever sent to clients. Audit and tenancy columns stay server-side. */
export const PATIENT_PUBLIC_FIELDS = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  dob: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PatientEntity = Pick<PatientRow, keyof typeof PATIENT_PUBLIC_FIELDS>;

/** `DATE` columns come back as UTC-midnight instants; emit them as plain `YYYY-MM-DD`. */
export const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);
export const fromDateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function toPatientResponse(record: PatientEntity): Patient {
  return {
    ...record,
    dob: toDateOnly(record.dob),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
