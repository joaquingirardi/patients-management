# API reference

Base URL: `http://localhost:3001` (direct); the web app reaches it through `/api/proxy/*`.
All bodies are JSON. Schemas are defined once in [`packages/contracts`](../packages/contracts/src).

**Interactive docs:** Swagger UI at [`/docs`](http://localhost:3001/docs), raw OpenAPI 3.0 at
[`/docs/openapi.json`](http://localhost:3001/docs/openapi.json). The document is generated from the
same Zod schemas the API validates with, so it cannot drift (`API_DOCS_ENABLED`).

Every response carries `X-Request-Id`; patient data is served with `Cache-Control: no-store`.

## Authentication

`Authorization: Bearer <token>` on every endpoint except `POST /auth/login` and `/health*`.
Tokens are HS256 JWTs (issuer `patients-api`, audience `patients-web`, default TTL 30 min) with
claims `sub`, `email`, `name`, `role` (`admin` | `user`), `org`, `iat`, `exp`.

| Method | Path            | Permission       | Success                            | Notes                                               |
| ------ | --------------- | ---------------- | ---------------------------------- | --------------------------------------------------- |
| POST   | `/auth/login`   | public           | `200 { token, expiresAt, user }`   | rate limited per IP and per account (10/min)        |
| GET    | `/patients`     | `patients:read`  | `200 { data, page, limit, total }` | see query parameters                                |
| GET    | `/patients/:id` | `patients:read`  | `200 Patient`                      |                                                     |
| POST   | `/patients`     | `patients:write` | `201 Patient` + `Location`         |                                                     |
| PUT    | `/patients/:id` | `patients:write` | `200 Patient`                      | full replacement; optional `version` → 409 if stale |
| DELETE | `/patients/:id` | `patients:write` | `200 { ok: true }`                 | soft delete                                         |
| GET    | `/health`       | public           | `200` readiness (DB ping)          | `/health/live` for liveness                         |

### `GET /patients` query parameters

| Param    | Type                                              | Default    | Notes                                                            |
| -------- | ------------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| `page`   | int 1–10 000                                      | `1`        |                                                                  |
| `limit`  | int 1–100                                         | `10`       |                                                                  |
| `search` | string ≤ 100, no control characters               | —          | case-insensitive; every term must match first/last name or email |
| `sortBy` | `lastName` \| `firstName` \| `dob` \| `createdAt` | `lastName` | ties broken deterministically by `id`                            |
| `order`  | `asc` \| `desc`                                   | `asc`      |                                                                  |

### Patient

```json
{
  "id": "8f49ed62-d197-4036-a7c1-9dc294816c25",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "phoneNumber": "+14155550132",
  "dob": "1990-03-04",
  "version": 3,
  "createdAt": "2026-10-08T20:35:45.875Z",
  "updatedAt": "2026-10-08T21:02:11.040Z"
}
```

Input (`POST`, and `PUT` + `version`) accepts human formats and normalises them: names are
trimmed, email lower-cased, phone converted to E.164 (`"+1 (415) 555-0132"` → `"+14155550132"`).
Unknown fields are ignored.

## Errors

Every error is `application/problem+json`:

```json
{
  "type": "urn:pm:problem:validation-failed",
  "title": "Validation failed",
  "status": 400,
  "code": "VALIDATION_FAILED",
  "detail": "The request contains invalid fields.",
  "instance": "/patients",
  "requestId": "6a410e0e-6ae3-4943-b7db-74831e7b0c71",
  "errors": [
    {
      "path": "phoneNumber",
      "message": "Use international format with country code, e.g. +1 415 555 0132"
    }
  ]
}
```

| Status | `code`                                                      | When                                                                                                         |
| ------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 400    | `VALIDATION_FAILED` / `BAD_REQUEST`                         | invalid body/query/id · malformed JSON                                                                       |
| 401    | `UNAUTHENTICATED` / `TOKEN_EXPIRED` / `INVALID_CREDENTIALS` | missing/invalid token · expired · bad login (+ `WWW-Authenticate`)                                           |
| 403    | `FORBIDDEN`                                                 | authenticated, lacks permission (e.g. `user` writing)                                                        |
| 404    | `NOT_FOUND`                                                 | absent, soft-deleted, **or in another organization**                                                         |
| 409    | `VERSION_CONFLICT`                                          | `PUT` with a stale `version`                                                                                 |
| 429    | `RATE_LIMITED`                                              | throttled (+ `Retry-After`)                                                                                  |
| 503    | `SERVICE_UNAVAILABLE`                                       | database still failing after retries (+ `Retry-After`)                                                       |
| 503    | `OUTCOME_UNKNOWN`                                           | a write lost its connection mid-flight and may have been applied; re-read before retrying (no `Retry-After`) |
| 500    | `INTERNAL`                                                  | bug; logged with stack and request id, details withheld                                                      |

## Try it

```bash
TOKEN=$(curl -s localhost:3001/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@northwind.test","password":"Password123!"}' | jq -r .token)

curl -s "localhost:3001/patients?search=ada&sortBy=dob&order=desc&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq
```

A ready-made collection lives in [`apps/api/requests.http`](../apps/api/requests.http)
(VS Code REST Client / JetBrains HTTP client).
