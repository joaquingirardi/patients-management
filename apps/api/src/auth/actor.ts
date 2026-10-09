import { hasPermission, type Permission, type Role } from '@pm/contracts';

import { ForbiddenError } from '../common/errors/domain-errors';

/** The authenticated principal on whose behalf a request runs. Derived from verified token claims. */
export interface Actor {
  userId: string;
  organizationId: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * Domain-level authorization check. Guards already enforce permissions at the HTTP edge; services
 * call this too (defence in depth), so a future caller that bypasses HTTP — a job, a CLI, a
 * message consumer — cannot bypass the policy.
 */
export function authorize(actor: Actor, permission: Permission): void {
  if (!hasPermission(actor.role, permission)) {
    throw new ForbiddenError(`Your role (${actor.role}) is not allowed to ${permission}.`);
  }
}

/** Every data access is scoped to the actor's organization. See PatientsRepository. */
export interface TenantScope {
  organizationId: string;
}

export const scopeOf = (actor: Actor): TenantScope => ({ organizationId: actor.organizationId });
