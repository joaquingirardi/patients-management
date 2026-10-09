import { SetMetadata } from '@nestjs/common';
import { type Permission } from '@pm/contracts';

export const REQUIRED_PERMISSIONS = 'auth:requiredPermissions';

/** Declares the permissions a route needs. Enforced by PermissionsGuard (→ 403). */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);
