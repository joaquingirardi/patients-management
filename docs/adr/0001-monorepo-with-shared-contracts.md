# 0001. Monorepo with a shared, runtime-validated API contract

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Both tiers need the same validation rules and types. The classic failure mode is two
hand-maintained copies of the same rules: the form
accepts a phone number the API rejects, or a renamed field breaks the UI silently at runtime.

## Decision

A pnpm + Turborepo monorepo with a `packages/contracts` package that owns, as Zod schemas:

- request bodies and query strings (`PatientInputSchema`, `ListPatientsQuerySchema`, …),
- response shapes (`PatientSchema`, `PatientListSchema`, `LoginResponseSchema`),
- roles, the role → permission map, and machine-readable error codes.

The API validates every input with these schemas (`ZodValidationPipe`); the web app uses the very
same schemas for form validation (`zodResolver`) and validates every API response at the
boundary (`apiRequest({ schema })`). Types are inferred, never hand-written.

## Alternatives considered

- **class-validator DTOs (Nest default) + separate client schemas.** Two sources of truth that
  drift; decorators cannot be shared with the browser. Zod gives the same validated, typed DTOs
  and also runs in the browser.
- **OpenAPI-first with generated clients.** Excellent across teams/languages, but heavier
  tooling than a two-app TypeScript system needs. Zod 4 can emit JSON Schema, so this remains an
  upgrade path rather than a rewrite.
- **Separate repositories.** Contract changes would need versioned packages and coordinated
  releases, which is overhead without benefit at this size.

## Consequences

- A contract change is one commit; both apps fail to compile until they agree.
- Client and server validation are identical by construction (tested in `packages/contracts`).
- Runtime response validation costs microseconds and turns contract drift into a loud error.
- The contracts package must stay dependency-light (only `zod`) because it ships to the browser.
