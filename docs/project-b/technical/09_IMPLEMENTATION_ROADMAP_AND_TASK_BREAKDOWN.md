# Technical 09: Implementation Roadmap and Task Breakdown

| Field | Value |
|---|---|
| Status | Plan only. **No task has started.** Execution begins only after the owner approves the master plan (GATE-00). |
| Time check | Mon 26 Oct 2026, 19:03 IST. Submission: end of **Wed 28 Oct** (assumed 23:59 IST; the organiser's timezone is `[OPEN QUESTION]`). Demo: Thu 29 Oct. That is about 53 wall-clock hours, or **realistically about 1.5–2 build days**. |
| Honesty rule | The full specification is larger than the remaining time. The tiers below say what is expected to fit. **Nothing beyond the vertical slice is promised for the deadline.** |
| Effort totals (estimates) | **Tier A ≈ 26 h**; **Tier B ≈ 37 h**, including TASK-003. With AI agents and parallel test writing, Tier A is feasible by Tuesday night only if TASK-002 has no compatibility surprises. **Tier B will only partly fit**; take it in priority order and stop where the evidence stops. |

**Repos:** `fe` = `frontend/` (hackathon-1-idea-2-Rishi-solanki-frontend) · `be` = `backend/` (…-backend).

**Common rules for every task**
- Run the per-task testing loop in doc 07 §4.
- Write an evidence entry in `fe:docs/implementation/EVIDENCE.md`.
- "Done" requires both the tests and the evidence. The tests listed are the minimum.

**Agent coordination**
- One main agent owns integration, both `package.json`/lockfiles, migrations, `database.types.ts`, the catalogue export, `src/domain/types.ts` and the shared zod schemas.
- Parallel subagents only take disjoint folders, for example `fe:tests/unit/**` for engine tests, or `fe:src/components/app/**` for presentational components.
- Worktrees are not used, because the merge overhead is too high for the timeline.

---

## 0. Gates

| Gate | Condition |
|---|---|
| GATE-00 | Owner approves the master plan + §2A decisions (doc 11) |
| GATE-VS | Vertical slice complete: TASK-022 evidence, demo URL live, smoke tests pass |
| GATE-P0 | Remaining-P0 subset done: TASK-043 evidence, final smoke, submission |

## 1. Tier A: minimum shippable vertical slice (target: Tue 27 Oct)

| Task | Objective | Deps | Owns | Links (REQ / EC / T) | Tests and commands | DoD + evidence | Effort (est.) | Risk / fallback |
|---|---|---|---|---|---|---|---|---|
| TASK-000 | **Repo baseline.** Clone both empty remotes into `frontend/` and `backend/` (this resolves the empty folders). Add `.gitignore` (`.env*`, `node_modules`, `.next`, `supabase/.temp`, `_backups`), `.env.example` (names only), README, `docs/` copy (D-32). Baseline commit. gitleaks (Docker) scan. **Push only after owner OK.** | GATE-00; owner confirms D-31/D-32 and authenticates Git (`gh auth login` or Git Credential Manager; `gh` is currently not authenticated) | fe, be (root files) | REQ-NFR-04 / — / T-SEC-003 (scan) | `git clone …`; `docker run --rm -v ${PWD}:/repo zricethezav/gitleaks:<pinned> detect --source=/repo` | Two repos with a baseline commit; scan clean; evidence | 0.5 h | Auth failure → owner logs in; scan finding → remove the file and rewrite the unpushed commit |
| TASK-001 | Project config: `AGENTS.md`, `.cursor/rules/*.mdc` (domain purity, GRANT+RLS, testing loop, no secrets, provenance), `.cursor/mcp.json` (shadcn; Supabase only if scoped read-only) | TASK-000 | fe, be | — | Review only | Files committed; evidence | 0.5 h | — |
| TASK-002 | **Compatibility spike.** Scaffold Next 16.4.3 + exact pins (doc 01 §5), Tailwind 4, shadcn init, next-intl (no routing), Vitest 5, Playwright 1.64, ESLint 10 + eslint-config-next 16.4.3, Prettier. Connect a Vercel project (owner account) and deploy a skeleton. | TASK-001 | fe | REQ-NFR-03/06 | `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm build && pnpm test:unit && pnpm test:e2e` (1 test each); open the demo URL | All commands pass; compatibility table statuses → "verified in spike"; demo URL responds; evidence | 1.5 h | ESLint 10 incompatible → newest 9.x that passes; next-intl issue → plain catalogue loader |
| TASK-010 | Money, FX, rounding, dates (ENG-01, ENG-02; airport-local dates) | TASK-002 | fe:src/domain/money, fx, dates | REQ-NFR-07, 10 / EC-TECH-19, 20 / T-CALC-002, 008, T-TIME-009, T-VAL-013 | `pnpm vitest run tests/unit/money tests/unit/fx tests/unit/dates` | Exact values (€89.34; 12.4%; 57.7%); evidence | 1 h | — |
| TASK-011 | Savings core: N, EC, savings, break-even (corrected), valuation, ranking A/B + tolerance, confidence (ENG-03..07, 24, 25) | TASK-010 | fe:src/domain/savings, valuation, ranking, confidence | REQ-BRF-03, 04, REQ-OWN-07, 10, REQ-REC-VAL-01, CONF-01 / EC-OPT-01, 12, 13 / T-CALC-001, 003–006, 009, 012, 013, 022, 106, T-FUN-029 | `pnpm vitest run tests/unit/savings tests/unit/ranking tests/unit/valuation tests/unit/confidence` | CS-01..04 + FX-CASH-08 values exact; evidence | 2 h | — |
| TASK-012 | Transfer graph, usable points, Avios preconditions (ENG-08); `catalogue.json` (hand-authored from Phase 1 §5.11 until TASK-039 exports it) | TASK-010 | fe:src/domain/transfers, src/fixtures/catalogue.json | REQ-RES-07, 20, REQ-BRF-09 / EC-CARD-10, 19–23 / T-CALC-010, 011 | `pnpm vitest run tests/unit/transfers` | Ratios and min/increment exact; suspended path; evidence | 1.5 h | — |
| TASK-013 | Fixture library (all FX-*, CS-*, S-*, M-*, V*, REF-01) with expected outputs | TASK-010 | fe:src/fixtures | REQ-RES-17 / EC-TECH-13 / T-DEMO-001 | `pnpm typecheck && pnpm vitest run tests/unit/fixtures` (snapshot of expected outputs) | Fixtures typed; labels ILLUSTRATIVE; evidence | 1 h | — |
| TASK-014 | Provider registry + PRV-01b/02a/04a/04b/05b, provenance, resilience (10 s budget, abort, partial, 1 retry), structured logger | TASK-011, TASK-013 | fe:src/providers, src/server/log | REQ-BRF-06, REQ-NFR-06, 08, 09, REQ-RES-17 / EC-TECH-01, 02, 04, 07, 13 / T-INT-001, 002, 006, 007, 009, T-SEC-007 | `pnpm vitest run tests/integration/providers tests/integration/fx tests/integration/registry tests/unit/logger` | Timeout → labelled partial; no fabricated values; evidence | 2 h | Frankfurter down → fixture FX labelled |
| TASK-015 | API-01 quick search, API-03/04/05 catalogue, rate limit, zod validation | TASK-014 | fe:src/app/api/search/quick, catalogue | REQ-BRF-01, REQ-NFR-08 / EC-TECH-02, 06 / T-SEC-004, 005 | `pnpm vitest run tests/integration/api-validation tests/integration/ratelimit` | 400/429 paths covered; evidence | 1.5 h | — |
| TASK-016 | UI shell: tokens, fonts, layout/nav, string catalogue, CMP-02/03/04/10/20–23/27, shared zod schemas, error/404 (SCR-17 errors) | TASK-002 | fe:src/app/layout, components, messages, src/domain/schemas | REQ-BRF-06, REQ-NFR-02, 10, REQ-OWN-11 / EC-TECH-06 / T-A11Y-004, T-FUN-034, T-VAL-001–007, 012, T-SEC-002 | `pnpm vitest run tests/unit/schemas tests/unit/i18n` + `pnpm playwright test tests/e2e/a11y.spec.ts` | No inline strings; axe clean on the shell; evidence | 2 h | — |
| TASK-017 | Quick Flight journey: SCR-01, 02, 04, 05, CMP-01/05/06/11/12/13/17, static China notice, local quote log | TASK-015, TASK-016 | fe:src/app/(public)/search, results | REQ-BRF-01, 03, 04, 07, REQ-RES-01, 06, 10, 18, 19 / EC-TRIP-01, 13, 14, EC-OPT-07, 22 / T-FUN-001, 003, 012, 013, 016, 020, 026, 031, T-FLOW-001, 008, T-A11Y-003 | `pnpm playwright test tests/e2e/quick-flight.spec.ts tests/e2e/option-detail.spec.ts --project=mobile-360 --project=tablet-768 --project=desktop-1280` | CS-01 hero exact with "Example saving"; all states rendered; evidence + screenshots | 3 h | — |
| TASK-018 | Bounded multi-leg engine (ENG-19) + API-02 + SCR-03 (CMP-14) | TASK-011, TASK-012, TASK-017 | fe:src/domain/multileg, api/search/plan, plan/new | REQ-BRF-02, REQ-REC-MULTI-01 / EC-TRIP-03, 07, 20, EC-OPT-09, 18 / T-CALC-007, T-FUN-002, T-FLOW-009, T-VAL-008, UNIT-MULTI-LIMIT | `pnpm vitest run tests/unit/multileg` + `pnpm playwright test tests/e2e/full-trip.spec.ts` | CS-05 €970 + rejected reason; limit fallback labelled; evidence | 3 h | Behind schedule → ship per-leg + whole-trip only; label as limited |
| TASK-019 | Guest store (versioned, zod-validated) + SCR-08 wallet (CMP-15) + GuestModeBanner + draft autosave | TASK-016, TASK-012 | fe:src/lib/guest-store, app/wallet | REQ-BRF-08, REQ-OWN-02, 09, 12 / EC-ONB-06, EC-CARD-04, 05 / T-FUN-007, T-FLOW-002, 003, 018, T-VAL-009 | `pnpm vitest run tests/unit/guest-store` + `pnpm playwright test tests/e2e/wallet.spec.ts tests/e2e/resume.spec.ts` | Programmes never summed; corrupt-store recovery; evidence | 2 h | — |
| TASK-020 | SCR-06 award steps (CMP-07, CMP-24), preconditions, gap-fill (ENG-16), REF-01 fixture | TASK-017, TASK-019 | fe:src/app/.../award-steps, src/domain/gapfill | REQ-BRF-05, REQ-RES-04, 05, 08, 20, REQ-REC-BUY-01 / EC-TRIP-16, 17, EC-CARD-09, 21–23, EC-OPT-21 / T-FUN-004, 017, 018, 019, 032, T-CALC-023, 024, T-FLOW-015 | `pnpm vitest run tests/unit/gapfill tests/unit/ref01` + `pnpm playwright test tests/e2e/award-steps.spec.ts` | Transfer blocked before the live check; evidence | 2 h | — |
| TASK-021 | SCR-15 How it works + banned-words check + demo script copy | TASK-016 | fe:src/app/how-it-works, tests/unit/copy | REQ-RES-11, 12, 13, 19 / — / T-FUN-014, 022, T-DEMO-005 | `pnpm vitest run tests/unit/copy` + `pnpm playwright test tests/e2e/how-it-works.spec.ts` | No banned words; evidence | 1 h | — |
| TASK-022 | **GATE-VS:** full regression, responsive + axe, cookie check, bundle secret scan, deploy demo, smoke | TASK-017..021 | fe | REQ-BRF-06, REQ-NFR-02, 03, 04 / — / T-A11Y-001, 002, T-RESP-001–004, T-DEMO-001, 003, T-FUN-024, T-SEC-003 | `pnpm test:unit && pnpm test:integration && pnpm build && pnpm test:e2e && BASE_URL=<demo> pnpm test:smoke` | Demo URL live; all pass; evidence incl. URL + SHA | 1.5 h | Deploy failure → Vercel rollback / Netlify fallback |

## 2. Tier B: remaining P0 (target: Wed 28 Oct, in priority order; each item is optional for the deadline)

| Task | Objective | Deps | Owns | Links (REQ / EC / T) | Tests and commands | DoD | Effort | Risk / fallback |
|---|---|---|---|---|---|---|---|---|
| TASK-030 | DuffelTestCash adapter (PRV-01a) behind `PROVIDER_MODE=duffel_test` | TASK-014; owner provides a test token | fe:src/providers/cash/duffel | REQ-RES-02, 06 / EC-TECH-01, 03, 12 / T-INT-008, 010 | `pnpm vitest run tests/integration/duffel-cash` (MSW); manual test-token search | Labelled LIVE-TEST; partial on timeout; evidence | 1.5 h | No token → fixtures only |
| TASK-031 | SCR-07 test checkout + API-26/27 + PRV-03a/03b; confirm Duffel v2 order shape in the docs first | TASK-030 | fe:src/app/checkout, api/booking | REQ-BRF-05, REQ-RES-02 / EC-OPT-10, EC-TECH-03, 16, 17 / T-FUN-005, T-INT-003, 004, 005, T-SEC-009, T-FLOW-014, T-DEMO-002 | `pnpm vitest run tests/integration/duffel-booking` + `pnpm playwright test tests/e2e/checkout.spec.ts`; manual test-token order | "CONFIRMED BOOKING (TEST)" or "Simulated"; idempotent; evidence | 2 h | Duffel error → simulated label |
| TASK-032 | Rules engine RT-01/03/04/06 incl. Iberia Aire `cap_scope` | TASK-011 | fe:src/domain/rules | REQ-REC-RULE-01 / EC-RWD-01–27 / T-CALC-015, 016, 018, 019, 020 | `pnpm vitest run tests/unit/rules` | 350/491/575 exact; evidence | 2 h | — |
| TASK-033 | Bounded allocation (ENG-10), TripValue, baselines, ΔB (ENG-11/12), gates (ENG-13), invariants, neutrality property | TASK-032 | fe:src/domain/allocation, gates | REQ-OWN-000, 13, REQ-REC-CARD-01..08, MARG-01..06, INV-01, BONUS-01 / EC-SPD-*, EC-ALLOC-*, EC-MARG-* / T-ALLOC-001–004, 006–008, 102, 111, 116, T-CALC-025, 026, 101, 103, 104, 108, 113, 114, 115, 117, 118, 119, T-TIME-105, T-REG-120, UNIT-ALLOC-LIMIT | `pnpm vitest run tests/unit/allocation tests/unit/marginal tests/unit/gates tests/unit/neutrality.property` | S-04 €50.14; M-01..06 exact; property passes; evidence | 4 h | Over time → linear + single-threshold DP only; label others "approximate" |
| TASK-034 | Forecast + reconciliation, availability states, verdict, expiry, refusals (ENG-14/15/17/18) | TASK-033 | fe:src/domain/forecast, availability, verdict | REQ-OWN-05, 06, REQ-RES-09, 21, REQ-REC-FCST-01, TIME-01, DATA-01 / EC-OPT-11, 14, 17, 19, 20, EC-TRIP-15, 21 / T-TIME-001–008, 010, 012, 112, T-CALC-021, 110, T-REG-017 | `pnpm vitest run tests/unit/verdict tests/unit/forecast tests/unit/availability tests/unit/expiry tests/unit/refusals` | V1–V10 exact; evidence | 3 h | — |
| TASK-035 | SCR-09 cards (CMP-16) + SCR-10 spending/purchases (basic) + gates/reserve | TASK-019, TASK-033 | fe:src/app/wallet/cards, plan/[tripId]/inputs | REQ-OWN-03, 04, 11, 13, REQ-REC-CAT-01 / EC-SPD-01–14, EC-CARD-01, 24, 25 / T-FUN-008, 009, 010, 033, T-VAL-010, 011 | `pnpm playwright test tests/e2e/cards.spec.ts tests/e2e/plan-ahead.spec.ts` | No card-number fields; evidence | 2.5 h | — |
| TASK-036 | SCR-11 strategy + API-20 compute (guest: stateless) | TASK-034, TASK-035 | fe:src/app/plan/[tripId], api/plans/compute | REQ-OWN-01, 05, REQ-REC-* / — / T-FLOW-006, 007, 010, 121 | `pnpm playwright test tests/e2e/plan-ahead.spec.ts` | Verdict + allocation + explanation; evidence | 2.5 h | — |
| TASK-037 | Replan diff (ENG-20) + SCR-12 latest diff (iPhone case first) | TASK-036 | fe:src/domain/replan, app/plan/[tripId]/changes | REQ-OWN-08, REQ-REC-REPLAN-01, RES-01 / EC-SPD-06, EC-TECH-08 / T-REG-001–006, 008–016, 107, T-FLOW-011, 012, 013 | `pnpm vitest run tests/unit/replan tests/unit/determinism` + `pnpm playwright test tests/e2e/replan.spec.ts` | T-REG-107 deltas exact; evidence | 3 h | Over time → iPhone event only; others P1 |
| TASK-038 | Explanation contract (ENG-21) + validator (ENG-22), templates; LLM flag stays off | TASK-036 | fe:src/domain/explain | REQ-REC-EXPL-01, REQ-RES-14 / EC-TECH-18 / T-FUN-027, 023, T-SEC-008 | `pnpm vitest run tests/unit/explain` | Missing field → not displayed; evidence | 1.5 h | — |
| TASK-039 | Backend: migrations M001–M014, seed, catalogue export, types, pgTAP DB-001..018 (local Docker only) | TASK-012 | be:supabase/** , scripts/** | REQ-NFR-04, REQ-REC-CAT-01 / EC-TECH-10, EC-ALLOC-01, 04 / DB-001..018, T-SEC-001 | `supabase start && supabase db reset && supabase test db` | All DB tests pass locally; no hosted DB touched; evidence | 4 h | Over time → ship migrations + RLS tests for TBL-10..20 first |
| TASK-003 | **Auth spike** (conditional, D-29): `@supabase/ssr` in Next 16 with `proxy.ts` updateSession + `getClaims`, a protected action, sign-out, cache headers | TASK-002, TASK-039; owner provides a Supabase project + SMTP/OAuth | fe:proxy.ts, src/server/auth | REQ-OWN-12 / EC-ONB-09, EC-TECH-14 / — | Manual runtime checks + 1 Playwright auth test | Works at runtime → `AUTH_MODE=supabase` allowed; evidence | 2 h | Fails → stay guest-only (no demo impact) |
| TASK-040 | Authenticated mode: DAL, saved trips SCR-13, API-10/11/25, guest migration, quote log | TASK-003 passed | fe:src/server/dal, app/trips | REQ-BRF-10, REQ-OWN-12, REQ-RES-12 / EC-ONB-05, 08, EC-TECH-21 / T-FUN-006, 021, T-FLOW-016, 017, T-SEC-001 | `pnpm vitest run tests/integration/dal` + `pnpm playwright test tests/e2e/trips.spec.ts tests/e2e/migration.spec.ts` | Idempotent migration; RLS isolation; evidence | 4 h | Skipped if TASK-003 fails (guest trips remain) |
| TASK-041 | SCR-14 settings: valuation, never-suggest-cards, export/delete (local; API-29/30 if auth) | TASK-019 | fe:src/app/settings, api/me | REQ-NFR-05, REQ-REC-REJ-01, CARD-07 / EC-TECH-11 / T-FUN-011, 028, T-FLOW-005, 109, T-SEC-006 | `pnpm playwright test tests/e2e/settings.spec.ts` | Clear/export works; evidence | 1.5 h | — |
| TASK-042 | `.ics` export (API-28) + timeline dedupe | TASK-036 | fe:src/app/api/ics | REQ-BRF-11 (P0 part) / — / T-TIME-011 | `pnpm vitest run tests/unit/ics` | Valid ICS; deduped UIDs; evidence | 1 h | — |
| TASK-043 | **GATE-P0:** full regression, final deploy, smoke, demo rehearsal (T-DEMO-004), submit URL + both repo links | All done tasks | fe, be | All | `pnpm test:unit && pnpm test:integration && pnpm build && pnpm test:e2e && BASE_URL=<demo> pnpm test:smoke`; backend `supabase test db` (if TASK-039 done); manual T-DEMO-004 rehearsal | Submission evidence | 1 h | Drop unfinished Tier B items; the demo script only shows finished features |

## 3. Fallback scope (if a dependency fails)

| Failure | Fallback | Demo claim to avoid |
|---|---|---|
| Supabase / auth / SMTP unavailable | Guest-only (default) | "Your trips are saved to your account" |
| Duffel token missing or API down | Fixtures + "Simulated test booking" | "Bookable now" |
| Vercel deploy blocked | Rollback or Netlify site | — |
| Tier B incomplete | Demo the vertical slice + whichever Tier B tasks have evidence | Any feature without evidence |

## 4. Tier C: P1 / P2 (documented, not scheduled for the deadline)

| Task | Objective | Links |
|---|---|---|
| TASK-101 (P1) | SCR-16 new-card exploration (M4, neutral, TAE + warning) | REQ-REC-CARD-04, 06, 07, REQ-RES-16; T-FLOW-004, T-FUN-025 |
| TASK-102 (P1) | RT-02 step thresholds, RT-05 promotions/transfer bonuses, offer snapshots | T-CALC-017, T-ALLOC-005, T-REG-007 |
| TASK-103 (P1) | Multi-bonus optimisation across overlapping windows | T-ALLOC-111 (P1 part) |
| TASK-104 (P1) | Full revision history UI | REQ-OWN-08 |
| TASK-105 (P1) | Price alerts (needs monitoring) | REQ-BRF-11; T-FUN-030 |
| TASK-106 (P1) | es-ES localisation | REQ-NFR-10; UNR-09 |
| TASK-107 (P1) | Forecast variance prompts | REQ-REC-FCST-01 |
| TASK-108 (P1) | pg_cron jobs (expiry, reminders) | ADR-009 |
| TASK-109 (P1) | Rewards earned by cash tickets in EC | T-CALC-014 |
| TASK-110 (P1) | Detailed spending tab; refund-risk history; residual valuation horizons | REQ-OWN-03 |
| TASK-201 (P2) | Link/screenshot pre-fill (LLM, user confirms) | REQ-BRF-12; T-FUN-015 |
| TASK-202 (P2) | Authorised live fare/award providers; `VERIFIED_RESULT` state | PRV-01/02 upgrade |
| TASK-203 (P2) | Price monitoring and more notification channels | — |
| TASK-204 (P2) | More markets (country-keyed catalogue) | D-03 |

**Consequences of deferral (also stated in the master plan):**
- no new-card suggestions in the demo;
- no alerts;
- English only;
- sign-in only if TASK-003/040 complete;
- no real prices or bookings at any tier until P2 agreements exist.
