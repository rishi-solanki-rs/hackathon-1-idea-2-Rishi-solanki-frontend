# Technical 07: Testing and Feature Verification Plan

| Field | Value |
|---|---|
| Status | **Plan only. No test exists and none has been executed.** Commands are provisional; TASK-002 finalises them. |
| Baseline | 181 Phase 1 test IDs (doc `../02_EDGE_CASES_AND_ACCEPTANCE_TESTS.md` §6) + DB-001..018 (doc 03 §7) |

## 1. Test layers and tools

| Layer | Tool (pinned, doc 01 §5) | Repo / location | Runs in CI | Needs |
|---|---|---|---|---|
| Unit: domain engine, schemas, logger, validator | Vitest 5.0.5 (+ coverage-v8) | `frontend/tests/unit/**` | Every push | Node 24 |
| Integration: providers (MSW-mocked HTTP), Route Handlers, DAL with a mocked Supabase client | Vitest + MSW 3.0.3 | `frontend/tests/integration/**` | Every push | Node 24 |
| Database: RLS, grants, constraints, RPCs | pgTAP via `supabase test db` (CLI 2.122.0) | `backend/supabase/tests/database/**` | Backend repo CI (Docker in GitHub Actions) | Docker |
| End-to-end and responsive | Playwright 1.64.1; projects `mobile-360`, `tablet-768`, `desktop-1280` (Chromium; WebKit in P1) | `frontend/tests/e2e/**` | Every PR (fixture mode) | Browsers installed with `--with-deps` |
| Accessibility | @axe-core/playwright 4.14.0 inside E2E | `frontend/tests/e2e/a11y.spec.ts` | Every PR | — |
| Smoke on the Vercel demo URL | Playwright with `BASE_URL` = demo URL | `frontend/tests/smoke/**` | After deploy (manual trigger) | Deployed URL |
| Performance | Lighthouse (manual, real phone) | — | No | REQ-NFR-11 |
| Secret scan | gitleaks Docker image | both repos | Pre-push + CI | Docker |

## 2. Fixture strategy

- All ILLUSTRATIVE fixtures from Phase 1 doc 02 §5 live in `frontend/src/fixtures/*.ts` as typed constants, with their expected outputs alongside: FX-CASH-*, FX-AWARD-*, FX-MULTI-01, FX-BAL-*, FX-CARD-T/A/B/C/D/K/M/U/T2/AIRE/REV, FX-EXP-*, FX-WIN-*, FX-VAL, FX-RATE-01, FX-RULE-01, FX-REF-01, FX-CASH-08, FX-PRICE-01, FX-FCST-01.
- **CI runs with `PROVIDER_MODE=fixture`, `AUTH_MODE=guest`** and no external network. MSW blocks unexpected requests.
- The Duffel test integration (`[INT]` tests T-FUN-005, T-DEMO-002) runs **manually** with a test token. It is not required in CI because the test-mode rate limit is unverified.

## 3. CI pipelines (GitHub Actions; both repos public, so standard runners are free, `[VERIFIED]`)

**Frontend** `.github/workflows/ci.yml`:

```
setup: actions/setup-node (24), pnpm (packageManager), pnpm install --frozen-lockfile
1 format   pnpm format:check
2 lint     pnpm lint            (incl. domain import boundary + banned-words rule)
3 types    pnpm typecheck       (tsc --noEmit)
4 unit     pnpm test:unit       (vitest run tests/unit --coverage)
5 integ    pnpm test:integration
6 build    pnpm build           (+ secret-in-bundle scan: T-SEC-003)
7 e2e      pnpm exec playwright install --with-deps chromium && pnpm test:e2e
8 secrets  gitleaks (docker)
```

**Backend** `.github/workflows/db.yml`:

```
supabase/setup-cli (pinned 2.122.0) -> supabase start -> supabase db reset -> supabase test db -> gitleaks
```

## 4. Mandatory per-task testing loop (applies to every TASK-* in doc 09)

