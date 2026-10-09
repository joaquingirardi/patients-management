import { describe, expect, it } from 'vitest';

import { latestCalendarDateOnEarth } from './dates';
import { ListPatientsQuerySchema, PatientInputSchema, UpdatePatientSchema } from './patients';
import { hasPermission, Permission } from './permissions';

const valid = {
  firstName: '  Ada ',
  lastName: "O'Brien-Lovelace",
  email: ' Ada@Example.COM ',
  phoneNumber: '+1 (415) 555-0132',
  dob: '1990-02-28',
};

describe('PatientInputSchema', () => {
  it('normalises human input into canonical values', () => {
    expect(PatientInputSchema.parse(valid)).toEqual({
      firstName: 'Ada',
      lastName: "O'Brien-Lovelace",
      email: 'ada@example.com',
      phoneNumber: '+14155550132',
      dob: '1990-02-28',
    });
  });

  it('accepts non-latin names', () => {
    expect(
      PatientInputSchema.safeParse({ ...valid, firstName: 'José', lastName: '김' }).success,
    ).toBe(true);
  });

  it.each([
    ['firstName', '   ', 'First name is required'],
    [
      'firstName',
      'R2D2',
      'First name can only contain letters, spaces, apostrophes, dots and hyphens',
    ],
    ['email', 'not-an-email', 'Enter a valid email address'],
    ['phoneNumber', '555-0132', 'Use international format with country code, e.g. +1 415 555 0132'],
    ['dob', '2023-02-30', 'Enter a valid date (YYYY-MM-DD)'],
    ['dob', '1899-12-31', 'Date of birth must be on or after 1900-01-01'],
    ['dob', '9999-01-01', 'Date of birth cannot be in the future'],
  ])('rejects invalid %s (%j)', (field, value, message) => {
    const result = PatientInputSchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: [field], message });
  });

  it('accepts a birth "today" in the most advanced timezone', () => {
    const today = latestCalendarDateOnEarth();
    expect(PatientInputSchema.safeParse({ ...valid, dob: today }).success).toBe(true);
  });
});

describe('ListPatientsQuerySchema', () => {
  it('applies defaults', () => {
    expect(ListPatientsQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      search: undefined,
      sortBy: 'lastName',
      order: 'asc',
    });
  });

  it('coerces query-string numbers and drops empty search', () => {
    expect(ListPatientsQuerySchema.parse({ page: '3', limit: '50', search: '  ' })).toMatchObject({
      page: 3,
      limit: 50,
      search: undefined,
    });
  });

  it('rejects control characters in search and out-of-range pages', () => {
    expect(ListPatientsQuerySchema.safeParse({ search: 'ada\u0000' }).success).toBe(false);
    expect(ListPatientsQuerySchema.safeParse({ page: '10001' }).success).toBe(false);
  });

  it('rejects unknown sort fields and oversized pages', () => {
    expect(ListPatientsQuerySchema.safeParse({ sortBy: 'passwordHash' }).success).toBe(false);
    expect(ListPatientsQuerySchema.safeParse({ limit: '1000' }).success).toBe(false);
  });
});

describe('permissions', () => {
  it('lets admins write and users only read', () => {
    expect(hasPermission('admin', Permission.PatientsWrite)).toBe(true);
    expect(hasPermission('user', Permission.PatientsRead)).toBe(true);
    expect(hasPermission('user', Permission.PatientsWrite)).toBe(false);
  });
});

describe('UpdatePatientSchema', () => {
  it('bounds version to the INT4 column range', () => {
    expect(UpdatePatientSchema.safeParse({ ...valid, version: 2_147_483_647 }).success).toBe(true);
    expect(UpdatePatientSchema.safeParse({ ...valid, version: 3_000_000_000 }).success).toBe(false);
  });
});

describe('error reporting', () => {
  it('reports exactly one message per invalid field', () => {
    const result = PatientInputSchema.safeParse({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      dob: '',
    });
    const paths = result.error?.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(['firstName', 'lastName', 'email', 'phoneNumber', 'dob']);
  });
});
