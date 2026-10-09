import { Role } from './roles';

/**
 * Authorization is expressed as *permissions*, not role checks scattered through the code.
 * Roles are just named bundles of permissions. The API enforces this map and the web app
 * uses the very same map to decide what to render — one policy, two enforcement points.
 */
export const Permission = {
  PatientsRead: 'patients:read',
  PatientsWrite: 'patients:write',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  [Role.Admin]: [Permission.PatientsRead, Permission.PatientsWrite],
  [Role.User]: [Permission.PatientsRead],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
