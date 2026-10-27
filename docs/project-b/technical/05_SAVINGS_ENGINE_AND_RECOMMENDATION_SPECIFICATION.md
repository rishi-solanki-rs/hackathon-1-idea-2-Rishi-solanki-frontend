# Technical 05: Savings Engine and Recommendation Specification

| Field | Value |
|---|---|
| Status | Implementation-ready specification. **27 Oct correction:** the cost model (`cashOut` / `attributableFees`), break-even, Goal A/B, multi-city bounds and allocation limits are superseded by [doc 12 §A–B](12_PRE_BUILD_CORRECTIONS_2026-10-27.md). |
| Source of truth | Phase 1 doc 00 §7 (formulas), doc 02 §3–5 (fixtures and expected values), audit report §3 (corrections) |
| Module | `frontend/src/domain/**` (MOD-DOMAIN). Pure TypeScript with no I/O and no framework imports (doc 01 §3.2). |

**Rules:**
- Every number, date and verdict comes from these deterministic functions. No LLM computes anything (ADR-010).
- Every function is pure: inputs → outputs, no clock, no randomness. Callers pass `today` explicitly.
- The engine version string is stored with every result (REQ-NFR-07).

---

## 1. Core types (ENG-00)

```ts
type Currency = 'EUR' | 'USD' | 'GBP' | string;        // ISO 4217
type Money = { minor: number; currency: Currency };      // integer cents; Number.isSafeInteger enforced
type ProgramId = string;                                  // e.g. 'iberia_club', 'amex_mr_es', 'revolut_revpoints'
type Provenance =
  | 'LIVE_TEST_DUFFEL' | 'FIXTURE_FLIGHT' | 'FIXTURE_AWARD' | 'USER_ENTERED'
  | 'VERIFIED_OFFICIAL_RULE' | 'EXTERNAL_FX_SNAPSHOT' | 'CACHED' | 'ESTIMATE' | 'VERIFIED_REAL_WORLD';
type AvailabilityState = 'VERIFIED_RESULT' | 'TEST_OR_ILLUSTRATIVE' | 'CACHED'
  | 'NOT_YET_SEARCHABLE' | 'ESTIMATED_RELEASE_WINDOW' | 'UNKNOWN_AVAILABILITY';
type Option = {
  id: string; legIds: string[]; kind: 'cash' | 'award' | 'mixed';
  cashOut: Money;                       // all-in incl. taxes, surcharges, fees, opt-in bags, positioning
  points: Record<ProgramId, number>;    // integer points per programme
  rewardsEarned?: { program: ProgramId; points: number; source: Provenance };
  attributableFees?: Money;
  provenance: Provenance; availability: AvailabilityState; fetchedAt?: string; expiresAt?: string;
};
type Valuation = { program: ProgramId; eurPerPoint: string /* decimal string */; method: 'user' | 'reference' | 'break_even_only' };
```

## 2. Money, FX, rounding (ENG-01, ENG-02) [REQ-NFR-07, REQ-NFR-10]

- **ENG-01 `money`:**
  - `add`, `sub`, `mulRate(m, rateDecimal)`, `sum`, `compare`.
  - Results are integer minor units. Rounding is **half away from zero**, applied only where a decimal product becomes cents.
  - Display: whole euros in headlines, 2 decimals in breakdowns.
- **ENG-02 `fx.convert(m, snapshot)`:**
  - `snapshot = {base, quote, rate, rateDate, provenance:'EXTERNAL_FX_SNAPSHOT'|'FIXTURE'}`.
  - **Fails closed** (returns `{error:'FX_STALE'}`) if `today − rateDate > 7 days` (AS-19).
  - The original amount is kept alongside the converted one.
  - Test: T-CALC-008, USD 100.00 at 1.1193 → **€89.34**. Error paths: T-INT-006.
- **Percentages:** computed from unrounded minor units, shown to 1 decimal, half away from zero. T-CALC-002: €24.70/€200.00 → **12.4%**; €1,674/€2,900 → **57.7%**.

## 3. Savings (ENG-03 to ENG-07, ENG-25) [REQ-BRF-03, 04, REQ-OWN-10, REQ-REC-VAL-01]

