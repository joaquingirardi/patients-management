## What & why

<!-- The change and the problem it solves. Link the issue / ADR if relevant. -->

## How it was verified

- [ ] `pnpm verify` passes (format, lint, typecheck, unit tests)
- [ ] `pnpm test:integration` passes (if the API changed)
- [ ] Manually checked in the browser: loading, empty, error and role-gated states (if the UI changed)

## Checklist

- [ ] Contract changes live in `packages/contracts` and both apps compile against them
- [ ] New queries are tenant-scoped (`TenantScope`) and new routes declare `@RequirePermissions`
- [ ] Errors are domain errors mapped by `ProblemDetailsFilter` (no ad-hoc HTTP exceptions)
- [ ] No PHI in logs (ids only)
- [ ] Docs/ADRs updated for any decision a reviewer would ask "why?" about
