import { isExpired, readClaims } from './claims';

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = (claims: object) =>
  `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}.signature`;

const valid = {
  sub: '11111111-1111-4111-8111-111111111111',
  org: '22222222-2222-4222-8222-222222222222',
  email: 'admin@northwind.test',
  name: 'Maya Chen',
  role: 'admin',
  iat: 1_700_000_000,
  exp: 1_700_001_800,
};

describe('readClaims', () => {
  it('decodes a well-formed token', () => {
    expect(readClaims(token(valid))).toMatchObject({
      role: 'admin',
      email: 'admin@northwind.test',
    });
  });

  it.each([
    ['missing', undefined],
    ['garbage', 'not-a-jwt'],
    ['unknown role', token({ ...valid, role: 'superuser' })],
    ['missing exp', token({ ...valid, exp: undefined })],
  ])('rejects a %s token', (_, value) => {
    expect(readClaims(value)).toBeNull();
  });
});

describe('isExpired', () => {
  const now = valid.exp * 1000;
  it('treats tokens within the clock-skew window as expired', () => {
    expect(isExpired(valid, now - 3_000)).toBe(true);
    expect(isExpired(valid, now - 60_000)).toBe(false);
  });
});
