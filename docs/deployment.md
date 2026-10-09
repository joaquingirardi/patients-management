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