| Fn | Definition |
|---|---|
| ENG-03 `normalPrice(request, cashOptions)` | N = cheapest comparable cash itinerary for the **exact** requested airports, dates, cabin, passengers and required bags. For multi-leg trips, a single multi-city or open-jaw fare where one exists, else the sum of per-leg cash. Never inflated by fares the user wouldn't buy. |
| ENG-04 `economicCost(o, valuations)` | `EC(o) = cashOut(o) + Σ_p points_p(o) × v_p + attributableFees(o) − valueOfRewardsEarned(o)`. The rewards-earned term applies only if its source is VERIFIED_OFFICIAL_RULE or USER_ENTERED (AS-13), else 0. |
| ENG-05 `savings(N, H)` | economic saving = EC(N) − EC(H); % = saving / EC(N); cash saving today = cashOut(N) − cashOut(H) |
| ENG-06 `breakEven(A, C)` | **Corrected:** `v* = (EC_cash(C) − cashOut(A)) / points(A)`, where `EC_cash(C) = cashOut(C) + attributableFees(C) − valueOfRewardsEarned(C)`. Single-programme awards only; for mixed, per programme with the others held at the user's values. **No separate "extras" term.** |
| ENG-07 `resolveValuation(user, programme)` | User value → reference (€0.010 editable, D-02 provisional, ±30% sensitivity) → `break_even_only` (no EC ranking for awards) |
| ENG-25 `rank(options, objective, tolerance, prefs)` | 1) Hard filters (constraints, gates). 2) Objective: Goal B = min EC; Goal A = min cashOut, then EC. 3) Ties within tolerance max(5%, €25) (AS-10, D-24) resolved by soft preferences in ranked order, then the deterministic tie-break (section 8). |

**Display rule:** if EC(N) − EC(H) ≤ 0, show "Paying cash is better" (ST-12). Never present a low cash payment as a saving when the economic saving is negative.

### Worked examples (fixtures FX-* in Phase 1 doc 02 §5; all ILLUSTRATIVE)

| ID | Inputs | Expected | Test |
|---|---|---|---|
| CS-01 | N €780; flex +2 days €702; BCN €735 + train €60 | H = €702; saving **€78 / 10.0%**; BCN €795 rejected | T-CALC-004, T-FUN-001 |
| CS-02 | Cash €520; award 25,000 + €160; balance 20,000; v €0.010 | **Not bookable** (gap 5,000); H = cash €520; hypothetical award EC €410 shown as conditional | T-CALC-005 |
| CS-02b | CS-02 + user-entered price €0.0213/pt; gap 20.0% | cashOut 160 + 106.50 = **€266.50**; EC **€466.50**; saving **€53.50 (10.3%)**; only after live check | T-CALC-023 |
| CS-03 | Cash €2,900; 70,500 Avios + €380; v €0.012 | EC **€1,226**; saving **€1,674 / 57.7%**; cash today **−€2,520** | T-CALC-006, T-FUN-003 |
| CS-04 | Cash €620; 34,000 + €310; v €0.012 | EC **€718**; "Cash is better by **€98**"; v* = 310/34,000 = **€0.0091** | T-CALC-106, T-CALC-003 |
| CS-05 | See section 9 | Open-jaw cash **€970** chosen; saving **€0.00** | T-CALC-007 |
| FX-CASH-08 | Cash cashOut €620 (incl. €40 bag); award cashOut €350 (incl. €40 bag); 34,000 pts | v* = (620 − 350)/34,000 = **€0.0079** (the pre-audit formula gave €0.0068, which is wrong) | T-CALC-022 |
| Goal A/B | CS-04 | Goal A: award first ("€98 more overall"); Goal B: cash first | T-CALC-012 |
| Rewards earned (P1) | CS-04 + cash earns 1,500 Avios at €0.010 | EC(cash) = **€605** < €718 | T-CALC-014 |

## 4. Transfers and usable points (ENG-08) [REQ-RES-07, REQ-RES-20, REQ-BRF-09]

**Signature:**

