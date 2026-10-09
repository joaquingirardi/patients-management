# Patients Management — guide for AI agents

Role-aware patient records: Next.js 16 web (BFF) → NestJS 11 API → PostgreSQL 17 via Prisma 6.
pnpm + Turborepo monorepo. Read `docs/architecture.md` once; ADRs in `docs/adr/` explain every
non-obvious decision — check them before "fixing" something that looks unusual.

## Map

- `packages/contracts` — **the API contract**: Zod schemas, inferred types, roles, permissions,
  error codes. Shared by both apps. See its `CLAUDE.md`.
- `apps/api` — NestJS. See `apps/api/CLAUDE.md`.
- `apps/web` — Next.js. See `apps/web/CLAUDE.md`.
- `packages/tsconfig`, `packages/eslint-config` — shared strict presets.

## Commands (run from the repo root)

| Task                  | Command                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Install               | `pnpm install`                                                                                |
| DB only (Docker)      | `pnpm db:up && pnpm db:migrate && pnpm db:seed`                                               |
| Dev (all apps, watch) | `pnpm dev`                                                                                    |
| Quality gate (fast)   | `pnpm verify` — prettier check, lint, typecheck, unit tests                                   |
| API integration tests | `pnpm test:integration` (needs Docker: Testcontainers)                                        |
| E2E + a11y            | `CHAOS_ENABLED=false THROTTLE_LOGIN_LIMIT=1000 docker compose up -d --build && pnpm test:e2e` |
| Full stack in Docker  | `docker compose up --build`                                                                   |

After changing `packages/contracts`, rebuild it (`pnpm --filter @pm/contracts build`) or run
`pnpm dev`, which watches it. Jest/Vitest read contract _source_, so tests never need the build.

## Non-negotiable invariants

1. **One contract.** Request/response shapes, validation rules, roles and permissions live in
   `packages/contracts`. Never duplicate a rule in an app; never hand-write a type Zod can infer.
2. **Deny by default.** Every API route is authenticated unless `@Public()`. Every patients route
   declares `@RequirePermissions(...)`. UI gating uses the same permission map (`useCan`, `<Can>`).
3. **Tenant scope on every query.** Repository methods take a `TenantScope` first and build
   `where` clauses on `visibleIn(scope)`. Cross-tenant access is a 404, never a 403.
4. **Domain errors, not HTTP errors.** Services throw `DomainError` subclasses; only
   `ProblemDetailsFilter` knows about status codes. Every error response is RFC 9457.
5. **Retry only what is safe.** Do not add retries around writes; see ADR 0004 and
   `database/resilience/transient-errors.ts`.
6. **No PHI in logs.** Log ids, never names/emails/phones/DOBs/search terms.
7. **Dates of birth are `YYYY-MM-DD` strings** end to end, formatted in UTC. Never `new Date(dob)`
   in local time.
8. **Accessibility is a feature.** Use `FormField` for inputs, keep `aria-sort`/`aria-busy`/live
   regions intact, test both themes. axe runs in e2e.

## Conventions

- TypeScript strict everywhere (`noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`
  → use `process.env['X']`). No `any`; no non-null assertions in production code.
- Imports are auto-sorted (`simple-import-sort`); Prettier formats (a hook runs it on edit).
- Comments explain _why_, not what. Match the density of surrounding code.
- File names are kebab-case; React components PascalCase; one component family per file.
- Conventional Commits (`feat(api): …`, `fix(web): …`, `docs: …`).

## Definition of done

`pnpm verify` is green; behaviour changes have tests at the right layer (pure logic → unit,
SQL/guards/HTTP → API integration, UI behaviour → component test with MSW, journeys → e2e);
docs/ADRs updated when a reviewer would ask "why?".

## Agents & skills in this repo

- Agents (`.claude/agents`): `api-reviewer`, `ui-reviewer`, `test-engineer`, `contract-steward`.
- Skills (`.claude/skills`): `/verify`, `/add-endpoint`, `/write-adr`.