| Step | When | Command (provisional) | Pass condition |
|---|---|---|---|
| 1 | Always | `pnpm format:check && pnpm lint && pnpm typecheck` | 0 errors |
| 2 | Domain change | `pnpm vitest run tests/unit/<area>` | All targeted tests pass; listed fixtures match exactly |
| 3 | Provider/server change | `pnpm vitest run tests/integration/<area>` | Pass; no unhandled network |
| 3b | DB change (backend repo) | `supabase db reset && supabase test db` | All DB-* pass |
| 4 | User-facing change | `pnpm playwright test tests/e2e/<spec> --project=mobile-360 --project=tablet-768 --project=desktop-1280` | Pass incl. axe (no serious/critical) |
| 5 | Always | Check the task's listed EC-* behaviours and messages | All verified |
| 6 | Always | `pnpm build` | Success |
| 7 | Integration/deploy gates (TASK-022, TASK-043) | Full suite + build + Vercel deploy + `BASE_URL=<demo> pnpm test:smoke` | All pass |
| 8 | Always | Update the evidence log `frontend/docs/implementation/EVIDENCE.md` | Entry recorded |

**Evidence format** (one entry per task):
- task ID, date;
- commit SHA;
- commands run, with pass/fail counts;
- failures fixed;
- skipped tests, with reason;
- screenshots (paths) for UI;
- deployment URL (if any);
- residual risks.

**A task is not done without its evidence entry.**

## 5. Required coverage areas (cross-check)

| Area | Tests |
|---|---|
| Corrected arithmetic fixtures | T-CALC-001..008, 022, 023, T-ALLOC-102 (€50.14), T-TIME-105 (€2.00) |
| Card plateaus, caps, Aire ambiguity | T-CALC-016, 020, 114, 115 |
| Post-deadline bonuses | T-TIME-105, T-TIME-112 |
| Unavailable awards | T-REG-012, T-FLOW-013, T-CALC-005 |
| Long-horizon trips | T-VAL-003, T-TIME-010, T-TIME-012 |
| Guest migration | T-FLOW-017, DB-009, DB-010 |
| Multi-city shared points + limit fallback | T-CALC-007, T-FLOW-009, UNIT-MULTI-LIMIT (new engine test: synthetic 6×5 input with a tiny node cap returns "approximate" + N + greedy) |
| Concurrent replanning | T-REG-016, DB-011 |
| Provider failures | T-INT-001..010 |
| RLS isolation | T-SEC-001, DB-001..004, DB-013, DB-014 |

## 6. Mapping of all 181 Phase 1 test IDs

**Legend**
- Layer: **U** = unit (Vitest), **I** = integration (Vitest + MSW), **DB** = pgTAP, **E** = Playwright E2E, **S** = smoke on the demo URL, **M** = manual.
- Location prefix: `fe:` = frontend repo, `be:` = backend repo.
- Task: the implementing task in doc 09.
- Tier: VS (vertical slice), P0r (remaining P0), P1, P2.