```ts
usablePoints(target: ProgramId, balances, transferGraph, ctx:{ issuingCountry, today, lsbd, accountAges, links })
  => { usable:number; paths:Path[]; blocked:{reason}[] }
```

**Rules**
- **Graph:** only VERIFIED `transfer_routes` edges are used.
  - Each edge has a ratio (num/den), `min`, `increment`, `maxDelayDays`, `status` (`active`/`suspended`) and `countryKey`.
  - Pooled family Avios have no outgoing edges (EC-CARD-20).
- **Amount on an edge:**
  - `floor_to_increment(min(balance, …))`, where `amount ≥ min`;
  - `received = floor(amount × num / den)`.
  - T-CALC-011: Flying Blue min 500, step 5: 12,503 → **12,500**; 499 → **0**.
- **Country ratio:** T-CALC-010: MR ES 45,000 → **45,000** Avios; MR NL → **30,000**. Emirates via Amex ES is suspended.
- **Avios moves (REQ-RES-20):** blocked with a reason if any of these hold:
  - account age < 30 days, or < 90 days for BA ↔ Iberia (stricter reading, CR-19);
  - Qatar is not linked to BA;
  - the user marked details as not matching.
- **Timing:** arrival uses `maxDelayDays` (e.g. MR → Iberia 14 days).

## 5. Reward rules RT-01 to RT-06 (ENG-09) [REQ-REC-RULE-01]

**Signature:**

```ts
evaluateRule(rule: RewardRule, ledgerSlice: Allocation[], period) => { points:number; status:'ok'|'cap_reached'|'threshold_met'|'not_met'; notes:string[] }
```

| Type | Behaviour | Conservative default | Tests |
|---|---|---|---|
| RT-01 ordinary earn (category rates) | `points = round_mode(spend × rate)`, per transaction if `rounding_scope='transaction'` and transactions are known, otherwise per period | Unknown rounding → `floor` per period (AS-14) | T-CALC-015 (1 per €3 on €100 → **33**) |
| RT-02 threshold step (P1) | Rate changes after a cumulative spend threshold within its period | Undefined period → restrictive | T-CALC-017 (€19,000/yr → **6,100**) |
| RT-03 welcome milestone | Points if qualifying spend ≥ threshold inside the window; posts at `max_delay` for deadline decisions; clawback if net spend falls below | Max posting delay; refunds reverse | T-TIME-105, T-REG-002 |
| RT-04 cap with `cap_scope` | Spend or points cap per period. `cap_scope='rate_only'` or `'all_spend'`. Ambiguous → `'all_spend'` + order-conservative evaluation + sensitivity. | D-26 restrictive | T-CALC-016 (Card C €1,200 → **2,000**), **T-CALC-020** |
| RT-05 promotion/transfer bonus (P1) | Time-boxed multiplier; snapshot per URL version | — | T-ALLOC-005, T-REG-007 |
| RT-06 fees and benefits | Monthly-billed fees counted per month in the horizon; financed-purchase waivers never counted; issuer-estimated benefits only if the user opts in | — | T-CALC-104 |

**Iberia Aire (FX-CARD-AIRE)**
- Rates: IAG 1/€1, partners 1/€2, other 1/€3, limit €1,000/month.
- Month spend: Iberia.com €200, partner €150, other €900.

| Reading | Result |
|---|---|
| Order-conservative (category totals only; the €250 that earns nothing is the highest-rate spend) | 300 + 50 + 0 = **350** (drives verdicts) |
| Known posting order (IAG → partner → other) | 200 + 75 + 216 = **491** |
| Alternative scope `rate_only` | 200 + 75 + 300 = **575** |

Band **350–575** (T-CALC-020, EC-RWD-27).

## 6. Allocation, baselines and ΔB (ENG-10 to ENG-13) [REQ-REC-CARD-*, REQ-REC-MARG-*, REQ-OWN-000, REQ-REC-INV-01]

### 6.1 Values (ENG-11)

