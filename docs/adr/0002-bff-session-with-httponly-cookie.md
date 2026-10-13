# 0002. Backend-for-Frontend session: JWT in an httpOnly cookie

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The brief asks to "persist a token (mock) with role claim" and to handle route protection,
logout and expiry. The API must issue a JWT (`POST /auth/login → { token, user }`). Where the
browser keeps that token is a security decision, not a detail.

## Decision

The Next.js server acts as a thin **BFF**:

- `POST /api/auth/login` forwards credentials to the API and stores the JWT in an
  **httpOnly, SameSite=Lax, Secure (in production)** cookie whose lifetime equals the token's.
  The browser receives only `{ user, expiresAt }`; JavaScript never sees the token.
- `/api/proxy/patients…` attaches `Authorization: Bearer <cookie>` and streams the API response
  back unchanged. It is an **allowlist** (only the patients resource), not an open relay.
- **CSRF:** state-changing requests must prove same-origin via Fetch Metadata
  (`Sec-Fetch-Site: same-origin`) or a matching `Origin`, on top of `SameSite=Lax`.
- `proxy.ts` (Next.js 16's middleware) decodes the claims for UX routing but does not verify
  them: unauthenticated or expired → `/login?next=…&reason=expired`.
- Expiry is handled proactively (a timer at `exp`, with a one-minute warning) and reactively
  (any 401 from the API ends the session and redirects). The query cache is cleared on sign-out.
- The API remains the **only authority**: it verifies signature, algorithm (pinned HS256),
  issuer, audience, expiry and claim shape on every request. A forged cookie gets the user a
  login screen, never data (covered by an e2e test).

## Alternatives considered

- **Token in `localStorage` + direct browser → API calls.** Simplest, but any XSS exfiltrates a
  bearer token usable from anywhere. Also requires CORS and exposes the API publicly.
- **Verify the JWT in the web tier.** Needs the signing secret in a second service (or asymmetric
  keys + JWKS). Unnecessary: the web tier only makes UX decisions; the API decides access.
- **Refresh tokens / sliding sessions.** Valuable in production; out of scope for a "mock expiry
  is fine" brief. The session code isolates this so it can be added without touching features.

## Consequences

- One extra hop per request (same data centre in practice) in exchange for no token in JS, no
  public CORS surface, and a single place to add headers, tracing or caching.
- Stateless JWTs cannot be revoked before `exp`; logout discards the cookie. Short TTLs (30 min)
  bound the exposure. Revocation would need a denylist or server sessions.
- Client IPs for rate limiting: `X-Forwarded-For` is client-controlled, so the BFF forwards an
  address only when it was appended by one of _its own_ trusted proxies (`TRUSTED_PROXY_HOPS`,
  default 0 = forward nothing), and the API trusts exactly the BFF hop (`TRUST_PROXY_HOPS=1`),
  never "any private address". Because IPs can still be shared or rotated, login is also
  throttled **per target account**, which bounds password guessing regardless of source IP
  (trade-off: an attacker can temporarily lock out logins for one known email).
- The API has no public ingress; Compose publishes it on loopback only, for local exploration.
