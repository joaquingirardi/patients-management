import { z } from 'zod';

export const Role = {
  Admin: 'admin',
  User: 'user',
} as const;

export const RoleSchema = z.enum([Role.Admin, Role.User]);
export type Role = z.infer<typeof RoleSchema>;
