---
name: add-endpoint
description: Step-by-step recipe for adding or changing an API endpoint across the contract, NestJS API, database, web app, tests and docs while preserving this repo's invariants (deny-by-default auth, tenant scoping, Problem Details, optimistic UI). Use when asked to add a route, resource or operation.
---

# Add an endpoint

Work through these steps in order. Each step names the file to copy from.

1. **Contract** (`packages/contracts/src`): add request/response Zod schemas and export inferred
   types. Add tests. If it is a new capability, add a `Permission` and map it in
   `ROLE_PERMISSIONS`. Build the package.
2. **Data** (`apps/api/prisma`): schema change + `pnpm db:migrate --name <change>`. Index columns
   lead with `organization_id`. Add CHECK constraints in the SQL for invariants.
3. **Repository** (pattern: `patients.repository.ts`): `TenantScope` first parameter, `where`
   built on `visibleIn(scope)`, explicit select map. No HTTP concepts.
4. **Service** (pattern: `patients.service.ts`): `authorize(actor, Permission.X)` first; map
   repository outcomes to domain errors; audit-log ids only. Unit-test it with a fake repository.
5. **Controller** (pattern: `patients.controller.ts`): `@RequirePermissions`, `ZodValidationPipe`
   for body/query/params, correct status (`201` + `Location` for creates, `@HttpCode(200)` where
   Nest defaults differ).
6. **Integration tests** (`apps/api/test`): success shape, 400 field errors, 401, 403 for each
   role without the permission, 404 cross-tenant, 409 where versioned.
7. **Web**: add the path to the BFF allowlist (`app/api/proxy/[...path]/route.ts`), a typed call
   in `features/<x>/api`, query keys, a hook (optimistic if it mutates), UI with all four states,
   role gating with `useCan`. Extend the MSW handlers and add a component test.
8. **Docs**: `docs/api.md`, `apps/api/requests.http`, and an ADR if a decision was made.
9. Run the `verify` skill.
