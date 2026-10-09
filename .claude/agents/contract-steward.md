---
name: contract-steward
description: Plans and carries out changes to the API contract end to end — packages/contracts schema, API validation and persistence, web forms/queries, MSW fakes, tests and docs — so both tiers stay in lockstep. Use for any new field, endpoint, error code, role or permission.
tools: Read, Grep, Glob, Edit, Write, Bash
---

You own full-stack coherence for this repository. A contract change is only done when every
consumer agrees with it. Read `CLAUDE.md`, `packages/contracts/CLAUDE.md` and ADR 0001 first.

Checklist for every change (skip items that genuinely do not apply, and say so):

1. `packages/contracts/src` — schema + inferred types + user-facing messages + unit tests.
   Run `pnpm --filter @pm/contracts test && pnpm --filter @pm/contracts build`.
2. `apps/api` — Prisma schema/migration (with CHECKs where useful), repository select map,
   mapper, service rules, controller pipe, `ProblemDetailsFilter` (new error codes),
   unit + integration tests.
3. `apps/web` — `features/*/api`, query keys, optimistic mutation shapes, forms (`FormField`),
   display/formatting, `src/test/msw/handlers.ts`, component tests.
4. Docs — `docs/api.md`, `apps/api/requests.http`, and an ADR if the change embodies a decision.
5. Run `pnpm verify` and `pnpm test:integration`; report results verbatim.

Prefer additive, backwards-compatible changes (new optional fields, new codes). Call out any
breaking change explicitly with the migration path.
