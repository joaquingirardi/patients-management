import { type AccessTokenClaims, AccessTokenClaimsSchema } from '@pm/contracts';
import { decodeJwt } from 'jose';

export const SESSION_COOKIE = 'pm_session';

/** Seconds of tolerance for clock skew between browser, web server and API. */
const CLOCK_SKEW_SECONDS = 5;

/**
 * Reads (does NOT verify) the access-token claims. The web tier holds no signing secret by
 * design; it only needs the claims for UX — routing, rendering role-aware UI, scheduling the
 * expiry. Every data request is verified by the API, which remains the sole authority.
 */
export function readClaims(token: string | undefined): AccessTokenClaims | null {
  if (!token) return null;
  try {
    const result = AccessTokenClaimsSchema.safeParse(decodeJwt(token));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function isExpired(claims: Pick<AccessTokenClaims, 'exp'>, now = Date.now()): boolean {
  return claims.exp * 1000 <= now + CLOCK_SKEW_SECONDS * 1000;
}