- `TripValue(A) = v_trip × UsablePoints(A) + Cashback(A) − FX(A) − Surcharges(A) − AttributableFees(A)`
- `ResidualValue(A) = v_residual × SurplusPoints(A)` (v_residual default 0, D-10)
- **Usable points:** points that reach the trip programme via verified paths, post (max delay) by LSBD − transfer lead time, and don't expire before LSBD. They are **capped at `Need_p − already usable`**.
  - `Need_p` is buffered +10% for forecasts only (D-11). The exact price is used against a `VERIFIED_RESULT` (T-CALC-026).
- Bonuses count inside `UsablePoints` only when every condition in doc 00 §7.5 holds; otherwise they are surplus.
- Lost bonuses on other cards are captured by valuing the whole allocation. **There is no separate term.**

### 6.2 Baselines and ΔB (ENG-12)

- `ΔB_change = TripValue(A_recommended) − TripValue(A_status_quo)`, where status quo is Q-SPEND-02 "card used today". If unanswered, it is undefined and not shown.
- `ΔB_strategy = TripValue(A_with) − TripValue(A_without)`. A strategy is recommended only if `ΔB_strategy > minBenefit` (max(€10, 5% of trip saving), D-08) **and** G1–G8 pass.
- `ΔResidual` is shown separately and is **never** in ΔB or the trip saving.
- Every displayed ΔB carries its baseline label (T-CALC-025).

### 6.3 Gates (ENG-13): G1–G8 and refusal paths R1–R8

| Gate | Rule | Fixture |
|---|---|---|
| G1 | Only `necessary`, planned, eligible spend; optional or reward-only amounts are rejected, not costed | S-03 → T-CALC-103 |
| G2 / G3 | Statement paid in full, no carried debt; otherwise **no** card optimisation | S-12 |
| G4 | Monthly cash ≥ reserve, including after any pull-forward | S-11 (€1,490 < €1,500) → T-CALC-113 |
| G5 | New card only in M4 (P1) | F05 |
| G6 / G7 | Not known ineligible; offer valid through the window | S-13 → T-CALC-108 |
| G8 | Credit limit (if given) caps the allocation | T-ALLOC-008 |

**Refusal paths** (Phase 1 doc 01 §4) map to engine modes:
- `R1`/`R2`: no cards → allocation skipped.
- `R3`: balance unknown → affordability `UNKNOWN`.
- `R4`: range → `YES`/`NO`/`MAYBE` against bucket bounds.
- `R5`: no spending → forecast skipped.
- `R6`: M4 off.
- `R7`: cash-only → award options hidden.
- `R8`: existing points only.

T-CALC-110 covers R3 + R5.

### 6.4 Bounded allocation search (ENG-10) [correction of the Phase 1 feasibility estimate]

The Phase 1 statement "exact search feasible for about 15 expenses × 5 cards" is **withdrawn**: brute force is 5^15 ≈ 3×10^10.

**Algorithm**
1. **Partition cards.**
   - *Linear* cards: constant rate, no cap, threshold or milestone within the horizon.
   - *Non-linear* cards: RT-02/03/04 present.
2. **Linear-only case.** Each expense goes to the card with the highest marginal value (MV) under payment preferences (Q-CARD-08) and G8. This is exact for linear rules.
3. **Non-linear cards, at most 3 per window (AS-26 provisional).** For each card with a threshold or milestone:
   - compute candidate qualifying subsets of necessary expenses by **subset-sum DP over cents**;
   - targets are threshold + refund buffer (D-12), choosing **minimal overshoot**;
   - keep at most 5 candidates per card.

   For each cap, fill up to the cap in descending-MV order.
4. **Combine** candidate subsets across non-linear cards by branch and bound: disjoint subsets only (INV-1), ordered by TripValue. The remaining expenses use step 2.
5. **Exact mode:** used when there are ≤ **12 necessary expenses per window**.
   - Beyond that, steps 3–4 run with greedy subset candidates, and the result is labelled **"approximate"** (EC-ALLOC-12).
   - Hard limits: **50,000 node evaluations, 250 ms CPU** (AS-25 provisional).
6. **Post-conditions** (property test T-REG-120):
   - INV-1 to INV-8 hold.
   - The score is ≥ all-on-one-card and ≥ the highest-nominal-rate allocation.
   - Adding zero-MV spend never raises the score.
   - It passes every S-* and M-* fixture.

