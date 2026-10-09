# 0003. Authorization as data access: permissions + tenant-scoped repositories

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Role rules: `admin` may create/update/delete patients, `user` is view-only. Role checks sprinkled
through controllers tend to be forgotten on the next endpoint. And real clinical systems are
multi-tenant: a user must never see another organization's patients, which no role check covers.

## Decision

Three layers, each enforcing something the others cannot:

1. **Policy as data.** Roles map to permissions (`patients:read`, `patients:write`) in
   `@pm/contracts`. Both the API and the UI read the same map — the UI can never offer an action
   the API will refuse, and vice versa.
2. **Edge enforcement (HTTP).** Global guards, **deny by default**: `JwtAuthGuard` (→ 401) runs
   on every route unless `@Public()`; `PermissionsGuard` (→ 403) enforces `@RequirePermissions`.
3. **Data-access enforcement.** Services call `authorize(actor, permission)` again (defence in
   depth for non-HTTP callers), and every `PatientsRepository` method **requires a
   `TenantScope`**. All queries are built on `visibleIn(scope)` =
   `{ organizationId, deletedAt: null }`. There is no method that can touch a patient without
   naming its organization.

Cross-tenant access returns **404, not 403**: a patient in another organization is
indistinguishable from one that does not exist, so ids cannot be probed. Server-owned fields
(`organizationId`, `version`, audit columns) cannot be mass-assigned: Zod strips unknown keys.

## Alternatives considered

- **Postgres Row-Level Security.** The strongest guarantee, but requires setting a session
  variable per transaction through Prisma's pool — more moving parts than this scope warrants.
  The repository-scope pattern is a stepping stone: the same `TenantScope` would feed RLS.
- **CASL / policy engines.** Powerful for attribute-based rules; overkill for two permissions.

## Consequences

- Adding an endpoint without `@RequirePermissions` still requires authentication (deny by
  default); adding a query without a scope does not compile.
- Integration tests prove the matrix: 401 without/with bad tokens, 403 for users on writes,
  404 across tenants, and that mass-assigned `organizationId` is ignored.
