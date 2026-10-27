# Implementation evidence (A Una Milla)

Only what is recorded here counts as done. Every entry lists the real commands and results. Environment: Windows 10 (26300), Node 24.11.0, pnpm 10.32.1, Playwright Chromium. Times are IST.

## Baseline — 27 Oct 2026 10:32

- Both GitHub repos were empty (`git ls-remote`: no refs). They were cloned into `frontend/` and `backend/` (branch `main`, no commits).
- `gh auth status`: **not logged in**. No Git credential helper is configured, so pushing is blocked until the owner authenticates.
- The Docker CLI is installed. The daemon was not running at baseline, and Docker Desktop was started at 11:58.
- No Supabase CLI or Vercel CLI is installed globally.

## TASK-000..002 — repo baseline, toolchain, compatibility spike

**Scaffold:** `pnpm dlx create-next-app@16.4.3 . --ts --tailwind --eslint --app --src-dir --use-pnpm --disable-git --yes`.

**Compatibility findings**

| Package | Planned | Used | Why |
|---|---|---|---|
| ESLint | 10.13.0 | **9.39.5** | Next 16.4.3's official template pins it; confirmed with `eslint-config-next` 16.4.3 |
| TypeScript | 5.9.3 | 5.9.3 | Pinned (7.x avoided) |
| React | 19.3.1 | 19.3.0 | Kept the template's tested pair |
| Tailwind | — | 4.3.3 | Via `@tailwindcss/turbopack` |
| MSW | — | 3.0.3 | Unmocked-request option renamed to `onUnhandledFrame` (`onUnhandledRequest` no longer exists) |

The template enables `cacheComponents` and `partialPrefetching`. Pages that use URL or clock data render client islands inside `<Suspense>`.

**Deviations from ADR-001**
- **next-intl:** not installed. The P0 strings live in `src/i18n/en.ts`, ready for a Spanish catalogue later.
- **@duffel/api:** not used. The adapter calls the Duffel REST API with `fetch`, which makes `live_mode` checks and MSW mocking explicit.
- **Supabase client:** not installed, because guest mode is the only mode (D-29).

**`.gitignore` and `.env.example`:** `git add --dry-run .env.example` → `add '.env.example'`. A probe `.env.local` → "ignored by one of your .gitignore files". `pnpm check:env-files` passes.

## TASK-010..014 — engine, fixtures, providers (doc 12 §A–C)

`pnpm vitest run` → **8 files, 68 tests passed** (27 Oct 11:59). The suites:

| Suite | Tests | Covers |
|---|---|---|
| `tests/unit/engine/money.test.ts` | 13 | Half-away rounding, percentages (T-CALC-002), FX €89.34 (T-CALC-008), stale and missing FX fail closed |
| `tests/unit/engine/savings.test.ts` | 16 | CS-01 €78/10.0%, CS-02 not bookable, CS-02b €466.50, CS-03 €1,674/57.7%/−€2,520, CS-04 €98 and v* €0.0091, Goal A/B, FX-CASH-08 v* €0.0079, duplicate cost line rejected, zero saving, missing valuation, stale FX, no normal price, deterministic tie-break |
| `tests/unit/engine/multiCity.test.ts` | 6 | CS-05 open-jaw €970 with the rejected €920 "Needs 50,000 Avios; you have 30,000"; Goal A cash-today bound; UNIT-MULTI-LIMIT (3 nodes: approximate and never worse than greedy or N); 6×24 worst case ≤ 50,000 nodes under 2 s; order independence; whole-trip fares compete fairly |
| `tests/unit/engine/wallet.test.ts` | 5 | T-CALC-010/011 transfer increments and ratios, programmes never summed, suspended routes ignored, shortfall reported |
| `tests/unit/engine/awardSteps.test.ts` | 3 | Seat check before transfer, transfer sized to the gap, insufficient points → no steps |
| `tests/integration/search-api.test.ts` | 18 | CS-01/03/04 through the HTTP handler; 400 field paths; bad JSON; 429 + Retry-After; Duffel (MSW) mapping with unknown refund (T-INT-010); 500 → exactly 2 calls then `fixture_fallback`; `live_mode: true` → fail closed; malformed → fallback; USD conversion and FX_STALE; non-test token refused; 8 s timeout → `timeout` outcome; plan CS-05; 422 for 7 legs; 400 for out-of-order dates |
| `tests/integration/booking-api.test.ts` | 6 | T-INT-004 €702 → €719 (409 until re-confirmed), 410 expired, idempotent key, Duffel balance order with the synthetic traveller and exactly 1 POST, failed order → PROVIDER_ERROR after 1 attempt, live-mode order → TEST_MODE_REQUIRED |
| `tests/integration/no-network.test.ts` | 1 | An unmocked request fails |

