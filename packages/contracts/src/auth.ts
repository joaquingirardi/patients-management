import { z } from 'zod';

import { RoleSchema } from './roles';

export const LoginRequestSchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .min(1, { error: 'Email is required', abort: true })
    .max(254)
    .pipe(z.email({ error: 'Enter a valid email address' })),
  password: z.string().min(1, { error: 'Password is required' }).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  role: RoleSchema,
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

/**
 * `POST /auth/login` response: `{ token, user: { email, role } }` plus `expiresAt`, so clients
 * can handle expiry without decoding the token.
 */
export const LoginResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.iso.datetime(),
  user: AuthUserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/** Claims carried by the access token. */
export const AccessTokenClaimsSchema = z.object({
  sub: z.uuid(),
  email: z.email(),
  name: z.string(),
  role: RoleSchema,
  org: z.uuid(),
  iat: z.number(),
  exp: z.number(),
});
export type AccessTokenClaims = z.infer<typeof AccessTokenClaimsSchema>;
