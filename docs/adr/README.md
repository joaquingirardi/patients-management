# Architecture Decision Records

Short, dated records of decisions a reviewer is likely to ask "why?" about. Each one states the
context, the decision, the alternatives that lost, and the consequences we accept.

| #                                                 | Decision                                                                    | Status   |
| ------------------------------------------------- | --------------------------------------------------------------------------- | -------- |
| [0001](0001-monorepo-with-shared-contracts.md)    | Monorepo with a shared, runtime-validated API contract                      | Accepted |
| [0002](0002-bff-session-with-httponly-cookie.md)  | Backend-for-Frontend session: JWT in an httpOnly cookie                     | Accepted |
| [0003](0003-authorization-as-data-access.md)      | Authorization as data access: permissions + tenant-scoped repos             | Accepted |
| [0004](0004-resilience-at-the-dependency-edge.md) | Fault injection and retry safety at the database boundary                   | Accepted |
| [0005](0005-concurrency-and-optimistic-ui.md)     | Optimistic concurrency on the server, optimistic UI on the client           | Accepted |
| [0006](0006-patient-data-modelling.md)            | Patient data modelling: soft delete, non-unique email, date-only DOB, E.164 | Accepted |
| [0007](0007-error-model-problem-details.md)       | One error model: RFC 9457 Problem Details with stable codes                 | Accepted |
| [0008](0008-client-data-fetching.md)              | Client-side data fetching with TanStack Query, URL as list state            | Accepted |

New ADRs: copy [`template.md`](template.md), take the next number, keep it under a page.
