---
name: write-adr
description: Record an architecture decision as a new ADR in docs/adr using the repo template, and index it. Use when a change embodies a decision a reviewer would ask "why?" about, or when asked to document a decision.
---

# Write an ADR

1. List `docs/adr/` and take the next four-digit number.
2. Copy `docs/adr/template.md` to `docs/adr/NNNN-kebab-title.md`. Title in the imperative.
3. Fill every section, under one page:
   - **Context** — the forces and constraints, citing code or requirements.
   - **Decision** — concrete enough to check the code against.
   - **Alternatives considered** — each with the specific reason it lost.
   - **Consequences** — what gets easier, what gets harder, what would make us revisit.
4. Add a row to the table in `docs/adr/README.md`.
5. If it supersedes an ADR, set the old one's status to `Superseded by NNNN`.
6. Run `pnpm prettier --write docs/adr`.
