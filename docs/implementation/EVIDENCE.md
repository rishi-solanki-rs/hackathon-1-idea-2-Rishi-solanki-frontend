# Implementation evidence (A Una Milla)

## Round 4 — 27 Oct 2026 ~16:20 IST (master fix plan: booking, engine, account safety)

**Fixed (each with a regression test)**
- Booking with more than one adult failed: Duffel rejected duplicate example names (`duplicate_passenger_names`), shown as "did not respond". Now one distinct example traveller per adult; provider 4xx → `BOOKING_REJECTED` (422) with a plain message.
- Order timeout: the outcome is `OUTCOME_UNKNOWN` (504) until reconciled. Every order carries `metadata.aum_key`; the server looks the order up before any POST and after a lost response, and never blindly resubmits. "Check again" only looks up.
- The price shown is the price paid: one repriced offer snapshot is used for both.
- Stale booking page (book A, open B, still saw A): the booking view is keyed by the offer URL.
- Boarding-pass ticket (`Ticket.tsx`) with airline, flights, times, cabin, bags, refund/change and the total.
- Award estimates only for a programme the user picks; only Iberia Club with the official distance-band chart (no First, peak price with off-peak range). The 596,000-Avios First estimate is gone.
- Category caps per product; unknown caps lower confidence instead of a universal cap; overflow earns the base rate, never more.
- Card posting delay separate from transfer delay; expiry checked against the booking date; earnings dated.
- Refundable purchases kept, flagged; trip budget separate from the cash reserve.
- Supabase: sign-out clears local plan data (cross-account leak); saves/deletes check the result (no false success); conflict banner when browser and account answers differ; login `next` limited to same-site paths.
- Card editor opens directly after adding a card.

**Gates run**
- `pnpm verify`: format, lint, typecheck, 173 unit/integration tests, secret/env/encoding checks — pass.
- `pnpm build:e2e` (Supabase public values blanked; bundle scanned: no project ref) — pass.
- Playwright desktop-1280 (plan-flow, booking, quick-flight, plan-and-wallet): 25/25 after updating two specs for the renamed award choice and the auto-open editor. Full mobile-360 suite incl. axe light/dark: 53 passed, 2 skipped (live-only).
- Live Duffel test: 4-adult order created and found again by key.

**Not done this round:** palette change to Midnight Indigo/Vanilla, multi-city booking, structured Gemini output.

## Round 3 — 27 Oct 2026 ~14:45 IST (minimal planner rebuild: login, recommendations, mobile-first UI)

**Auth:** Supabase auth configured via the Management API (`scripts/live/configure-auth.mjs`, PATCH 200, then re-read): email sign-up on, autoconfirm on, anonymous off, password ≥ 8, site URL + redirect list. Access token local only.

**What changed**
- Wizard: per-field validation (`src/lib/planValidation.ts`), errors under the field with `aria-invalid`/`aria-describedby`, focus on the first error, Next blocked, "Fix N fields" line, sticky Back/Next bar on mobile, card summary row + Edit, spending presets, payment as big buttons, labelled award estimate only when the user holds points.
- Engine: `src/domain/newCards.ts` (daily card per spend; new-card ideas with the official Amex Gold welcome offer, pro-rated fee, apply-by date, gates) and `src/domain/bookingWindow.ts` (Easter/Spanish peaks, rule-of-thumb windows, price calendar, price trend). Integrated into `computePlan`, the result contract and the Gemini facts/guard.
- Amex Gold welcome terms re-read on official American Express Spain pages (27 Oct 2026): 2,000 MR per 30-day month with ≥ €1,000 spend, first 10 months, max 20,000; new cardholders only; usually 10 working days to post, up to 180.
- Result screen: recommendation + one main button, next 3 steps, when to book, your cards, your points, AI (opens on demand), details folded.
- `/compare` (One trip / Multi-city tabs), `/trips/multi` → redirect, clean home, `/login`, `/my-plans`, header account button.

**Checks (local, 27 Oct ~14:40)**

