import { z } from 'zod';

import { isDateOnOrBefore, isValidCalendarDate, latestCalendarDateOnEarth, MIN_DOB } from './dates';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, paginated, SortOrderSchema } from './pagination';

/** Letters from any script, plus the separators real names contain (Anne-Marie, O'Brien, St. John). */
const PERSON_NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;

const MAX_INT4 = 2_147_483_647;

/** E.164: "+", a non-zero country code digit, and 8 to 15 digits in total. */
const E164 = /^\+[1-9]\d{7,14}$/;

const personName = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, { error: `${label} is required`, abort: true })
    .max(100, { error: `${label} must be at most 100 characters` })
    .regex(PERSON_NAME, {
      error: `${label} can only contain letters, spaces, apostrophes, dots and hyphens`,
    });

/** Accepts what people type ("+1 (415) 555-0132") and normalises it to E.164 ("+14155550132"). */
export const PhoneNumberSchema = z
  .string({ error: 'Phone number is required' })
  .trim()
  .min(1, { error: 'Phone number is required' })
  .transform((value) => value.replace(/[\s().-]/g, ''))
  .pipe(
    z.string().regex(E164, {
      error: 'Use international format with country code, e.g. +1 415 555 0132',
    }),
  );

export const DateOfBirthSchema = z
  .string({ error: 'Date of birth is required' })
  .min(1, { error: 'Date of birth is required', abort: true })
  .refine(isValidCalendarDate, { error: 'Enter a valid date (YYYY-MM-DD)', abort: true })
  .refine((value) => isDateOnOrBefore(MIN_DOB, value), {
    error: 'Date of birth must be on or after 1900-01-01',
  })
  .refine((value) => isDateOnOrBefore(value, latestCalendarDateOnEarth()), {
    error: 'Date of birth cannot be in the future',
  });

/** Body of `POST /patients`. The web form validates with the same schema. */
export const PatientInputSchema = z.object({
  firstName: personName('First name'),
  lastName: personName('Last name'),
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .min(1, { error: 'Email is required', abort: true })
    .max(254, { error: 'Email must be at most 254 characters', abort: true })
    .pipe(z.email({ error: 'Enter a valid email address' })),
  phoneNumber: PhoneNumberSchema,
  dob: DateOfBirthSchema,
});
export type PatientInput = z.output<typeof PatientInputSchema>;
export type PatientFormValues = z.input<typeof PatientInputSchema>;

/**
 * Body of `PUT /patients/:id`: a full replacement. `version` is optional so plain Patient bodies
 * stay valid. When present (the web app always sends the version it last saw), a stale value gets
 * `409 VERSION_CONFLICT` instead of overwriting someone else's edit. Capped at INT4 so out-of-range
 * values are a 400 rather than a database error.
 */
export const UpdatePatientSchema = PatientInputSchema.extend({
  version: z.int().positive().max(MAX_INT4).optional(),
});
export type UpdatePatientInput = z.output<typeof UpdatePatientSchema>;

export const PatientSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  dob: z.iso.date(),
  version: z.int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Patient = z.infer<typeof PatientSchema>;

export const PATIENT_SORT_FIELDS = ['lastName', 'firstName', 'dob', 'createdAt'] as const;
export const PatientSortFieldSchema = z.enum(PATIENT_SORT_FIELDS);
export type PatientSortField = z.infer<typeof PatientSortFieldSchema>;

// Deep offsets are expensive and nobody pages this far into a patient list.
const MAX_PAGE = 10_000;

/** Query string of `GET /patients`. Everything is optional with a default. */
export const ListPatientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z
    .string()
    .trim()
    .max(100)
    // Reject control characters; PostgreSQL errors on NUL in text.
    .regex(/^\P{Cc}*$/u, { error: 'Search contains invalid characters' })
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  sortBy: PatientSortFieldSchema.default('lastName'),
  order: SortOrderSchema.default('asc'),
});
export type ListPatientsQuery = z.output<typeof ListPatientsQuerySchema>;

export const PatientListSchema = paginated(PatientSchema);
export type PatientList = z.infer<typeof PatientListSchema>;

export const DeletePatientResponseSchema = z.object({ ok: z.literal(true) });
export type DeletePatientResponse = z.infer<typeof DeletePatientResponseSchema>;
