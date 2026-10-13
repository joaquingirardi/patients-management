import { type Patient } from '@pm/contracts';

export const fullName = (p: Pick<Patient, 'firstName' | 'lastName'>) =>
  `${p.firstName} ${p.lastName}`;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/**
 * Date-only values are formatted in UTC: `new Date('1990-03-04')` is UTC midnight,
 * and formatting it in a negative-offset local timezone would show March 3rd.
 */
const dobFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export const formatDob = (dob: string) => dobFormatter.format(new Date(`${dob}T00:00:00Z`));

/** Completed years between `dob` and `today` (both `YYYY-MM-DD`), birthday-accurate. */
export function ageOn(dob: string, today: string = localToday()): number {
  const [by, bm, bd] = dob.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number];
  const hadBirthday = tm > bm || (tm === bm && td >= bd);
  return ty - by - (hadBirthday ? 0 : 1);
}

/** Today's date in the user's timezone, as `YYYY-MM-DD` (for input max= and age). */
export function localToday(now = new Date()): string {
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** Formats an E.164 number for display; NANP numbers become (415) 555-0132. */
export function formatPhone(e164: string): string {
  const nanp = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (nanp) return `+1 (${nanp[1] ?? ''}) ${nanp[2] ?? ''}-${nanp[3] ?? ''}`;
  return e164;
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
