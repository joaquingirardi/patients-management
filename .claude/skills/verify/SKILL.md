---
name: verify
description: Run the repository's full quality gate (format, lint, typecheck, unit tests, and optionally API integration and e2e tests) and report a concise pass/fail summary. Use before committing, before opening a PR, or when asked to "check everything".
---

# Verify

Run from the repository root, in this order, stopping to diagnose on the first failure:

1. `pnpm format:check` — if it fails, run `pnpm format` and re-check.
2. `pnpm turbo run lint typecheck test` — lint, strict typecheck, unit/component tests.
3. If anything under `apps/api` or `packages/contracts` changed: `pnpm test:integration`
   (requires Docker for Testcontainers).
4. Only when explicitly requested or UI flows changed, run e2e:
   `CHAOS_ENABLED=false THROTTLE_LOGIN_LIMIT=1000 docker compose up -d --build --wait && pnpm test:e2e`.

Report as a short table: step · result · notable output (copy failures verbatim, with file:line).
Never claim a step passed without running it; say "skipped" and why.
