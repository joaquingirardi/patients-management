import { safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  it.each(['/patients', '/patients/abc?x=1'])('allows same-origin path %s', (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  it.each([
    undefined,
    null,
    '',
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/\t/evil.test', // URL parsers strip tabs/newlines → "//evil.test"
    '/\n/evil.test',
    '/\t\\evil.test',
    'javascript:alert(1)',
    '/login',
    '/api/proxy/patients',
  ])('falls back to /patients for %j (open-redirect / loop protection)', (path) => {
    expect(safeRedirectPath(path)).toBe('/patients');
  });
});
