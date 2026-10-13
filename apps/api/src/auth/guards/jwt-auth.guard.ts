import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { UnauthenticatedError } from '../../common/errors/domain-errors';
import { AccessTokenService } from '../access-token.service';
import { type Actor } from '../actor';
import { IS_PUBLIC } from '../decorators/public.decorator';

export interface AuthenticatedRequest extends Request {
  actor?: Actor;
}

/** Global guard: every route requires a valid Bearer token (401) unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: AccessTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.trim().split(/\s+/) ?? [];
    // Auth schemes are case-insensitive (RFC 9110 §11.1).
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw new UnauthenticatedError();

    request.actor = await this.tokens.verify(token);
    return true;
  }
}