### 6.5 Worked examples (Phase 1 doc 02 §4.2–4.3; all ILLUSTRATIVE)

**Shared fixtures**
- Card T: 1/€1, rounded half-up per transaction; 5,000 bonus at ≥ €300 in 30 days; posts max 180 days; FX 2.9%; fee €0 if held, €60/yr if new.
- Card A: 1/€3, `floor` per period; €1,000 cap; 0% FX up to €500.
- Card B: 3/€ groceries.
- v = €0.010.
- Default baseline: all spend on A.

| Case | Expected | Test |
|---|---|---|
| S-01 | ΔB **€1.87** (T 280 = €2.80 vs A 93 = €0.93); bonus 0; no extra-spend suggestion | T-CALC-101 |
| S-02 | ΔB **€52.00** (5,300 pts vs 100 pts) | T-CALC-101 (variant) |
| S-02b (P0 engine / P1 UI) | ΔB_strategy = (53.00 − 60.00) − 1.00 = **−€8.00**, so not recommended | T-CALC-104 |
| S-02c | Goal met: ΔB **€0.00**; ΔResidual €0 | T-FLOW-121 |
| S-03 | G1 rejects the optional €20; outcome = S-01 | T-CALC-103 |
| S-04 (corrected) | Baseline {T €280, A €20} = 286 pts = €2.86; recommended {T €300} = €53.00; **ΔB_change = ΔB_strategy = €50.14**; A gives up 6 pts | T-ALLOC-102 |
| S-05 | ΔB **€51.42** (FX €0.58); all-foreign variant **€43.30** | T-CALC-101 (variant) |
| S-06 | Baseline B 900 pts = €9.00; ΔB **€44.00**; groceries return to B after the window | T-ALLOC-111 |
| S-07 | Excluded tax payment, so S-01; cap variant €1,400 on A, only €1,000 earns | T-CALC-101 (variant) |
| S-08 | Day 35 is outside the window: S-01, or S-02 if necessary and movable | T-CALC-101 (variant) |
| S-09 (corrected) | Bonus posts after LSBD: ΔB **€2.00**; residual shown separately | T-TIME-105 |
| S-10 | Refund €40 drops qualifying spend to €260; negative ledger entry; replan | T-REG-002 |
| S-11 | G4 rejects pull-forward | T-CALC-113 |
| S-12 | G2/G3 disable optimisation | T-CALC-113 (variant) |
| S-13 | G6/G7 remove the offer | T-CALC-108 |
| Competing bonuses | T 5,000 vs T2 3,000, both €300, €400 planned: choose T; T2's reason recorded | T-ALLOC-111 |
| M-01 | X **€22.10** > Y €20.00 > Z €0.40 | T-CALC-114 |
| M-02 | Split **€21.33** > all-on-C €20.00 | T-CALC-115 |
| M-03 | €500 → B (+**€10.00**); buffer variant T €340 / B €460 | T-ALLOC-116 |
| M-04 | Goal met: K **€3.00**/month; variant A €1.60 < €3.00 | T-CALC-117 |
| M-05 | ΔUsable 0 (wrong programme / posts too late) | T-CALC-118 |
| M-06 | (a) U −€23.40 vs A €8.00 (P0 engine / P1 UI); (b) U breaks T's bonus; (c) tie goes to the trip programme | T-CALC-119 |

**Invariant tests:**
- INV-1 to INV-7: T-ALLOC-001 to T-ALLOC-008.
- INV-8 property: T-REG-120.

## 7. Forecast, reconciliation, gap-fill (ENG-14 to ENG-16, ENG-23) [REQ-REC-FCST-01, REQ-REC-BUY-01, REQ-OWN-03]

- **ENG-23 `normalizeSpending`:** daily × 365/12, weekly × 52/12, rounded to cents; the original entry is kept (INV-7). T-FUN-009: €10/day → **€304.17**; €70/week → **€303.33**.
- **ENG-14 `forecast`:**
  - Projects usable points by month, applying max posting delays.
  - Category totals give `{conservative, expected}`. Merchant eligibility "Not sure" means the base rate, or 0 if the category is excluded.
  - The conservative value drives AFD and verdicts.
  - T-CALC-021 (Aire): groceries €400 + restaurants €300 → **233** conservative, **283** upper.
