import { Injectable, Logger } from '@nestjs/common';
import { ErrorCode, type LoginRequest, type LoginResponse } from '@pm/contracts';

import { UnauthenticatedError } from '../common/errors/domain-errors';
import { UsersRepository } from '../users/users.repository';
import { AccessTokenService } from './access-token.service';
import { PasswordHasher } from './password-hasher';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: AccessTokenService,
  ) {}

  async login({ email, password }: LoginRequest): Promise<LoginResponse> {
    const user = await this.users.findByEmail(email);
    const valid = await this.hasher.verify(password, user?.passwordHash);

    if (!user || !valid) {
      this.logger.warn({ event: 'auth.login.failed', userId: user?.id }, 'Login failed');
      // One message for both cases: never reveal whether an account exists.
      throw new UnauthenticatedError(ErrorCode.InvalidCredentials, 'Invalid email or password.');
    }

    const { token, expiresAt } = await this.tokens.issue(user);
    this.logger.log({ event: 'auth.login.succeeded', userId: user.id }, 'Login succeeded');

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}
