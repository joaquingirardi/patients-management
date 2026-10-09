# Architecture

## System overview

```mermaid
flowchart LR
  subgraph Browser
    UI["Next.js client components<br/>TanStack Query · RHF + Zod"]
  end
  subgraph Web["apps/web — Next.js 16 (Node)"]
    PX["proxy.ts<br/>route protection"]
    BFF["/api/auth/* · /api/proxy/*<br/>cookie → Bearer, CSRF, allowlist"]
    RSC["Server Components<br/>shell, session"]
  end
  subgraph API["apps/api — NestJS 11"]
    G["Guards: throttle → JWT (401) → permissions (403)"]
    C["Controllers<br/>Zod validation"]
    S["Services<br/>authorize(actor)"]
    R["Repositories<br/>TenantScope on every query"]
    X["Resilient Prisma client<br/>chaos → retry policy"]
    F["ProblemDetailsFilter"]
  end
  DB[("PostgreSQL 17")]
  K["@pm/contracts<br/>schemas · roles · permissions · error codes"]

  UI -- "same-origin fetch + httpOnly cookie" --> BFF
  UI -. navigation .-> PX
  BFF -- "Bearer JWT, X-Request-Id, X-Forwarded-For" --> G --> C --> S --> R --> X --> DB
  C -. errors .-> F
  K -. imported by .-> UI
  K -. imported by .-> C
```

**Why this shape:** the browser never holds the token (ADR 0002); authorization is enforced at the
edge _and_ in data access (ADR 0003); the flaky dependency is simulated where real ones live,
behind the repositories (ADR 0004); one contract package keeps both sides honest (ADR 0001).

## Request lifecycle — `PUT /patients/:id`

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant W as Web BFF
  participant A as API
  participant D as PostgreSQL
  B->>B: onMutate: snapshot caches, apply edit optimistically, close dialog
  B->>W: PUT /api/proxy/patients/:id (cookie, Sec-Fetch-Site: same-origin)
  W->>W: allowlist + CSRF check, read httpOnly cookie
  W->>A: PUT /patients/:id (Authorization: Bearer, X-Request-Id)
  A->>A: requestId → throttle → verify JWT → require patients:write
  A->>A: Zod: validate + normalise body (strip unknown keys)
  A->>D: UPDATE … WHERE id, organization_id, deleted_at IS NULL, version = v
  alt one row updated
    D-->>A: row (version v+1)
    A-->>B: 200 Patient
    B->>B: replace optimistic row with server truth
  else zero rows
    A->>D: SELECT (same scope) — gone or stale?
    A-->>B: 404 NOT_FOUND / 409 VERSION_CONFLICT (problem+json)
    B->>B: onError: restore snapshot, toast with Review / Retry
  end
  B->>W: onSettled: revalidate lists + detail
```

## Backend layout (`apps/api/src`)

```
config/           Zod-validated environment → typed AppConfig (fail fast at boot)
common/
  errors/         Domain errors + the single ProblemDetailsFilter (RFC 9457)
  http/           cross-cutting HTTP middleware (Cache-Control: no-store for PHI)
  validation/     ZodValidationPipe (shared contract schemas)
  logging/        request-id middleware, pino config (PHI-safe serializers)
database/
  prisma.service  connection lifecycle
  database.ts     DATABASE token: the resilient, extended client repositories use
  resilience/     chaos injection, retry with full jitter, retry-safety classification
  seed.ts         idempotent, deterministic demo data
auth/             login, token issue/verify, global guards, @Public/@RequirePermissions/@CurrentActor
users/            UsersRepository
patients/         dto/ (contract schemas, named) · entities/ (model slice + mapping) ·
                  controller (thin) → service (rules, authz, audit) → repository (tenant-scoped SQL)
openapi/          OpenAPI document generated from @pm/contracts → Swagger UI at /docs
health/           liveness + readiness (raw client: never affected by chaos)
```

Rules of the road:

- **Controllers** parse/validate and delegate. **Services** own business rules and authorization
  and throw domain errors. **Repositories** own queries and require a `TenantScope`.
- Modules are vertical (feature folders). A new resource is a new folder with the same four files.

## Frontend layout (`apps/web/src`)

```
app/                   routes only: layouts, pages, loading/error boundaries, BFF route handlers
  (auth)/login         public
  (app)/patients       authenticated; @modal parallel slot + (.)[id] intercepting route
  api/auth, api/proxy  the BFF
proxy.ts               route protection (Next.js 16 "proxy", formerly middleware)
components/ui          design-system primitives (shadcn/ui style, Radix under the hood)
components/{layout,feedback}
features/
  auth/                session provider, <Can>, login form
  patients/            api · hooks (queries, optimistic mutations) · components · lib (format, URL state)
lib/                   api client + Problem Details, query client policy, session claims, env
test/                  MSW fake API, reactive next/navigation mock, render helpers
```

Features own their data, hooks and components; `app/` stays a thin routing layer; `components/ui`
knows nothing about patients. Dependencies point inward: `app → features → components/lib`.

## Data model

```mermaid
erDiagram
  ORGANIZATIONS ||--o{ USERS : employs
  ORGANIZATIONS ||--o{ PATIENTS : owns
  USERS |o--o{ PATIENTS : "created_by / updated_by / deleted_by"
  ORGANIZATIONS {
    uuid id PK
    varchar slug UK
    varchar name
  }
  USERS {
    uuid id PK
    uuid organization_id FK
    varchar email UK
    varchar password_hash
    role role
  }
  PATIENTS {
    uuid id PK
    uuid organization_id FK
    varchar first_name
    varchar last_name
    varchar email "not unique (shared family inboxes)"
    varchar phone_number "E.164, CHECK"
    date dob "CHECK >= 1900-01-01"
    int version "optimistic concurrency"
    timestamptz deleted_at "soft delete"
  }
```

## Design system

Tokens live in [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css) and are exposed
to Tailwind v4 via `@theme`:

| Layer     | Tokens                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colour    | semantic only — `background/foreground`, `primary`, `success`, `warning`, `destructive`, `info`, `muted`, each with `-foreground` / `-subtle` pairs; OKLCH, AA contrast, light + dark |
| Type      | Geist Sans/Mono; h1 24→28px tight, body 14–16px relaxed; `tabular-nums` for dates & phones                                                                                            |
| Space     | Tailwind 4px scale; page gutter 16→24px; vertical rhythm in 4/6/8 steps                                                                                                               |
| Radius    | one `--radius` knob → `sm/md/lg/xl`                                                                                                                                                   |
| Elevation | `shadow-xs` controls → `sm` cards → `md` menus → `lg` dialogs, hue-tinted                                                                                                             |
| Motion    | 150–300 ms, ease-out-quart; dialogs scale/fade (sheet on phones); `prefers-reduced-motion` honoured globally                                                                          |

Responsive table: **≥ lg** all columns · **md** email folds under the name, phone hidden ·
**< md** stacked cards with large touch targets and an explicit sort control.
