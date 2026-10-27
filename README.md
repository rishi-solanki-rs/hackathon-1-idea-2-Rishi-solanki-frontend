# A Una Milla — frontend (Next.js app)

Hackathon 1 · Project B. A Spain-first travel-hacking planner: compare cash and points for a flight or a multi-flight trip, see the saving in euros and %, book a cash fare in **test mode**, or follow guarded award-booking steps.

> **Demo only.** Prices are illustrative fixtures or Duffel **test** data, never real market fares. Test bookings issue no ticket and charge nothing. Guest mode: all user data stays in the browser.

## Stack

Next.js 16.4.3 (App Router, Cache Components, Route Handlers) · React 19.3 · TypeScript 5.9.3 · Tailwind 4.3 · zod 4.6 · decimal.js · Vitest 5 + MSW 3 · Playwright 1.64 + axe-core. Node ≥ 22 (tested on 24.11), pnpm 10.32.1.

## Run locally

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # defaults: AUTH_MODE=guest, PROVIDER_MODE=fixture
pnpm dev                     # http://localhost:3000
```

Optional Duffel test mode: set `PROVIDER_MODE=duffel_test` and a `DUFFEL_ACCESS_TOKEN` that starts with `duffel_test_`. Any other token disables the adapter, and any response with `live_mode !== false` fails closed.

## Verify

```bash
pnpm verify            # format check, lint, typecheck, unit + integration tests, secret scan, env-file check
pnpm build && pnpm check:bundle   # production build + client-bundle secret check
pnpm exec playwright install chromium
pnpm test:e2e          # starts `pnpm start` on :3200; 360 / 768 / 1280 px projects with axe
BASE_URL=https://<demo-domain> pnpm test:smoke
```

Unit and integration tests block all network access (MSW `onUnhandledFrame: 'error'`).

## Layout

```
src/domain/      pure engine: money, FX, cost model, savings, break-even, ranking, multi-city search, wallet, award steps
src/contracts/   zod request/response schemas (validated on the server for every input and output)
src/providers/   fixture flights, Duffel test adapter (guarded), Frankfurter FX + bundled snapshot
src/server/      server-only: env, search service, booking (reprice, simulated/test orders), HTTP helpers
src/app/         pages and Route Handlers (/api/search/quick, /api/search/plan, /api/booking/*, /api/health)
src/components/  UI
tests/           unit, integration (MSW), e2e (Playwright + axe)
docs/            product + technical specification and implementation evidence
```

Specification: [`docs/PROJECT_B_MASTER_PLAN.md`](docs/PROJECT_B_MASTER_PLAN.md). Evidence: [`docs/implementation/EVIDENCE.md`](docs/implementation/EVIDENCE.md).
