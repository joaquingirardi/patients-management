# 0004. Fault injection and retry safety at the database boundary

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

"Randomly simulate latency and occasional failures to demonstrate resilience." The cheap
reading is a middleware that randomly returns 500s. That only demonstrates that the _client_
retries; it says nothing about how the backend behaves when _its_ dependency is flaky — which is
what the evaluation calls "resilience against a flaky dependency".

## Decision

Inject faults **between the API and PostgreSQL**, and make both tiers resilient:

- A Prisma client extension (`resilience.extension.ts`) wraps every model query:
  `chaos.beforeQuery()` (random latency, random failure) → the real query, inside a retry loop.
- **Retry safety is classified, not assumed** (`transient-errors.ts`):
  - failures that provably happened _before_ the query reached the database (connection
    refused, pool timeout, the simulated failure) → retried for reads **and writes**;
  - connection drops _during_ a query → retried for **reads only** (a blind write retry could
    double-insert, or turn a successful update into a false version conflict);
  - everything else (constraint violations, bugs) → never retried.
- Retries use exponential backoff with **full jitter** to avoid synchronized retry storms.
- When the budget is exhausted: `503 SERVICE_UNAVAILABLE` + `Retry-After`, never an opaque 500.
- **Except for a write that died mid-flight**: it may have committed, so "retry shortly" would
  invite a duplicate. It becomes `503 OUTCOME_UNKNOWN` with _no_ `Retry-After`; the client
  refreshes and tells the user to check before trying again (no Retry button).
- **Never inside a transaction**: a retried statement would run outside its transaction. The
  `Database` type repositories receive omits `$transaction`, so this cannot happen by accident.
- Health probes use the raw client, so chaos never makes an orchestrator kill a healthy pod.
- **Client tier:** TanStack Query retries idempotent GETs on transient errors (honouring
  `Retry-After`), never retries mutations automatically, rolls optimistic updates back on
  failure and offers a one-click "Retry" in the toast. Stale data stays visible with a
  "couldn't refresh" banner instead of being replaced by an error screen.

Everything is configurable (`CHAOS_*`, `DB_RETRY_*`); chaos is **off by default** and on in the
Docker demo. Setting `DB_RETRY_MAX_ATTEMPTS=1` disables server retries so the client-side
handling becomes visible.

## Alternatives considered

- **HTTP-edge chaos middleware.** Exercises only the client; hides the more interesting
  server-side decisions.
- **Retry everything N times.** Simple and wrong for non-idempotent writes.
- **Idempotency keys** (`Idempotency-Key` header stored with a unique constraint) would turn
  `OUTCOME_UNKNOWN` creates into safely retryable ones. The natural next step if writes become
  frequent or clients become automated.
- **Circuit breaker.** The right next step under sustained outages (fail fast, shed load); with
  a single dependency and a bounded retry budget it adds little here. Noted as a follow-up.

## Consequences

- In the demo (15% per-query failure rate) almost every request still succeeds; logs show
  the absorbed failures (`Transient database failure …; retrying`) with the request id.
- Deterministic tests: the integration suite swaps the random source for a controller that
  fails exactly N queries, proving retry, write-safety and the 503 path end to end.