| Check | Result |
|---|---|
| `pnpm verify` | Pass: format, lint, types, **136** unit/integration tests, secret scan 0 findings, env, encoding |
| Playwright (fixture server) | **161 passed**, 3 skipped (LIVE-only): 53 journeys × 360/768/1280 + 5 smoke, light + dark, axe clean, no horizontal overflow |
| `pnpm test:live` | Pass (5/5): Duffel 7 dates priced, reprice, **Duffel TEST order** created; Gemini `gemini-3.5-flash-lite` explanation accepted by the guard; Supabase email accounts A/B: RLS isolation, re-login restores data, test users deleted |
| `pnpm build` + `check:bundle:local` | Pass, no server secrets or server env names in 30 client files |

**Deployed checks:** production deployment of `87d0d3c` READY; `test:smoke` 5/5 on https://a-una-milla-demo.vercel.app; LIVE UI journey passed (Duffel test fares → "Written by AI (gemini-3.5-flash-lite), checked against the plan" → Duffel TEST booking). A new LIVE account journey (`tests/e2e/live-account.spec.ts`) then **failed on production**: after signing up, nothing was saved (no request to `plans`). Cause: the Supabase auth callback updated React state synchronously, so sync code ran inside the callback and waited on the auth lock forever. Fixed by deferring the callback (`src/lib/auth.ts`). The test itself also had a race (a full page load right after the result cancelled the save in flight); it now waits for the save response.

