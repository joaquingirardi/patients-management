import 'server-only';

import { z } from 'zod';

/** Server-side configuration, validated once. Nothing here is ever exposed to the browser. */
const EnvSchema = z.object({
  API_URL: z.url().default('http://localhost:3001'),
  /**
   * Reverse proxies (load balancers) in front of this server that append the client address to
   * X-Forwarded-For. 0 (default) = nothing trusted: the header is client-controlled and dropped.
   */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  SESSION_COOKIE_SECURE: z
    .stringbool()
    .optional()
    .transform((value) => value ?? process.env.NODE_ENV === 'production'),
  // One-click demo sign-in on the login page. On in `next dev` and the local Compose stack only.
  DEMO_ACCOUNTS: z
    .stringbool()
    .optional()
    .transform((value) => value ?? process.env.NODE_ENV !== 'production'),
});

export const env = EnvSchema.parse(process.env);
