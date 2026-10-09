import { ageOn, formatDob, formatPhone, initials } from './format';

describe('formatting', () => {
  it('formats date-only values without timezone drift', () => {
    // Would render "Mar 3, 1990" in negative-offset zones if formatted in local time.
    expect(formatDob('1990-03-04')).toBe('Mar 4, 1990');
    expect(formatDob('2000-01-01')).toBe('Jan 1, 2000');
  });

  it('computes birthday-accurate ages', () => {
    expect(ageOn('1990-03-04', '2026-03-03')).toBe(35);
    expect(ageOn('1990-03-04', '2026-03-04')).toBe(36);
    expect(ageOn('2000-02-29', '2025-02-28')).toBe(24);
  });

  it('pretty-prints NANP numbers and leaves others in E.164', () => {
    expect(formatPhone('+14155550132')).toBe('+1 (415) 555-0132');
    expect(formatPhone('+442079460958')).toBe('+442079460958');
  });

  it('derives initials', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials('Cher')).toBe('C');
    expect(initials('Mary Jane Watson')).toBe('MW');
  });
});
