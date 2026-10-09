# 0006. Patient data modelling

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Five fields — `firstName`, `lastName`, `email`, `phoneNumber`, `dob` — hide several decisions
with real-world consequences in a clinical context.

## Decision

- **Soft delete** (`deleted_at`, `deleted_by_id`). Medical records are retained, not destroyed;
  deleted rows are invisible to every query via the shared `visibleIn(scope)` filter. `DELETE`
  still answers the contract's `{ ok: true }`.
- **Email is not unique.** Parents and children, or carers and dependants, routinely share one
  inbox. A uniqueness constraint would block legitimate registrations. Duplicate detection is a
  product feature (fuzzy match on name + DOB), not a database constraint.
- **DOB is a calendar date**, typed `YYYY-MM-DD` end to end and stored as Postgres `DATE` — it can
  never shift a day through timezone conversion. "Not in the future" is validated against the
  latest date currently observed anywhere on Earth (UTC+14), so a baby born "today" in Auckland
  is not rejected by a server in UTC. The UI formats dates in UTC for the same reason.
- **Phone numbers are normalised to E.164** (`+14155550132`) from whatever humans type
  (`+1 (415) 555-0132`). One canonical form for storage, comparison, search and `tel:` links.
- **Names accept any script** (`\p{L}`), plus apostrophes, hyphens, dots and spaces —
  "José", "O'Brien", "김", "Anne-Marie" are all valid.
- **The database enforces invariants too** (CHECK constraints in the migration): lower-case
  email, E.164 phone, DOB ≥ 1900-01-01, non-blank names, positive version.
- **Audit columns** (`created_by_id`, `updated_by_id`, `deleted_by_id`) plus structured audit
  log events with ids only — never PHI in logs.
- **Indexes** lead with `organization_id` (every query is tenant-scoped) and end with `id` for
  deterministic ordering; trigram GIN indexes back case-insensitive substring search.

## Alternatives considered

- **libphonenumber.** Better national-format parsing; ~100 kB in the browser bundle. E.164 with a
  clear hint is a reasonable floor; swapping the schema's transform is a contained change.
- **Hard delete.** Simpler, and wrong for clinical records.

## Consequences

- Restoring a deleted patient is a one-column update (not exposed yet).
- Offset pagination is used, matching the contract's `{ page, limit, total }`. Keyset pagination
  would scale better beyond ~100k rows per tenant; the composite indexes already support it.