**Production now runs `2719973`** (CI green, deployment `dpl_AL5x96eK1WaKEn8bqzy4hGKK4V2e` READY, aliased to https://a-una-milla-demo.vercel.app). On production: `test:smoke` 5/5; LIVE plan journey passed (Duffel test fares → AI explanation accepted → Duffel TEST booking); **LIVE account journey passed twice** (create account → plan → saved (POST `plans` 201) → My plans shows it → log out → log in → still there). Test users cleaned up (0 left). Later commits change tests/docs only.

Found and fixed during QA: the AI guard rejected "approval is not guaranteed" (a caveat), now allowed while positive guarantees and price forecasts are rejected; the award estimate is no longer applied for users with no points; the multi-city submit button no longer says "Plan my trip".

## Round 2 verification — 27 Oct 2026 ~12:50 IST (real providers, values never printed)

**Credentials:** `frontend/.env.local` (gitignored, confirmed with `git check-ignore`). `scripts/live/check-connections.mjs` reports lengths only.

**Connection results**

| Integration | Result |
|---|---|
| Duffel test | `POST /air/offer_requests` MAD→LHR → HTTP 201, `live_mode=false`, 91 offers (sandbox data from several airlines + Duffel Airways), EUR |
| Gemini | Gemini API key, valid (`GET /v1beta/models` → 200). `gemini-2.5-*` → 404 "no longer available to new users". **`gemini-3.5-flash-lite` → 200 "ok" (3.3 s)**, `gemini-3.5-flash` → 200, `gemini-3.8-flash` → 503 (high demand). Vertex endpoint → 403 (API not enabled; not needed). |
| Supabase project `qcvlnffgqjddvadzbppd` (ap-southeast-2) | Auth health 200. Settings: `anonymous_users=false`, email on, autoconfirm off. REST `airports` → PGRST205 (no tables). |
| Supabase DB | Reachable via the `aws-0-ap-southeast-2` session pooler. `migration list`: 0 of 3 applied remotely. `db dump --schema public` contains only Supabase's `rls_auto_enable` event-trigger function: no user tables, no data. |

## Round 2 result — 27 Oct 2026 ~14:00 IST (personalised plan flow, real integrations, public release)

**Main flow:** `/plan` "Plan my trip", 5 steps: trip (date range up to 60 days + stay range + goal + optional book-by), cards, points, spending, then the plan.

**Engine (pure, `src/domain/`):** `cards.ts` (allocation), `forecast.ts`, `verdict.ts`, `flexDates.ts`, `plan.ts` (orchestrator + actions), `replan.ts`, `explainGuard.ts`.

**Defects found and fixed in this round**
- 900 × (1/3) floored to 299 points instead of 300 (float error).
- A requested example fare was ignored by the verdict ("too uncertain" while a fare was shown).
- The example-fare choice was lost on re-plan, producing a fake "fare changed" line.
- The explain rate limit was hard-coded.
- PowerShell writes corrupted 14 characters in `PlanResults.tsx`, which had shipped earlier; repaired and guarded by the new `check:encoding`.
- `supabase-js` false positive in the bundle check.

Each defect has a regression test or check.

**Live verification (real network, values never printed)**

| Check | Result |
|---|---|
| `pnpm test:live` providers | Duffel 7 sampled dates → `ok`, cheapest €112.92 `LIVE_TEST_DUFFEL`; reprice unchanged; **real Duffel TEST order created**; Gemini `gemini-3.5-flash-lite` explanation accepted by the fact guard in 1.6 s |
| `pnpm test:live` Supabase | Hosted catalogue read (5 cards) passed; `planner_profiles` → 42501 for anon; anonymous round trip **skipped: anonymous sign-ins are disabled** in the project (owner setting) |
| `LIVE=1` UI journey, local real-env server | Passed: wizard → Duffel fares → "AI-written (gemini-3.5-flash-lite)" → test booking with "TEST — no real ticket issued; no money charged" |
| Same UI journey on the public URL | **Passed (20 s)** |

**Hosted Supabase (`qcvlnffgqjddvadzbppd`)**
- `db push --dry-run` reviewed (5 additive migrations + seed), then applied.
- `migration list`: 5/5 local = remote.
- Public REST: airports 200, card_products 200, planner_profiles 401/42501.

**Mocked and local suites**

| Suite | Result |
|---|---|
| `pnpm verify` | Prettier, ESLint, `tsc`, **114/114** Vitest (12 files), secret scan (171 files), env-file check, encoding check (165 files) |
| Local pgTAP | `Files=4, Tests=57, Result: PASS`; `db lint` clean |
| Playwright 3 viewports (fixture-mode server) | **129 passed, 3 skipped** (the live spec, which runs only with `LIVE=1`). Covers the planner journeys, light and dark axe, and no overflow. |
| `pnpm build && pnpm check:bundle:local` | Passed; the actual Duffel, Gemini and DB-password values are absent from the client bundle |
| gitleaks | Frontend and backend histories: no leaks |

**CI (GitHub Actions)**
- app-ci `043dfe9`: **success**.
- db-ci `ca06e0c`: **success**.

**Release (public, as the owner approved)**
- Vercel project `a-una-milla-demo`, production deployment `dpl_BA34Sa9KHVLuVfrQ5DToZi9uL1DU`, **READY from `043dfe9976f66dd08e7d979223a894a8f5acc1c6`**.
- URL: **https://a-una-milla-demo.vercel.app** (also `a-una-milla-demo-rishi-solankis-projects.vercel.app`).
- Unauthenticated `curl`: `/` 200, `/plan` 200, `/api/health` 200 → `provider: duffel_test`.
- `BASE_URL=https://a-una-milla-demo.vercel.app EXPECT_PROVIDER=duffel_test` smoke: **5 passed**.
- Env vars (production + preview): `PROVIDER_MODE`, `AUTH_MODE`, `FX_LIVE`, `RATE_LIMIT_PER_MIN`, `NEXT_TELEMETRY_DISABLED`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `DUFFEL_ACCESS_TOKEN` and `GEMINI_API_KEY` as **Sensitive**. `SUPABASE_DB_PASSWORD` is **not** in Vercel.
- Commits after `043dfe9` change only tests and docs (smoke assertions, evidence); app code is identical.

**Remaining limits**
- Account persistence needs "Allow anonymous sign-ins" ON in Supabase; until then the app shows "Saved in this browser only".
- Award seats are never checked.
- Card posting delays are unknown unless entered.
- Transfer routes are unverified.
- No price forecasting.

**Gap map before round 2 (the main flow was missing)**
- No screen collects the user's cards, spending or planned purchases.
- The wallet defaults to fictional presets.
- Results come from fixtures; Duffel is not wired in the UI.
- No card allocation, verdict, action list or re-plan.
- No AI explanation.
- No database persistence.
- Flexible dates are limited to ±3 days.

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

## Backend (Phase 8) — 27 Oct 2026 ~12:10

Repo `backend/`, Supabase CLI 2.122.0 (pinned dev dependency), local Docker image `supabase/postgres:17.11.0.006`.

**Commands**

| Command | Result |
|---|---|
| `pnpm exec supabase db reset --local` | Applied `20261027120000_catalogue.sql`, `20261027120100_user_data.sql`, `20261027120200_guest_migration_rpc.sql` and `seed.sql` |
| `pnpm exec supabase test db --local` | **Files=3, Tests=41, Result: PASS** |
| `pnpm exec supabase db lint --local --level warning` | "No schema errors found" |
| gitleaks (Docker) on the backend history | 2 commits, no leaks |

**What the 41 pgTAP tests prove**
- **RLS and policies:** RLS is enabled and at least one policy exists on every public table.
- **Grants:**
  - `anon` can only read the catalogue.
  - Users cannot change the catalogue.
  - Test bookings cannot be updated or deleted.
  - Only signed-in users can execute the guest-migration RPC.
- **Row isolation:** user B cannot read, update or delete user A's trips, legs or balances.
- **Cross-user blocks:**
  - B cannot create a row owned by A (RLS, 42501).
  - B cannot attach a leg to A's trip (composite FK, 23503).
  - `anon` gets "permission denied".
- **Test bookings:** a duplicate idempotency key is rejected (23505), and only SIMULATED or DUFFEL_TEST modes are accepted.
- **Guest migration:** `migrate_guest_data` runs exactly once per migration ID, does not overwrite on repeat, rejects malformed payloads and requires a signed-in user.
- **Catalogue honesty:** a transfer rule cannot be VERIFIED without a source and a check date. The seed contains no VERIFIED rules.

**Not done:** the hosted Supabase project (owner action), the auth runtime spike (TASK-003) and the frontend `AUTH_MODE=supabase` wiring. Guest mode is the only mode the app offers.

## Hardening — 27 Oct ~12:20

`next.config.ts` now sets `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` and HSTS, and turns off `poweredByHeader` and browser source maps. `pnpm test:smoke` (local) → **4 passed**, including the headers check.

**Regression after hardening**

| Command | Result |
|---|---|
| `pnpm verify` | 68/68 tests; secret scan 125 files, 0 findings |
| `pnpm check:bundle` | Passed |
| Playwright on 3 viewports | **84 passed (1.7 min)** |

## Master Fix & Modern UI Verification — 27 Oct 2026

| Gate | Command | Result |
|---|---|---|
| Mocked unit & integration + static checks | `pnpm verify` | **17 test files, 180/180 tests passed**; Prettier, ESLint, `next typegen && tsc --noEmit`, secret scan (197 files, 0 findings), env-file check, encoding check all passed |
| Production build & client bundle audit | `pnpm build:e2e && pnpm check:bundle` | **Passed** (29 client chunks, 0 server secrets or server env names) |
| Playwright E2E + axe-core WCAG AA (360 / 768 / 1280, light & dark) | `pnpm test:e2e` | **164 passed, 0 failed** (Midnight Indigo `#282B4A` / Vanilla `#EEEBDA` palette, boarding-pass `Ticket`, 3-line plan summary, official rate override warning + reset, multi-city ticket booking) |
| Live providers (Duffel test mode 1 & 4 adults, Gemini 3.5, Supabase RLS) | `pnpm test:live` | **2 test files, 6/6 passed** (7 sampled dates priced, 1-adult & 4-adult test orders created with distinct travellers and reconciled by `aum_key`, structured Gemini explanation verified by guard, Supabase cross-user isolation verified) |

## Release — 27 Oct 2026 ~13:15 (supersedes the blocker table below)

**GitHub (both repos pushed)**
- Git Credential Manager (`manager-core`, system config) had a stored credential. `gh` is still not logged in, but the push did not need it.
  - frontend `main` = `82b14c36d62dea6ab17bdd5e2a76935dca453f17` (plus a later evidence-only commit);
  - backend `main` = `af3214d`.

**GitHub Actions**

| Run | Result | Note |
|---|---|---|
| app-ci on `149444d` | Failed | `pnpm install --frozen-lockfile`: the lockfile still had `^` specifiers after the exact pins |
| app-ci on `7a478bd` | Failed | `tsc`: `next-env.d.ts` is gitignored, so `.jpg` imports were untyped on a fresh checkout |
| app-ci on `b062ca8` | **Success** | Fixed by `typecheck: next typegen && tsc` |
| app-ci on `82b14c3` | **Success** | Ubuntu: verify, build, bundle check, Playwright 3 viewports, gitleaks |
| db-ci on `41fcf44` and `af3214d` | **Success** | `supabase db reset` + 41 pgTAP + `db lint` + gitleaks |

**Fresh Windows clone**
- `pnpm install --frozen-lockfile && pnpm verify` → 68/68.
- An earlier run found CRLF files from `core.autocrlf` failing Prettier. Fixed with `.gitattributes` (`eol=lf`) in both repos.

**Vercel (owner's Hobby account, non-commercial demo, owner approved team access in the browser)**
- **Project:** `a-una-milla-demo` (`prj_Io2H0ba6Zm895lnVhwLx5eAQPtaV`). Not Git-linked, so pushes do not auto-deploy. Functions run in `cdg1`, on Node 24.x. Env (preview + development only): `AUTH_MODE=guest`, `PROVIDER_MODE=fixture`, `FX_LIVE=on`, `RATE_LIMIT_PER_MIN=20`.
- **Production avoided:** the first deployment from `main` was auto-targeted to **production** by Vercel. It was **cancelled before it went live** (`dpl_Fw3R…`, `CANCELED`). After that, only the branch `demo-preview` (same commits) was deployed, with `target: null` (preview).
- **Tested deployment:** `dpl_GmC8PgS5qaDFoT2FN8DqJhJ5JZdS` from `82b14c3`, READY.
  - URL: `https://a-una-milla-demo-9mw6bkxt0-rishi-solankis-projects.vercel.app`
  - Branch alias: `a-una-milla-demo-git-demo-preview-rishi-solankis-projects.vercel.app`
- **Protection:** an unauthenticated `curl` gets 302 to `vercel.com/sso-api`. The preview is protected by Vercel Authentication.
- **Share link:** a temporary 23-hour share link was created for testing and for the owner (expires 28 Oct 2026 05:32 UTC). It is not stored in the repo.

**Tests against the deployed preview (via the share session)**

| Command | Result |
|---|---|
| `BASE_URL=… SHARE_URL=… pnpm exec playwright test --project=smoke` | **4 passed**: health (guest mode), disclosure + form, labelled search, security headers |
| `… --project=desktop-1280 -g "T-FUN-003\|T-FUN-001\|T-FUN-002\|T-INT-004"` | **4 passed**: CS-03 €1,674 and detail reload, CS-01 €78, CS-05 open-jaw, test checkout €702 → €719 |

A first attempt at the deployed journeys failed 8/8 because the viewport projects lacked the share cookie (screenshot: Vercel login page). This was a harness fix, not an app change.

## Release status and blockers (27 Oct ~12:25, historical)

| Item | Status |
|---|---|
| Frontend commits | 7 on `main` (local only) |
| Backend commits | 2 on `main` (local only) |
| Push to GitHub | **Blocked.** `gh auth status` says not logged in, and no Git credential helper is configured. The owner must run `gh auth login` (or configure a credential). |
| Vercel | The MCP connector is authenticated to the owner's **Hobby** account. No project or deployment has been created. MCP file-upload deployment is impractical for this source size, so the route is Git (after the push) or `vercel login` + CLI. The plan is a **preview** deployment (protected by Vercel Authentication; nothing in production) until the owner approves D-33. |
| Duffel test mode | Code complete and MSW-tested. Needs an owner-supplied `duffel_test_` token in Vercel env; never called for real. |
| Real-world rules | Card, transfer and award rules are UNVERIFIED or ILLUSTRATIVE and labelled as such in the UI. |