- **ENG-15 `reconcile(actual)`:** the actual posting replaces that month's estimate; later months are re-projected from the actual balance; the delta is emitted for What-changed. T-REG-017: 260 vs 233 → **+27**.
- **ENG-16 `gapFill`:** allowed only if all of these hold:
  - a specific award has been found;
  - gap ≤ 20% (D-25);
  - a user-entered price exists;
  - G2–G4 pass;
  - placement is after the live-check step.

  Purchased points count as **cash**. CS-02b / T-CALC-023 cover the 20.0% boundary, plus variants at 21% and with no price entered.

## 8. Availability, verdict, confidence (ENG-17, ENG-18, ENG-24) [REQ-OWN-05, REQ-RES-21, REQ-REC-CONF-01]

- **ENG-17 `availabilityState(leg, today, providerHorizon, programmeReleaseEstimate)`:** returns one of the six states.
  - Estimates are per programme (Iberia about 360, BA about 355, SECONDARY, AS-03).
  - No estimate → `UNKNOWN_AVAILABILITY`.
  - There is no universal horizon limit.
- **ENG-18 `verdict(inputs)`:**
  - LSBD = min(hard deadline, user cut-off) − 3 days (AS-16).
  - AFD = first date usable ≥ Need + max transfer lead.
  - Pessimistic cash = base × 1.15 (AS-17), labelled an assumption.
  - **Precedence:** Insufficient inputs → CASH_BETTER_THAN_AWARD → BOOK_AWARD_NOW / MONITOR_NO_TRANSFER → INSUFFICIENT_BY_DEADLINE → WAIT_ACCUMULATE → TOO_UNCERTAIN → BOOK_CASH_NOW.
  - **Availability restriction:** non-searchable award → only MONITOR / TOO_UNCERTAIN / WAIT, and WAIT only if a cash quote exists. No cash quote either → no WAIT. Any `BOOK_*` needs a searchable result.
  - Each verdict returns `{outcome, revisitDates[], invalidatingEvents[], confidence}`.
- **ENG-24 `confidence`:** High (VERIFIED_RESULT only, unreachable in the hackathon) · **Illustrative** (any LIVE_TEST or FIXTURE input) · Medium · Low · Insufficient. Doc 00 §7.10.

**Worked example.** FX-WIN-02: departure day 180; cash €780; award 50,000 + €320; usable 35,200 at +4,400/month; Need 55,000. AFD is **day 149** (day 135 + 14).

| V | Expected | Test |
|---|---|---|
| V1 (v €0.012) | CASH_BETTER_THAN_AWARD; EC €920; v* €0.0092 | T-TIME-001 |
| V2 (v €0.008, cut-off 30 d) | LSBD 147 < AFD 149 → INSUFFICIENT_BY_DEADLINE | T-TIME-002 |
| V3 (cut-off 14 d) | LSBD 163 ≥ 149; €720 < €897 → WAIT_ACCUMULATE; revisits every 30 days + day 142 | T-TIME-003 |
| V4 | Cash €690 on day 90 → BOOK_CASH_NOW | T-TIME-004 |
| V5 | Hold cost €120 > benefit €60 → BOOK_CASH_NOW | T-TIME-003 (variant) |
| V6 (v €0.0088) | Δ €20 < tolerance €39 and Illustrative → TOO_UNCERTAIN | T-TIME-006 |
| V7a / V7b | 56,000 usable: cached → MONITOR_NO_TRANSFER; verified → BOOK_AWARD_NOW | T-TIME-005 / T-TIME-007 |
| V8 (3-month) | LSBD 73 → INSUFFICIENT | T-TIME-002 (variant) |
| V9 (12-month, cash quote exists) | WAIT_ACCUMULATE + release reminder (~day 5, estimate) | T-TIME-010 |
| V10 (500 days, nothing searchable) | TOO_UNCERTAIN; reminders | T-TIME-012 |
| Missed bonus | AFD 132 → day 198 → BOOK_CASH_NOW | T-TIME-112 |

