<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules (A Una Milla)

- Specification lives in `docs/` (start at `docs/PROJECT_B_MASTER_PLAN.md`; `docs/project-b/technical/12_PRE_BUILD_CORRECTIONS_2026-10-27.md` overrides older formulas).
- All money is integer cents (`src/domain/money.ts`), rounded half away from zero. Every cost is exactly one `CostLine`; never add fees on top of an all-in fare.
- The engine in `src/domain/` is pure: no I/O, no clock, no framework imports. LLMs never compute prices, points or savings.
- Every server input and output goes through the zod schemas in `src/contracts/`.
- Never label fixture or test data as real. Duffel: `duffel_test_` tokens only; fail closed on `live_mode !== false`. Never retry order creation.
- Never ask for or store card numbers, CVV, PINs or real passenger data. Demo travellers and wallets are fictional.
- Secrets stay server-side (`src/server/env.ts`); run `pnpm check:secrets` and `pnpm check:bundle` before pushing.
- Every change: update tests first or alongside; run `pnpm verify`, `pnpm build`, and `pnpm test:e2e` for UI changes; record results in `docs/implementation/EVIDENCE.md`.
