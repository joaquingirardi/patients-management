# apps/web — Next.js web app + BFF

## Where things go

- `src/app/` — routing only (layouts, pages, `loading`/`error`, route handlers). Keep pages thin.
- `src/features/<feature>/` — `api/` (typed calls + query keys), `hooks/` (queries, optimistic
  mutations), `components/`, `lib/` (pure helpers). Features may import `components/` and `lib/`,
  never each other's internals except via exported hooks/components.
- `src/components/ui/` — design-system primitives (shadcn/ui style on Radix). Feature-agnostic.
- `src/lib/` — API client (`apiRequest` + `ApiError`), query-client policy, session, env.

## Rules

- The browser talks only to `/api/proxy/*` (same origin). Never call the API URL from the client,
  never read the token in JS — it lives in an httpOnly cookie (ADR 0002). New API resources must
  be added to the proxy allowlist (`ALLOWED_PATH`).
- Always pass the contract `schema` to `apiRequest` — responses are validated at the boundary.
- Mutations follow the optimistic pattern in `use-patient-mutations.ts`: apply → on error undo
  _only that row_ (never restore a whole-cache snapshot: it clobbers concurrent mutations) →
  revalidate on settle; toast with a Retry action, except `OUTCOME_UNKNOWN` (refresh instead);
  never auto-retry writes.
- List state lives in the URL (`usePatientsSearchParams`). Don't mirror it in `useState`. Links
  to a patient use `usePatientHref()` so the list behind the modal keeps its query.
- Style with semantic tokens (`bg-primary`, `text-muted-foreground`, `bg-destructive-subtle`),
  never raw palette classes. New tokens go in `globals.css` for **both** themes.
- Forms: `react-hook-form` + `zodResolver(<contract schema>)` + `FormField` (it wires
  `aria-invalid`/`aria-describedby`). Prefer native inputs (`type="date"`, `<NativeSelect>`).
- Every data view needs four states: loading (layout-matched skeleton), empty, error (with retry
  and request id), and success. Busy rows get `aria-busy`.
- Gate UI with `useCan(Permission.X)` / `<Can>` — same map the API enforces.

## Testing

- `pnpm test` — Vitest + Testing Library + MSW (`src/test/msw/handlers.ts` is an in-memory API
  that honours the contract). `next/navigation` is replaced by a reactive mock (`currentUrl()`).
- jsdom renders both the table and the mobile card list; scope queries with `within(...)`.
- `pnpm test:e2e` — Playwright against a running stack; includes axe (WCAG 2.1 AA) in both themes.
