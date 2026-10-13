# Scope & prioritisation

The brief covers more than fits in the time available and asks for a smaller, well-executed
solution over a large but shallow one. This page records how I spent the time and why.

## Guiding principle

I put the time into the backend (data model, authorization, errors, resilience) and the
end-to-end integration, and kept UI polish to what users actually notice.

## What got depth (and why)

| Area          | What                                                                                                                                              | Why it was worth it                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Contract      | One Zod package for both tiers, response validation at the client boundary                                                                        | Removes the most common full-stack bug class by construction                         |
| Authorization | Deny-by-default guards, permission map shared with the UI, tenant-scoped repositories                                                             | Patient data is sensitive, and clinics are separate tenants; a leak is the worst bug |
| Resilience    | Fault injection at the DB edge, retry-safety classification, 503 + Retry-After, client retry/rollback                                             | The database is the dependency that fails; retrying a write blindly can duplicate it |
| Concurrency   | `version` + atomic conditional update, conflict UX                                                                                                | Optimistic UI without lost-update protection is half a solution                      |
| Error model   | RFC 9457 everywhere, stable codes, request ids across tiers                                                                                       | Makes every other feature debuggable and every UI state precise                      |
| Tests         | Unit (pure logic), integration (real Postgres, real HTTP), component (MSW), e2e + axe                                                             | Each layer tests what only it can; no mocked database                                |
| Accessibility | Labels/ARIA wiring in one primitive, focus management, skip link, aria-sort, live regions, reduced motion, automated WCAG AA scans in both themes | Keyboard and screen-reader users need it from day one; expensive to retrofit later   |

## What was deliberately left out

| Not built                                    | Why not (now)                                                                                    | Where it would go                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Refresh tokens / sliding sessions            | "Mock expiry is fine"; adds a token store and rotation logic                                     | `features/auth`, `auth/` module          |
| User & organization management screens       | Not in scope; seed data covers the demo                                                          | new `users` feature                      |
| Restore / audit-history UI                   | Data model supports it (soft delete + audit columns); no UI asked for                            | `PATCH /patients/:id/restore`            |
| Cursor (keyset) pagination                   | Contract specifies `page/limit/total`; offset is fine at clinic scale                            | indexes already shaped for it (ADR 0006) |
| Caching (Redis) / distributed rate limiting  | Single instance; in-memory throttler is honest about that                                        | `ThrottlerModule` storage, HTTP caching  |
| Postgres Row-Level Security                  | Repository scoping gives the guarantee with fewer moving parts                                   | ADR 0003                                 |
| Circuit breaker                              | One dependency, bounded retry budget                                                             | `database/resilience`                    |
| Idempotency keys for `POST`                  | `OUTCOME_UNKNOWN` already prevents blind duplicate retries; keys would make them _safe_ to retry | ADR 0004                                 |
| Partial indexes (`WHERE deleted_at IS NULL`) | Prisma cannot model them without schema drift; deleted rows are a small fraction                 | raw SQL migration if the ratio grows     |
| Observability backends (OTel, metrics)       | Structured logs with request ids are the foundation; exporters are deployment-specific           | `common/logging`                         |
| Cloud deployment                             | Needs accounts/billing I should not assume; the images are production-shaped                     | [deployment.md](deployment.md)           |

## Smaller decisions

- Delete is confirmed, edits are not. Destructive actions get an alert dialog; reversible ones
  get speed.
- Viewers don't see disabled buttons. Absent actions plus a "View only" badge are clearer than
  a screen of greyed-out controls.
- Native `<select>` and `<input type="date">`: better screen-reader and mobile behaviour than
  custom widgets, and zero bundle cost.
- Search is debounced and URL-backed, replace-history (no back-button spam); paging pushes
  history (back works as expected).
- Chaos is off by default and on in the Docker demo, so development and CI stay deterministic.
