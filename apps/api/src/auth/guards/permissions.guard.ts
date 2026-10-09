import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Permission } from '@pm/contracts';

import { authorize } from '../actor';
import { REQUIRED_PERMISSIONS } from '../decorators/require-permissions.decorator';
import { type AuthenticatedRequest } from './jwt-auth.guard';

/** Global guard, runs after JwtAuthGuard: authenticated but not allowed → 403. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const { actor } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!actor) return true; // public route — nothing to authorize against
    for (const permission of required) authorize(actor, permission);
    return true;
  }
}
