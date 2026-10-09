# Scope & prioritisation

The brief is intentionally broader than the time available and says so: _"prioritisation is key …
a smaller, well-executed solution is preferred over a large but shallow one."_ This page records
how the time was spent and why — the decisions I expect to defend in the follow-up.

## Guiding principle

**Depth where the evaluation says it looks, polish where users feel it, nothing speculative.**
The evaluation names four things: judgment under ambiguity, backend depth (data modelling,
authorization-as-data-access, error handling, resilience against a flaky dependency, test
taste), full-stack coherence, and ownership. Everything below maps to one of those.

## What got depth (and why)

| Area          | What                                                                                                                                              | Why it was worth it                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Contract      | One Zod package for both tiers, response validation at the client boundary                                                                        | Removes the most common full-stack bug class by construction                       |
| Authorization | Deny-by-default guards, permission map shared with the UI, tenant-scoped repositories                                                             | Explicitly evaluated; multi-tenancy is the realistic shape of the problem          |
| Resilience    | Fault injection at the DB edge, retry-safety classification, 503 + Retry-After, client retry/rollback                                             | Explicitly evaluated; the naive version teaches nothing                            |
| Concurrency   | `version` + atomic conditional update, conflict UX                                                                                                | Optimistic UI without lost-update protection is half a solution                    |
| Error model   | RFC 9457 everywhere, stable codes, request ids across tiers                                                                                       | Makes every other feature debuggable and every UI state precise                    |
| Tests         | Unit (pure logic), integration (real Postgres, real HTTP), component (MSW), e2e + axe                                                             | Each layer tests what only it can; no mocked database                              |
| Accessibility | Labels/ARIA wiring in one primitive, focus management, skip link, aria-sort, live regions, reduced motion, automated WCAG AA scans in both themes | Named as a "strong focus"; cheap to do right from the start, expensive to retrofit |

## What was deliberately left out

| Not built                                    | Why not (now)                                                                                    | Where it would go                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Refresh tokens / sliding sessions            | "Mock expiry is fine"; adds a token store and rotation logic                                     | `features/auth`, `auth/` module          |
| User & organization management screens       | Not in scope; seed data covers the demo                                                          | new `users` feature                      |
| Restore / audit-history UI                   | Data model supports it (soft delete + audit columns); no UI asked for                            | `PATCH /patients/:id/restore`            |
| Cursor (keyset) pagination                   | Contract specifies `page/limit/total`; offset is fine at clinic scale                            | indexes already shaped for it (ADR 0006) |
| Caching (Redis) / distributed rate limiting  | Single instance; in-memory throttler is honest about that                                        | `ThrottlerModule` storage, HTTP caching  |
| Postgres Row-Level Security                  | Repository scoping gives the guarantee with fewer moving parts                                   | ADR 0003                                 |
| ~~OpenAPI document~~                         | Added after review: generated from the contract, served at `/docs`                               | `apps/api/src/openapi`                   |
| Circuit breaker                              | One dependency, bounded retry budget                                                             | `database/resilience`                    |
| Idempotency keys for `POST`                  | `OUTCOME_UNKNOWN` already prevents blind duplicate retries; keys would make them _safe_ to retry | ADR 0004                                 |
| Partial indexes (`WHERE deleted_at IS NULL`) | Prisma cannot model them without schema drift; deleted rows are a small fraction                 | raw SQL migration if the ratio grows     |
| Observability backends (OTel, metrics)       | Structured logs with request ids are the foundation; exporters are deployment-specific           | `common/logging`                         |
| Cloud deployment                             | Needs accounts/billing I should not assume; the images are production-shaped                     | [deployment.md](deployment.md)           |

## Small decisions that matter

- **Delete is confirmed, edits are not.** Destructive actions get an alert dialog; reversible ones
  get speed.
- **Viewers don't see disabled buttons.** Absent actions plus a "View only" badge are clearer than
  a screen of greyed-out controls.
- **Native `<select>` and `<input type="date">`.** Better screen-reader and mobile behaviour than
  custom widgets, and zero bundle cost.
- **Search is debounced and URL-backed**, replace-history (no back-button spam); paging pushes
  history (back works as expected).
- **Chaos is off by default, on in the Docker demo.** Development and CI stay deterministic.
