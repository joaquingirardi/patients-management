/**
 * Date of birth is a calendar date, not an instant. It travels as `YYYY-MM-DD` and is stored
 * as a Postgres `DATE`, so it can't shift by a day because of a timezone conversion.
 */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MIN_DOB = '1900-01-01';

export function isValidCalendarDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * The latest calendar date currently observed anywhere on Earth (UTC+14, Line Islands).
 * Checking "not in the future" against this rather than the server's UTC date means a patient
 * born "today" in Auckland isn't rejected by a server running in UTC.
 */
export function latestCalendarDateOnEarth(now: Date = new Date()): string {
  const UTC_PLUS_14_MS = 14 * 60 * 60 * 1000;
  return new Date(now.getTime() + UTC_PLUS_14_MS).toISOString().slice(0, 10);
}

// `YYYY-MM-DD` strings sort lexicographically, so string comparison works.
export function isDateOnOrBefore(value: string, limit: string): boolean {
  return value <= limit;
}
