# 0008. Client-side data fetching with TanStack Query; the URL holds list state

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Next.js offers Server Components data fetching. The patients screen is per-user, behind auth,
highly interactive (search-as-you-type, sorting, paging, optimistic mutations) and talks to a
deliberately flaky backend.

## Decision

- Pages are Server Components for the shell (auth check, layout, metadata); the data views are
  Client Components using **TanStack Query** for caching, deduplication, retries, background
  revalidation, optimistic updates and cancellation.
- **The URL is the source of truth** for search, sort, page and page size: shareable, reload-safe,
  back-button friendly. Defaults are omitted to keep URLs clean; malformed params degrade to
  defaults instead of erroring.
- Perceived performance: layout-matched skeletons on first load; `keepPreviousData` (dimmed)
  instead of skeleton flashes on paging; next-page prefetch; detail prefetch on row hover/focus;
  details open instantly from the list cache, then revalidate.
- **Code splitting beyond routes:** write-only UI (the form dialog with react-hook-form and its
  resolver, the delete confirmation) is loaded with `next/dynamic` after first paint and only for
  users who hold `patients:write` — viewers never download it. Dev tools are dev-only.
- Details use **intercepting + parallel routes**: from the list they open as a modal over the
  preserved list; a reload or shared link renders a full page. Same component, two presentations.

## Alternatives considered

- **RSC fetching + Server Actions.** Great for content pages; here it would push optimistic state,
  retries and cache coordination into bespoke code, and couple first paint to a flaky backend.
- **SWR.** Comparable; TanStack Query's mutation lifecycle and `useMutationState` fit the
  optimistic flows better.

## Consequences

- The first paint shows the shell + skeleton immediately rather than blocking on the API.
- Hydrating server-prefetched data (`HydrationBoundary`) is an easy follow-up if first-load data
  ever matters more than resilience.
