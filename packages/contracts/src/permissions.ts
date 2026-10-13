import { Role } from './roles';

/**
 * Code checks permissions rather than roles; a role is a named set of permissions. The API
 * enforces this map and the web app uses it to decide what to render.
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
