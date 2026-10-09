# apps/api — NestJS API

## Shape of a feature module (copy `patients/`)

```
<feature>/
  dto/                      named DTOs = contract schemas (value: validator, type: same name)
  entities/                 the slice of the Prisma model the module uses + mapping to responses
  <feature>.module.ts       wiring only
  <feature>.controller.ts   thin: ZodValidationPipe(<Dto>) → service. @RequirePermissions on every route.
  <feature>.service.ts      rules + authorize(actor, permission) + audit log (ids only) → domain errors
  <feature>.repository.ts   Prisma via @Inject(DATABASE); every method takes TenantScope first
  <feature>.service.spec.ts unit tests with a fake repository
```

Integration tests for the HTTP behaviour go in `test/<feature>.e2e-spec.ts`.

## Rules

- Inject `DATABASE` (the resilient client) in repositories — never `PrismaService` directly.
  `PrismaService` is for lifecycle and health checks only. `DATABASE` deliberately has no
  `$transaction` (statement retries are unsound inside one); transactional work needs its own
  non-retrying client and a design discussion.
- Build every `where` on `visibleIn(scope)`; select with an explicit public field map
  (see `PATIENT_PUBLIC_FIELDS`) so new columns never leak by accident.
- Throw from `common/errors/domain-errors.ts`. If you need a new error, add an `ErrorCode` in
  `packages/contracts` — the filter's exhaustive map will tell you where to wire the status.
- Config comes from `APP_CONFIG` (validated by Zod in `config/app-config.ts`). Add new env vars
  there **and** to `.env.example` and `docker-compose.yml`.
- Schema changes: edit `prisma/schema.prisma`, then `pnpm db:migrate --name <change>`. Put
  invariants Prisma cannot express (CHECKs, extensions) in the generated SQL by hand.
- Never run `prisma migrate reset` against anything but a throwaway local database.

## Testing

- `pnpm test` — unit (`src/**/*.spec.ts`), milliseconds, no I/O.
- `pnpm test:integration` — `test/**/*.e2e-spec.ts` against PostgreSQL 17 in Testcontainers,
  booting the real `AppModule` + `configureApp`. Use `seedWorld()` for a known dataset and the
  `ChaosController` (`t.chaos.failNext(n)`) for deterministic dependency failures.
- Assert on status **and** Problem Details `code`; for authz, cover 401, 403 and cross-tenant 404.
