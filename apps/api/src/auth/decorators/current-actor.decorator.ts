import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { UnauthenticatedError } from '../../common/errors/domain-errors';
import { type Actor } from '../actor';
import { type AuthenticatedRequest } from '../guards/jwt-auth.guard';

/** Injects the authenticated Actor resolved by JwtAuthGuard. */
export const CurrentActor = createParamDecorator((_: unknown, context: ExecutionContext): Actor => {
  const { actor } = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!actor) throw new UnauthenticatedError();
  return actor;
});