| Test | Layer | Location | Task | Tier |
|---|---|---|---|---|
| T-A11Y-001 | E | fe:tests/e2e/a11y.spec.ts | TASK-022 | VS |
| T-A11Y-002 | E | fe:tests/e2e/keyboard.spec.ts | TASK-022 | VS |
| T-A11Y-003 | E | fe:tests/e2e/a11y.spec.ts | TASK-017 | VS |
| T-A11Y-004 | E | fe:tests/e2e/a11y.spec.ts | TASK-016 | VS |
| T-ALLOC-001 | U+DB | fe:tests/unit/allocation.test.ts; be:tests/database/ledger.sql (DB-006) | TASK-033 | P0r |
| T-ALLOC-002 | U | fe:tests/unit/allocation.test.ts | TASK-033 | P0r |
| T-ALLOC-003 | U | fe:tests/unit/allocation.test.ts | TASK-033 | P0r |
| T-ALLOC-004 | U+DB | fe:tests/unit/allocation.test.ts; be: DB-007 | TASK-033 / TASK-039 | P0r |
| T-ALLOC-005 | U | fe:tests/unit/rules.test.ts | TASK-102 | P1 |
| T-ALLOC-006 | U+DB | fe:tests/unit/forecast.test.ts; be: DB-008 | TASK-033 / TASK-039 | P0r |
| T-ALLOC-007 | U | fe:tests/unit/spending.test.ts | TASK-033 | P0r |
| T-ALLOC-008 | U | fe:tests/unit/allocation.test.ts | TASK-033 | P0r |
| T-ALLOC-102 | U | fe:tests/unit/allocation.cases.test.ts | TASK-033 | P0r |
| T-ALLOC-111 | U | fe:tests/unit/allocation.cases.test.ts | TASK-033 (P1 multi-bonus: TASK-103) | P0r/P1 |
| T-ALLOC-116 | U | fe:tests/unit/allocation.cases.test.ts | TASK-033 | P0r |
| T-CALC-001 | U | fe:tests/unit/savings.test.ts | TASK-011 | VS |
| T-CALC-002 | U | fe:tests/unit/money.test.ts | TASK-010 | VS |
| T-CALC-003 | U | fe:tests/unit/savings.test.ts | TASK-011 | VS |
| T-CALC-004 | U | fe:tests/unit/savings.test.ts | TASK-011 | VS |
| T-CALC-005 | U | fe:tests/unit/savings.test.ts | TASK-011 | VS |
| T-CALC-006 | U | fe:tests/unit/savings.test.ts | TASK-011 | VS |
| T-CALC-007 | U | fe:tests/unit/multileg.test.ts | TASK-018 | VS |
| T-CALC-008 | U | fe:tests/unit/fx.test.ts | TASK-010 | VS |
| T-CALC-009 | U | fe:tests/unit/valuation.test.ts | TASK-011 | VS |
| T-CALC-010 | U | fe:tests/unit/transfers.test.ts | TASK-012 | VS |
| T-CALC-011 | U | fe:tests/unit/transfers.test.ts | TASK-012 | VS |
| T-CALC-012 | U | fe:tests/unit/ranking.test.ts | TASK-011 | VS |
| T-CALC-013 | U | fe:tests/unit/ranking.test.ts | TASK-011 | VS |
| T-CALC-014 | U | fe:tests/unit/savings.test.ts | TASK-109 | P1 |
| T-CALC-015 | U | fe:tests/unit/rules.test.ts | TASK-032 | P0r |
| T-CALC-016 | U | fe:tests/unit/rules.test.ts | TASK-032 | P0r |
| T-CALC-017 | U | fe:tests/unit/rules.test.ts | TASK-102 | P1 |
| T-CALC-018 | U | fe:tests/unit/rules.test.ts | TASK-032 | P0r |
| T-CALC-019 | U | fe:tests/unit/rules.test.ts | TASK-032 | P0r |
| T-CALC-020 | U | fe:tests/unit/rules.aire.test.ts | TASK-032 | P0r |
| T-CALC-021 | U | fe:tests/unit/forecast.test.ts | TASK-034 | P0r |
| T-CALC-022 | U | fe:tests/unit/savings.test.ts | TASK-011 | VS |
| T-CALC-023 | U | fe:tests/unit/gapfill.test.ts | TASK-020 | VS |
| T-CALC-024 | U | fe:tests/unit/ref01.test.ts | TASK-020 | VS |
| T-CALC-025 | U | fe:tests/unit/allocation.cases.test.ts | TASK-033 | P0r |
| T-CALC-026 | U | fe:tests/unit/usable.test.ts | TASK-033 | P0r |
| T-CALC-101 | U | fe:tests/unit/allocation.cases.test.ts | TASK-033 | P0r |
| T-CALC-103 | U | fe:tests/unit/allocation.cases.test.ts | TASK-033 | P0r |
| T-CALC-104 | U | fe:tests/unit/allocation.cases.test.ts | TASK-033 (engine; UI P1) | P0r |
| T-CALC-106 | U | fe:tests/unit/savings.test.ts | TASK-011 | VS |
| T-CALC-108 | U | fe:tests/unit/gates.test.ts | TASK-033 | P0r |
| T-CALC-110 | U | fe:tests/unit/refusals.test.ts | TASK-034 | P0r |
| T-CALC-113 | U | fe:tests/unit/gates.test.ts | TASK-033 | P0r |
| T-CALC-114 | U | fe:tests/unit/marginal.test.ts | TASK-033 | P0r |
| T-CALC-115 | U | fe:tests/unit/marginal.test.ts | TASK-033 | P0r |
| T-CALC-117 | U | fe:tests/unit/marginal.test.ts | TASK-033 | P0r |
| T-CALC-118 | U | fe:tests/unit/marginal.test.ts | TASK-033 | P0r |
| T-CALC-119 | U | fe:tests/unit/marginal.test.ts | TASK-033 | P0r |
| T-DEMO-001 | E | fe:tests/e2e/demo.spec.ts | TASK-022 | VS |
| T-DEMO-002 | M/S | fe:tests/smoke/duffel-test.spec.ts (manual, test token) | TASK-031 | P0r |
| T-DEMO-003 | E | fe:tests/e2e/demo.spec.ts | TASK-022 | VS |
| T-DEMO-004 | S | fe:tests/smoke/script.spec.ts | TASK-043 | P0r |
| T-DEMO-005 | U+E | fe:tests/unit/copy.test.ts (catalogue scan) + demo script review | TASK-021 | VS |
| T-FLOW-001 | E | fe:tests/e2e/quick-flight.spec.ts | TASK-017 | VS |
| T-FLOW-002 | E | fe:tests/e2e/wallet.spec.ts | TASK-019 | VS |
| T-FLOW-003 | E | fe:tests/e2e/wallet.spec.ts | TASK-019 | VS |
| T-FLOW-004 | E | fe:tests/e2e/new-cards.spec.ts | TASK-101 | P1 |
| T-FLOW-005 | E | fe:tests/e2e/settings.spec.ts | TASK-041 | P0r |
| T-FLOW-006 | E | fe:tests/e2e/plan-ahead.spec.ts | TASK-036 | P0r |
| T-FLOW-007 | E | fe:tests/e2e/plan-ahead.spec.ts | TASK-036 | P0r |
| T-FLOW-008 | E | fe:tests/e2e/quick-flight.spec.ts | TASK-017 | VS |
| T-FLOW-009 | E | fe:tests/e2e/full-trip.spec.ts | TASK-018 | VS |
| T-FLOW-010 | E | fe:tests/e2e/plan-ahead.spec.ts | TASK-036 | P0r |
| T-FLOW-011 | E | fe:tests/e2e/replan.spec.ts | TASK-037 | P0r |
| T-FLOW-012 | E | fe:tests/e2e/replan.spec.ts | TASK-037 | P0r |
| T-FLOW-013 | E | fe:tests/e2e/replan.spec.ts | TASK-037 | P0r |
| T-FLOW-014 | E | fe:tests/e2e/checkout.spec.ts | TASK-031 | P0r |
| T-FLOW-015 | E | fe:tests/e2e/award-steps.spec.ts | TASK-020 | VS |
| T-FLOW-016 | E | fe:tests/e2e/trips.spec.ts | TASK-040 (guest: TASK-019) | P0r |
| T-FLOW-017 | E+DB | fe:tests/e2e/migration.spec.ts; be: DB-009/010 | TASK-040 | P0r (conditional D-29) |
| T-FLOW-018 | E | fe:tests/e2e/resume.spec.ts | TASK-019 / TASK-040 | VS/P0r |
| T-FLOW-109 | E | fe:tests/e2e/settings.spec.ts | TASK-041 | P0r |
| T-FLOW-121 | E | fe:tests/e2e/plan-ahead.spec.ts | TASK-036 | P0r |
| T-FUN-001 | E | fe:tests/e2e/quick-flight.spec.ts | TASK-017 | VS |
| T-FUN-002 | E | fe:tests/e2e/full-trip.spec.ts | TASK-018 | VS |
| T-FUN-003 | E | fe:tests/e2e/quick-flight.spec.ts | TASK-017 | VS |
| T-FUN-004 | E | fe:tests/e2e/award-steps.spec.ts | TASK-020 | VS |
| T-FUN-005 | M/I | fe:tests/integration/duffel-booking.test.ts (MSW) + manual test-token run | TASK-031 | P0r |
| T-FUN-006 | E | fe:tests/e2e/trips.spec.ts | TASK-040 | P0r (conditional) |
| T-FUN-007 | E | fe:tests/e2e/wallet.spec.ts | TASK-019 | VS |
| T-FUN-008 | E | fe:tests/e2e/cards.spec.ts | TASK-035 | P0r |
| T-FUN-009 | U+E | fe:tests/unit/spending.test.ts; e2e plan-ahead | TASK-035 | P0r |
| T-FUN-010 | E | fe:tests/e2e/plan-ahead.spec.ts | TASK-035 | P0r |
| T-FUN-011 | E | fe:tests/e2e/settings.spec.ts | TASK-041 | P0r |
| T-FUN-012 | E | fe:tests/e2e/quick-flight.spec.ts | TASK-017 | VS |
| T-FUN-013 | E | fe:tests/e2e/quick-flight.spec.ts | TASK-017 | VS |
| T-FUN-014 | E | fe:tests/e2e/how-it-works.spec.ts | TASK-021 | VS |
| T-FUN-015 | E | fe:tests/e2e/prefill.spec.ts | TASK-201 | P2 |
| T-FUN-016 | E | fe:tests/e2e/quick-flight.spec.ts | TASK-017 | VS |
| T-FUN-017 | E | fe:tests/e2e/award-steps.spec.ts | TASK-020 | VS |
| T-FUN-018 | E | fe:tests/e2e/award-steps.spec.ts | TASK-020 | VS |
| T-FUN-019 | E | fe:tests/e2e/award-steps.spec.ts | TASK-020 | VS |
| T-FUN-020 | E | fe:tests/e2e/option-detail.spec.ts | TASK-017 | VS |
| T-FUN-021 | I | fe:tests/integration/quote-log.test.ts | TASK-040 (guest: local log TASK-017) | P0r |
| T-FUN-022 | U | fe:tests/unit/copy.test.ts | TASK-021 | VS |
| T-FUN-023 | U+E | fe:tests/unit/explain.test.ts | TASK-038 | P0r (only if LLM enabled) |
| T-FUN-024 | E | fe:tests/e2e/privacy.spec.ts (asserts no non-essential cookies) | TASK-022 | VS |
| T-FUN-025 | E | fe:tests/e2e/new-cards.spec.ts | TASK-101 | P1 |
| T-FUN-026 | E | fe:tests/e2e/notices.spec.ts | TASK-017 (static China notice) | VS |
| T-FUN-027 | U | fe:tests/unit/explain.test.ts | TASK-038 | P0r |
| T-FUN-028 | E | fe:tests/e2e/settings.spec.ts | TASK-041 | P0r |
| T-FUN-029 | U+E | fe:tests/unit/confidence.test.ts | TASK-011 | VS |
| T-FUN-030 | E | fe:tests/e2e/alerts.spec.ts | TASK-105 | P1 |
| T-FUN-031 | E | fe:tests/e2e/quick-flight.spec.ts | TASK-017 | VS |
| T-FUN-032 | E | fe:tests/e2e/award-steps.spec.ts | TASK-020 | VS |
| T-FUN-033 | E | fe:tests/e2e/cards.spec.ts | TASK-035 | P0r |
| T-FUN-034 | U | fe:tests/unit/i18n.test.ts (no inline strings lint) | TASK-016 | VS |
| T-INT-001 | I | fe:tests/integration/providers.test.ts | TASK-014 | VS |
| T-INT-002 | I | fe:tests/integration/providers.test.ts | TASK-014 | VS |
| T-INT-003 | I | fe:tests/integration/duffel-booking.test.ts | TASK-031 | P0r |
| T-INT-004 | I | fe:tests/integration/duffel-booking.test.ts | TASK-031 | P0r |
| T-INT-005 | I | fe:tests/integration/duffel-booking.test.ts | TASK-031 | P0r |
| T-INT-006 | I | fe:tests/integration/fx.test.ts | TASK-014 | VS |
| T-INT-007 | I | fe:tests/integration/providers.test.ts | TASK-014 | VS |
| T-INT-008 | I | fe:tests/integration/providers.test.ts | TASK-030 | P0r |
| T-INT-009 | I | fe:tests/integration/registry.test.ts | TASK-014 | VS |
| T-INT-010 | I | fe:tests/integration/duffel-cash.test.ts | TASK-030 | P0r |
| T-REG-001 | U | fe:tests/unit/replan.test.ts | TASK-037 | P0r |
| T-REG-002 | U+DB | fe:tests/unit/replan.test.ts; be: DB-008 | TASK-037 / TASK-039 | P0r |
| T-REG-003 | U | fe:tests/unit/replan.test.ts | TASK-037 | P0r |
| T-REG-004 | U | fe:tests/unit/replan.test.ts | TASK-037 | P0r |
| T-REG-005 | U | fe:tests/unit/replan.test.ts | TASK-037 | P0r |
| T-REG-006 | U | fe:tests/unit/replan.test.ts | TASK-037 | P0r |
| T-REG-007 | U | fe:tests/unit/replan.test.ts | TASK-102 | P1 |
| T-REG-008 | U+E | fe:tests/unit/replan.test.ts; e2e full-trip | TASK-037 | P0r |
| T-REG-009 | U | fe:tests/unit/replan.test.ts | TASK-037 | P0r |
| T-REG-010 | U | fe:tests/unit/replan.test.ts | TASK-037 | P0r |
| T-REG-011 | U+DB | fe:tests/unit/replan.test.ts; be: DB-012 | TASK-037 / TASK-039 | P0r |
| T-REG-012 | U | fe:tests/unit/replan.test.ts | TASK-037 | P0r |
| T-REG-013 | U | fe:tests/unit/replan.test.ts | TASK-037 | P0r |
| T-REG-014 | U | fe:tests/unit/replan.test.ts | TASK-037 | P0r |
| T-REG-015 | U+DB | fe:tests/unit/determinism.test.ts; be: DB-005 | TASK-037 / TASK-039 | P0r |
| T-REG-016 | U+DB | fe:tests/unit/replan.test.ts; be: DB-011 | TASK-037 / TASK-039 | P0r |
| T-REG-017 | U | fe:tests/unit/forecast.test.ts | TASK-034 | P0r |
| T-REG-107 | U+E | fe:tests/unit/replan.cases.test.ts; e2e replan | TASK-037 | P0r |
| T-REG-120 | U (property) | fe:tests/unit/neutrality.property.test.ts | TASK-033 | P0r |
| T-RESP-001 | E | fe:tests/e2e/responsive.spec.ts (project mobile-360) | TASK-022 | VS |
| T-RESP-002 | E | fe:tests/e2e/responsive.spec.ts (tablet-768) | TASK-022 | VS |
| T-RESP-003 | E | fe:tests/e2e/responsive.spec.ts (desktop-1280) | TASK-022 | VS |
| T-RESP-004 | E | fe:tests/e2e/responsive.spec.ts | TASK-022 | VS |
| T-SEC-001 | DB+I | be: DB-002/003/004; fe:tests/integration/dal.test.ts | TASK-039 / TASK-040 | P0r |
| T-SEC-002 | U+DB | fe:tests/unit/schemas.test.ts; be: DB-015 | TASK-016 / TASK-039 | VS |
| T-SEC-003 | I | fe:scripts/scan-bundle (post-build) | TASK-022 | VS |
| T-SEC-004 | I | fe:tests/integration/ratelimit.test.ts | TASK-015 | VS |
| T-SEC-005 | I | fe:tests/integration/api-validation.test.ts | TASK-015 | VS |
| T-SEC-006 | DB+I | be: DB-016; fe:tests/integration/delete.test.ts | TASK-041 | P0r |
| T-SEC-007 | U | fe:tests/unit/logger.test.ts | TASK-014 | VS |
| T-SEC-008 | U | fe:tests/unit/explain.test.ts | TASK-038 | P0r |
| T-SEC-009 | I+DB | fe:tests/integration/duffel-booking.test.ts; be: DB-017 | TASK-031 | P0r |
| T-TIME-001 | U | fe:tests/unit/verdict.test.ts | TASK-034 | P0r |
| T-TIME-002 | U | fe:tests/unit/verdict.test.ts | TASK-034 | P0r |
| T-TIME-003 | U | fe:tests/unit/verdict.test.ts | TASK-034 | P0r |
| T-TIME-004 | U | fe:tests/unit/verdict.test.ts | TASK-034 | P0r |
| T-TIME-005 | U | fe:tests/unit/verdict.test.ts | TASK-034 | P0r |
| T-TIME-006 | U | fe:tests/unit/verdict.test.ts | TASK-034 | P0r |
| T-TIME-007 | U | fe:tests/unit/verdict.test.ts | TASK-034 | P0r |
| T-TIME-008 | U | fe:tests/unit/expiry.test.ts | TASK-034 | P0r |
| T-TIME-009 | U | fe:tests/unit/dates.test.ts | TASK-010 | VS |
| T-TIME-010 | U | fe:tests/unit/availability.test.ts | TASK-034 | P0r |
| T-TIME-011 | U+DB | fe:tests/unit/ics.test.ts; be: DB-018 | TASK-042 | P0r |
| T-TIME-012 | U | fe:tests/unit/availability.test.ts | TASK-034 | P0r |
| T-TIME-105 | U | fe:tests/unit/allocation.cases.test.ts | TASK-033 | P0r |
| T-TIME-112 | U | fe:tests/unit/verdict.test.ts | TASK-034 | P0r |
| T-VAL-001 | U+E | fe:tests/unit/schemas.test.ts; e2e quick-flight | TASK-016 / TASK-017 | VS |
| T-VAL-002 | U | fe:tests/unit/schemas.test.ts | TASK-016 | VS |
| T-VAL-003 | U | fe:tests/unit/schemas.test.ts | TASK-016 | VS |
| T-VAL-004 | U | fe:tests/unit/schemas.test.ts | TASK-016 | VS |
| T-VAL-005 | U | fe:tests/unit/schemas.test.ts | TASK-016 | VS |
| T-VAL-006 | U | fe:tests/unit/schemas.test.ts | TASK-016 | VS |
| T-VAL-007 | U | fe:tests/unit/schemas.test.ts | TASK-016 | VS |
| T-VAL-008 | U | fe:tests/unit/schemas.test.ts | TASK-018 | VS |
| T-VAL-009 | U | fe:tests/unit/schemas.test.ts | TASK-019 | VS |
| T-VAL-010 | U | fe:tests/unit/schemas.test.ts | TASK-035 | P0r |
| T-VAL-011 | U | fe:tests/unit/schemas.test.ts | TASK-035 | P0r |
| T-VAL-012 | U | fe:tests/unit/schemas.test.ts | TASK-016 | VS |
| T-VAL-013 | U | fe:tests/unit/schemas.test.ts | TASK-010 | VS |

Additional technical tests:
- DB-001..018: `be:supabase/tests/database/*.sql`, TASK-039.
- UNIT-MULTI-LIMIT: TASK-018.
- UNIT-ALLOC-LIMIT (13 expenses → heuristic label): TASK-033.

## 7. Production-like smoke tests (Vercel demo URL, after each deploy gate)

1. `GET /api/health` returns `{ok:true, mode:{auth:'guest', provider:'duffel_test'|'fixture'}}` with no secrets.
2. Quick Flight demo route (CS-01) renders the hero with "Example saving (illustrative data)".
3. The Full Trip Plan demo (CS-05) renders the combination + rejected reason.
4. The award steps guard blocks the transfer before the live check.
5. GuestModeBanner is visible.
6. `/how-it-works` loads.
7. No console errors; axe passes on the landing and results pages.

## 8. What "done" means

A feature is done only when:
- its listed tests pass in the stated layers;
- its EC behaviours are verified;
- the build passes;
- the evidence entry exists.

Until then the traceability status in doc 11 stays `planned` or `in_progress`. **This document claims no execution.**
