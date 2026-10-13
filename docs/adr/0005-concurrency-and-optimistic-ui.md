# 0005. Optimistic concurrency on the server, optimistic UI on the client

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The brief requires optimistic updates with rollback. Optimistic UI makes the _client_ fast, but
a full-record `PUT` also invites the classic lost update: two admins open the same patient, the
second save silently overwrites the first.

## Decision

- **Server:** every patient has an integer `version`. `PUT /patients/:id` accepts the version the
  client last saw. It is optional so that the brief's contract (`Request: Patient`) holds for
  plain bodies (those replace unconditionally), while the web app always sends it. The check
  and the write are a single atomic statement (`UPDATE … WHERE id AND organization_id AND deleted_at IS NULL AND version = $v`). Zero rows
  → we distinguish _gone_ (404) from _stale_ (409 `VERSION_CONFLICT`) with one follow-up read.
- **Client:** create, update and delete are optimistic: `onMutate` applies the change to every
  cached list; `onError` applies the targeted inverse (remove the temp row, revert one row,
  reinsert at the original index) rather than restoring a whole-cache snapshot, which would undo
  other in-flight mutations; `onSettled` revalidates only when the last in-flight patients
  mutation settles, so a refetch cannot resurrect a row whose delete is still pending. In-flight
  rows are dimmed and marked busy (`aria-busy`), created rows show "Saving...". Dialogs close on
  submit and the optimistic row is the feedback.
- Conflicts roll back, fetch the latest version (bypassing the cache, since the cached copy is
  the stale one) and offer "Review", which reopens the form
  with fresh data. A delete that 404s is treated as success (the user's intent is fulfilled).

## Alternatives considered

- `ETag` / `If-Match` headers. The HTTP-native form of the same idea. Body `version` was
  chosen because it keeps the contract a single typed schema and survives proxies untouched;
  switching is mechanical.
- Last-write-wins. Simpler; silently loses clinical data.
- Pessimistic locking. Needs lock lifetimes and a "locked by..." UI, which is the wrong trade-off
  for rare conflicts.

## Consequences

- Correctness under concurrency is enforced by the database, not by UI timing.
- Because retries of in-flight writes are never automatic (ADR 0004), a version conflict always
  means a genuine concurrent edit.
