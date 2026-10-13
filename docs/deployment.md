# Deployment

The system ships as three production-shaped container images:

| Image            | Dockerfile target                  | Role                                    | Runs as |
| ---------------- | ---------------------------------- | --------------------------------------- | ------- |
| `api` (runtime)  | `apps/api/Dockerfile` → `runtime`  | NestJS server; no Prisma CLI inside     | `node`  |
| `api` (migrator) | `apps/api/Dockerfile` → `migrator` | one-shot `prisma migrate deploy` + seed | `node`  |
| `web`            | `apps/web/Dockerfile`              | Next.js standalone server (BFF + UI)    | `node`  |

All use `tini` as PID 1 so `SIGTERM` reaches Node and Nest's shutdown hooks close the DB pool.

## Any container platform (ECS/Fargate, Cloud Run, Fly.io, Render, Kubernetes)

1. **Database:** managed PostgreSQL 14+ (RDS, Cloud SQL, Neon…). The `pg_trgm` extension must be
   available (it is on all major providers).
2. **Migrations:** run the `migrator` image as a release/pre-deploy job before rolling the API.
   Demo accounts are only seeded when `SEED_DEMO_DATA=true` (Compose sets it; never set it in a
   real environment — the demo password is public).
3. **API:** run the `runtime` image with:
   - `DATABASE_URL`, `JWT_SECRET` (≥ 32 chars, from a secret manager), `CORS_ORIGINS`
   - `CHAOS_ENABLED=false` (default) — chaos is a demo feature
   - `TRUST_PROXY_HOPS=1` — only the web BFF's `X-Forwarded-For` is trusted
   - readiness probe `GET /health`, liveness probe `GET /health/live`
4. **Web:** run the `web` image with `API_URL` pointing at the API's _private_ address, and
   `TRUSTED_PROXY_HOPS` = the number of load balancers in front of it (usually 1) so real client
   IPs reach the API's rate limiter.
   Only the web service needs a public ingress; the API can stay internal (ADR 0002).
5. **TLS** terminates at the load balancer. Leave `SESSION_COOKIE_SECURE` unset (secure by
   default in production builds).

## Scaling notes

- Images run as `node` with root-owned, read-only application files.
- The API is stateless except for the in-memory rate limiter: with more than one replica, move
  throttling to Redis (`@nestjs/throttler` storage) or the edge.
- Prisma's pool size defaults to `num_cpus * 2 + 1`; tune with `?connection_limit=` in
  `DATABASE_URL` when running many replicas against one database.
- The web tier is stateless and scales horizontally without coordination.

## Vercel

The hosted demo runs as two Vercel projects from this repo, each with its root directory set to
its app:

| Project                   | Root       | URL                                         |
| ------------------------- | ---------- | ------------------------------------------- |
| `patients-management`     | `apps/web` | https://patients-management-five.vercel.app |
| `patients-management-api` | `apps/api` | https://patients-management-api.vercel.app  |

The API is not deployed with Vercel's NestJS preset. That preset recompiles `src/main.ts` with its
own TypeScript settings, which do not match the strict config the code is built for. Instead,
`apps/api/vercel.json` builds with `nest build` as usual and `api/index.js` serves `dist/serverless.js`,
which creates the Nest app once per function instance. `main.ts` is still the entry point for
Docker and local development.

The API build also runs `prisma migrate deploy` and the demo seed (the seed only runs when
`SEED_DEMO_DATA=true`). That is the same job the `migrator` image does in Compose; on a real
project it would be a separate release step, and preview deployments would get their own database.

Environment:

- API: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `TRUST_PROXY_HOPS=1`, `CHAOS_ENABLED=true`,
  `SEED_DEMO_DATA=true`, `API_DOCS_ENABLED=true`, `THROTTLE_LOGIN_LIMIT=30`.
- Web: `API_URL` (the API's production URL) and `TRUSTED_PROXY_HOPS=1`.

Notes:

- Supabase's direct host (`db.<ref>.supabase.co`) is IPv6-only and Vercel functions cannot reach it.
  Use the session pooler (`aws-<n>-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`); session
  mode supports the prepared statements Prisma uses and the migrations. Keep `connection_limit` low
  (3) since every function instance has its own pool.
- Swagger UI's static files are loaded from a computed path that file tracing cannot follow, so
  `includeFiles` adds `swagger-ui-dist` to the API function explicitly.
- Both functions are pinned to `pdx1`, next to the database (us-west-2).
- The rate limiter is in memory, so on serverless it is per instance. Vercel also rewrites
  `X-Forwarded-For` on the BFF's call to the API, so the API sees the BFF's address rather than the
  user's. Login is still limited per target account. For real traffic, move throttling to Redis or
  the Vercel firewall.
