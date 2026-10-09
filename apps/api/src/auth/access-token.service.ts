import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenClaimsSchema, ErrorCode, type Role } from '@pm/contracts';

import { UnauthenticatedError } from '../common/errors/domain-errors';
import { type Actor } from './actor';

export interface TokenSubject {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
}

@Injectable()
export class AccessTokenService {
  constructor(private readonly jwt: JwtService) {}

  async issue(subject: TokenSubject): Promise<{ token: string; expiresAt: Date }> {
    const token = await this.jwt.signAsync({
      sub: subject.id,
      email: subject.email,
      name: subject.name,
      role: subject.role,
      org: subject.organizationId,
    });
    const { exp } = this.jwt.decode<{ exp: number }>(token);
    return { token, expiresAt: new Date(exp * 1000) };
  }

  /** Verifies signature, algorithm, issuer, audience and expiry, then validates the claim shape. */
  async verify(token: string): Promise<Actor> {
    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new UnauthenticatedError(
          ErrorCode.TokenExpired,
          'Your session has expired. Please sign in again.',
        );
      }
      throw new UnauthenticatedError(ErrorCode.Unauthenticated, 'The access token is invalid.');
    }

    const claims = AccessTokenClaimsSchema.safeParse(payload);
    if (!claims.success) {
      throw new UnauthenticatedError(ErrorCode.Unauthenticated, 'The access token is malformed.');
    }
    const { sub, org, email, name, role } = claims.data;
    return { userId: sub, organizationId: org, email, name, role };
  }
}