## 9. Bounded multi-city search (ENG-19) [REQ-BRF-02, REQ-REC-MULTI-01]

**Inputs:** ≤ 6 legs (AS-07); per-leg options; whole-trip fares; shared points pool; constraints.

**Algorithm**
1. **Pre-filter** options failing hard constraints or gates.
2. **Dominance pruning per leg:** drop option *a* if another option *b* on the same leg has cashOut ≤ *a*'s and, for every programme, points ≤ *a*'s, with at least one strict inequality.
3. **Candidate caps:**
   - per leg, keep **K = 5** (up to 3 cash and 3 award, then the best 5 by EC);
   - whole-trip fares **W = 5**.
4. **Branch and bound over legs:**
   - order legs by ascending option count;
   - **Lower bound** = partial EC + Σ min-EC of remaining legs;
   - prune when the bound ≥ best EC so far;
   - prune when the partial points per programme exceed the usable pool (INV-4).
   - Whole-trip fares are evaluated as alternatives that cover their legs.
5. **Limits:** 5^6 = 15,625 leaves worst case. Hard cap **50,000 node evaluations / 250 ms** (AS-25).
6. **Deterministic tie-break:** objective → total cashOut → total points → number of tickets → lexicographic option IDs.
7. **Fallback when the limit is hit:**
   - return the best combination found, labelled **"Approximate – search limit reached"**;
   - always also return N and the greedy per-leg result;
   - log `{legs, options, nodes}` with no personal data.

**CS-05 (FX-MULTI-01, balance 30,000, v €0.010):**
- Per-leg cheapest (both awards) = €920 but needs 50,000 points, so it is **rejected with the reason "Needs 50,000 points; you have 30,000"**.
- Mixed options cost €1,040 / €1,030.
- Open-jaw cash + L2 = **€970**, which is chosen.
- N = €970, so the saving is **€0.00**.
- Tests: T-CALC-007, T-FLOW-009.

## 10. Replanning and explanations (ENG-20 to ENG-22) [REQ-OWN-08, REQ-REC-REPLAN-01, REQ-REC-EXPL-01]

- **ENG-20 `replanDiff(approvedVersion, newInputs, event)`:**
  - Recomputes from scratch (CH-4).
  - Returns per-link deltas (ledger, earn, bonus, usable, AFD, verdict, cash, reserve headroom) and `requiresApproval` (true if an approved action or booked leg would change).
  - Booked legs are immutable inputs.
  - Covers events R-EV-01 to R-EV-14 (T-REG-001 to T-REG-016).
  - T-REG-107 (iPhone €1,200 on V3): reserve dips to €1,200 (breach €300), usable +1,200, AFD 149 → ~141, verdict WAIT but flagged, approval required.
- **ENG-21 `buildExplanation(result)`:** produces the 9-field contract (doc 00 §7.8). It is invalid if any field is missing (T-FUN-027). `rejectedAlternatives` includes "spend more on card X" when MV = 0.
- **ENG-22 `validateLlmText(text, contract)`:**
  - Rejects any number, date, card or programme name not present in the contract (T-SEC-008).
  - On rejection, falls back to the template.
  - Adds the AI label (T-FUN-023).

## 11. Provisional parameters (owner: product owner; none is approved yet)

| Param | Default | Decision |
|---|---|---|
| Reference valuation | €0.010/pt, ±30% sensitivity | D-02 |
| minBenefit | max(€10, 5% of the trip saving) | D-08 |
| v_residual | 0 | D-10 |
| Need buffer | +10% (forecast only) | D-11 |
| Refund buffer | €0 / largest refundable | D-12 |
| Tolerance | max(5%, €25) | D-24 |
| Gap-fill limit | 20% | D-25 |
| Cap-scope default | restrictive | D-26 |
| Search limits | K=5, W=5, 50,000 nodes, 250 ms; ≤12 expenses exact; ≤3 non-linear cards | AS-25, AS-26 (new, doc 11) |
| LSBD buffer / pessimistic X | 3 days / +15% | AS-16 / AS-17 |
