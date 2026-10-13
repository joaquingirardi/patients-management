# 0007. One error model: RFC 9457 Problem Details with stable codes

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Clients need to branch on errors (show field errors, redirect on expired session, offer retry on 503) without parsing English. Operators need to find the log line behind a user's screenshot.

## Decision

- Services throw domain errors (`NotFoundError`, `VersionConflictError`,
  `DependencyUnavailableError`, …) and know nothing about HTTP.
- A single global `ProblemDetailsFilter` maps them, along with framework errors (malformed JSON, unknown
  routes, throttling), Prisma errors and unknown exceptions, to
  `application/problem+json` documents with: `type`, `title`, `status`, a stable `code`,
  `detail`, `instance`, the `requestId` and, for validation, per-field `errors`.
- The code → status mapping is an exhaustive `Record<ErrorCode, …>`: adding a code without a
  mapping does not compile.
- Unknown errors are logged with stack and request id, and returned as an opaque 500.
- 401s carry `WWW-Authenticate` (RFC 6750, `invalid_token` for expiry); 429/503 carry `Retry-After`.
- The request id is assigned before body parsing, honours a well-formed incoming
  `X-Request-Id` (the BFF sends one) and is echoed in the response and every log line.

## Consequences

- The UI shows "Reference: <requestId>" on error screens; support can grep one id across tiers.
- Validation is reported as `400 VALIDATION_FAILED` (not 422) for consistency with Nest's
  defaults and most client expectations.
