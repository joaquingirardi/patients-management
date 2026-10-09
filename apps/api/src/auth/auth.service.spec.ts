import { ErrorCode } from '@pm/contracts';

import { UnauthenticatedError } from '../common/errors/domain-errors';
import { type UsersRepository } from '../users/users.repository';
import { type AccessTokenService } from './access-token.service';
import { AuthService } from './auth.service';
import { type PasswordHasher } from './password-hasher';

const user = {
  id: '6f1c3c1e-4d5b-4a8e-9b1a-2f0f5f0e9a11',
  organizationId: '0b8f8f62-0d0b-4d55-8a6c-8f1e0c7d2a10',
  email: 'admin@northwind.test',
  name: 'Maya Chen',
  role: 'admin' as const,
  passwordHash: 'hash',
};

function setup({ found = true, valid = true } = {}) {
  const users = { findByEmail: jest.fn().mockResolvedValue(found ? user : null) };
  const hasher = { verify: jest.fn().mockResolvedValue(valid) };
  const tokens = {
    issue: jest
      .fn()
      .mockResolvedValue({ token: 'jwt', expiresAt: new Date('2030-01-01T00:00:00Z') }),
  };
  const service = new AuthService(
    users as unknown as UsersRepository,
    hasher as unknown as PasswordHasher,
    tokens as unknown as AccessTokenService,
  );
  return { service, users, hasher, tokens };
}

describe('AuthService.login', () => {
  it('returns a token and the public user profile', async () => {
    const { service } = setup();
    await expect(service.login({ email: user.email, password: 'pw' })).resolves.toEqual({
      token: 'jwt',
      expiresAt: '2030-01-01T00:00:00.000Z',
      user: { id: user.id, email: user.email, name: user.name, role: 'admin' },
    });
  });

  it('rejects a wrong password with INVALID_CREDENTIALS', async () => {
    const { service, tokens } = setup({ valid: false });
    await expect(service.login({ email: user.email, password: 'nope' })).rejects.toMatchObject({
      code: ErrorCode.InvalidCredentials,
    });
    expect(tokens.issue).not.toHaveBeenCalled();
  });

  it('still runs the password check for unknown emails (no timing oracle)', async () => {
    const { service, hasher } = setup({ found: false, valid: false });
    await expect(service.login({ email: 'ghost@x.test', password: 'pw' })).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    expect(hasher.verify).toHaveBeenCalledWith('pw', undefined);
  });
});
