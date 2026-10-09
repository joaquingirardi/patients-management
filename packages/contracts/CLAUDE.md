# packages/contracts — the API contract

Everything here ships to the **browser and** the server: keep it dependency-free beyond `zod`,
side-effect free, and framework agnostic (no Nest, no React, no Node APIs).

- Add a field → update the schema here; both apps fail to compile until they handle it.
- Input schemas _normalise_ (trim, lower-case, E.164) — the output type is what the server stores.
  Form types are `z.input<…>`, server types `z.output<…>`.
- Error messages are user-facing copy: short, specific, actionable. Use `abort: true` on
  "required" checks so each field reports exactly one message.
- Every rule needs a test in `src/*.test.ts` (Vitest).
- Changing an `ErrorCode` or `Permission` is an API change: check `ProblemDetailsFilter`,
  `ROLE_PERMISSIONS` and the UI gating that reads them.