## TASK-015..022 — UI, Quick Flight, Full Trip Plan, wallet, award steps, checkout

**Checks**

| Command | Result |
|---|---|
| `pnpm verify` | Prettier clean, ESLint 0 problems, `tsc` 0 errors, 68/68 tests, secret scan "122 files, 0 findings", env-file check passed |
| `pnpm build` | 18 routes. Pages are static shells (○); `/api/*` are dynamic (ƒ). |
| `pnpm check:bundle` | "26 files, no server secrets or server env names" |
| `pnpm exec playwright test --project=mobile-360 --project=tablet-768 --project=desktop-1280` | **84 passed** (28 tests × 3 viewports, 1.0 min) against `pnpm start` (fixture mode) |

**Playwright coverage**
- **Quick Flight:** demo trip → results → detail → reload; €78/10.0%; cash better by €98 with break-even €0.0091; form validation with focus and `aria-invalid`; incomplete link; 500 then retry; fixture-fallback label; empty state; API validation error.
- **Booking and awards:**
  - checkout with a price change (€702 → €719) and the "TEST BOOKING – no ticket issued, no money charged" label;
  - award steps without a transfer;
  - award steps with a transfer locked until the seat checkbox is ticked.
- **Plan and wallet:**
  - CS-05 plan with its rejection reason;
  - plan builder add, remove and validate;
  - approximate-search notice;
  - wallet with separate programmes;
  - Clear demo data empties localStorage.
- **Accessibility and layout:**
  - axe (WCAG 2.1 A/AA) and a no-horizontal-overflow check on 12 screens;
  - full-page screenshots in `test-results/screens/<viewport>-<page>.png`;
  - skip-link keyboard test.

**Defects found by these tests and fixed (not by weakening tests)**
- **Contrast:** gold and terracotta tokens failed axe colour-contrast; both were darkened.
- **Markup:** `<dl>` contained a button (`definition-list`); the hero markup was restructured.
- **Mobile overflow:** a `whitespace-nowrap` badge made the wallet page 436 px wide at 360 px; badges now wrap.
- **Rate limit:** the per-IP search limit (20/min) blocked parallel e2e runs. It is now configurable with `RATE_LIMIT_PER_MIN` (default 20; 2000 only for the e2e server). The 429 path is covered by an integration test.
- **Test locators:** fixed where they were ambiguous (`getByLabel('To')` substring matches, Next's route announcer as a second `alert`).

**Manual visual review**
- **Desktop 1280:** landing, results (CS-03), plan results.
- **Mobile 360:** results (CS-01), hero, option cards, in the IDE browser with device emulation.
- **Fixes from the review:** the hero repeated the headline sentence; mixed €780 / €702.00 formats; plan tables had cramped columns.

## Not done or not verified (as of this entry)

- **Backend:** no migrations run yet. Docker was just started.
- **Duffel:** never called for real; no test token is configured. All Duffel behaviour is verified with MSW only.
- **Deployment and Git:** no deployment; no push (`gh` not authenticated). gitleaks has not run yet; it needs Docker. The fallback `pnpm check:secrets` passed.
- **Real-world rules:** card, transfer and award rules are UNVERIFIED or ILLUSTRATIVE and labelled as such in the UI.
