# Project B: Discovery Audit and Correction Report (26 Oct 2026)

| Field | Value |
|---|---|
| Scope | Documentation review only, covering the four Phase 1 discovery documents. No application code, architecture or DDL, installs, deployment, or edits to the original technical master plan. |
| Inputs | The four discovery documents (pre-audit state); the A Una Milla post-consultation guide for client Eriz (06/09/2026, English summary supplied by the owner); the A Una Milla card page; issuer pages (Iberia Cards, Revolut, American Express, CaixaBank/Vueling) |
| Original master plan | `C:\Users\vkapspc -15\.cursor\plans\project_b_planning_package_32a6e260.plan.md`: **not modified**. Proposed changes are recorded in doc 03 §9 (items 1–30). |

---

## 1. Files

| Action | Files |
|---|---|
| **Backed up**, byte copies before any edit | `docs/project-b/_backup/2026-10-26_pre-audit/00_PRODUCT_DISCOVERY_AND_REQUIREMENTS.md`, `…/01_END_TO_END_USER_FLOWS.md`, `…/02_EDGE_CASES_AND_ACCEPTANCE_TESTS.md`, `…/03_PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md` |
| **Updated** | `00_PRODUCT_DISCOVERY_AND_REQUIREMENTS.md`, `01_END_TO_END_USER_FLOWS.md`, `02_EDGE_CASES_AND_ACCEPTANCE_TESTS.md`, `03_PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md` |
| **Created** | This report |
| **Not touched** | The original technical plan file; `frontend/`, `backend/` |

Stable IDs were preserved. Corrected rows keep their ID and are marked "(corrected)" or "(audit)".

---

## 2. Verification performed (26 Oct 2026)

| Source | What was checked | Result |
|---|---|---|
| [aunamilladetudestino.com/tarjetas-de-credito](https://aunamilladetudestino.com/tarjetas-de-credito/) | Cards listed by the community | 9 cards: Iberia Icon, "Iberia Icon Aire", "Iberia Zenit Gold", Revolut Ultra, Amex Platinum, Amex Gold, "Air Europa Bankinter", "Vueling UP", "Miles & More Caixabank". The copy still uses "Iberia Plus". |
| [iberiacards.es/wp/iberia-aire](https://www.iberiacards.es/wp/iberia-aire/), [product page](https://www.iberiacards.es/tarjetas-personales/iberia-aire/) | Iberia Aire earn rules | 1/€1 IAG · 1/€2 partners · 1/€3 elsewhere. The €1,000/month limit is worded ambiguously. Welcome 9,500 + 6,000 Avios. €5/month. |
| [iberiacards.es/wp/iberia-zenit](https://www.iberiacards.es/wp/iberia-zenit/) | Zenit rules | 3/€1 IAG tickets; 1/€1 elsewhere; wallets capped at €5,000/month; 0% FX; Club Oro. Fee not shown. |
| [Revolut ES credit cards](https://www.revolut.com/es-ES/credit-cards/), [Revolut ES earn FAQ](https://help.revolut.com/es-ES/help/revpoints/what-is-revpoints/question-how-to-earn-revpoints/) | Debit and credit earn rates by plan; credit availability | Credit card available to Spain residents (subject to approval). Rates differ by plan. This contradicts the client guide's "Ultra only". |
| [Amex Business Platinum ES](https://www.americanexpress.com/es-es/negocios/tarjetas/tarjeta-business-platinum/) | Fee, earn, transfers | €65/month; 1 MR/€1; 1 MR = 1 Iberia Avios or 1 SUMA mile. No Spanish welcome offer found. |
| CaixaBank Vueling page + Vueling T&C 2026 (search extract) | Vueling Visa / UP! | 1/€2 everyday spend; UP! welcome 9,000 Avios for €600 in 3 months; €90/year after year 1. **OFFICIAL-EXTRACT only.** |
| Client guide | Method rules; Avios-move steps via BA | Adopted as CG-1 to CG-8. Card claims checked against issuers. |

**Not re-fetched in this pass:** the BA "Combine My Avios" page and the avios.com Qatar page, both cited in the client guide. The earlier avios.com verification stands.

---

## 3. Corrections made

### 3.1 Calculations and formulas

| # | Item | Before (pre-audit) | After | Where |
|---|---|---|---|---|
| C-01 | ΔB formula | Summed per-expense differences; **added `bonusValueResidual`** while stating that residual value is never in the trip saving; separate `lostOtherBonusValue` term, which double-counts | Allocation-level `TripValue(A)`; two named baselines (`A_status_quo` → ΔB_change, `A_without` → ΔB_strategy); residual shown only as ΔResidual; lost bonuses captured inside TripValue | Doc 00 §7.5 |
| C-02 | S-04 | Implicit all-on-A baseline; "A loses 7 points"; ΔB **€52.00** | Explicit baseline {T €280, A €20}; A gives up 6 points (€0.06); **ΔB_change = ΔB_strategy = €50.14** | Doc 02 §4.2; T-ALLOC-102; REQ-REC-CARD-02 |
| C-03 | S-09 | "bonusValueForTrip = 0", but ΔB not stated | **ΔB = €2.00** (ordinary earn only); bonus shown only as ΔResidual (€0 by default) | Doc 02 §4.2; T-TIME-105 |
| C-04 | S-02c | Bonus value 0, ΔB not stated | **ΔB = €0.00** (goal met; v_trip = 0) | Doc 02 §4.2 |
| C-05 | Break-even | `v* = (N_cash − cashOut − extras)/points`, which subtracts extras already inside cashOut | `v* = (EC_cash(C) − cashOut(A))/points(A)`; T-CALC-022: €0.0079 (the old formula gave €0.0068) | Doc 00 §7.2 |
| C-06 | CS-02 message | "Points would save €110, but you're 5,000 short" | "Not bookable with your current points…"; H stays cash €520; hypothetical €410 clearly conditional | Doc 02 §4.1; T-CALC-005 |
| C-07 | CS-02b (new) | — | Gap-fill top-up with a user-entered price €0.0213: EC **€466.50**, saving €53.50 (10.3%), only after the live check, gap ≤ 20% | Doc 02 §4.1; T-CALC-023; REQ-REC-BUY-01 |
| C-08 | Need buffer | +10% applied everywhere | Buffer for forecasts only; exact need against a live-verified price | Doc 00 §7.6; T-CALC-026 |
| C-09 | Forecast granularity | Category totals treated like transaction data | ESTIMATE band; merchant eligibility asked (Q-SPEND-02b); "Not sure" → base rate or 0 if excluded; conservative value drives verdicts; actual postings replace estimates | Doc 00 §7.13; T-CALC-021 (233/283); T-REG-017 |
| C-10 | Long horizon | Universal "at most 360 days" validation | Removed. Availability states `VERIFIED_RESULT`, `TEST_OR_ILLUSTRATIVE`, `CACHED`, `NOT_YET_SEARCHABLE`, `ESTIMATED_RELEASE_WINDOW`, `UNKNOWN_AVAILABILITY`; verdict restrictions; V10 (500 days) → `TOO_UNCERTAIN` | Doc 00 §5.2a, §7.7; doc 02 §3.2; T-VAL-003, T-TIME-012 |
| C-11 | Confidence | "High" allowed with demo fixtures | New level "Illustrative"; High needs `VERIFIED_RESULT` (not reachable in the hackathon) | Doc 00 §7.10 |
| C-12 | Priority consistency | New-card fee cases (S-02b, M-06a) marked P0 while M4 is P1 | P0 engine / P1 UI | Doc 00 §9.4; doc 03 §3 |

### 3.2 Data sources and card terms

| # | Item | Before | After | Where |
|---|---|---|---|---|
| D-01 | **Iberia Aire** | "1 per €3 up to €1,000/month, then 0 (hard stop)", filed as RT-02 and called VERIFIED; fixture Card C "the mechanism VERIFIED for Iberia Aire" | Three category rates (RT-01) + cap with an **ambiguous `cap_scope`** (RT-04). Restrictive reading by default (D-26), with a sensitivity. FX allowance marked unverified-current. New fixture FX-CARD-AIRE: conservative **350**, known-order **491**, alternative reading **575** Avios. Card C relabelled as a generic illustrative cap. | Doc 00 RF-7, §5.11, §7.4; doc 02 §4.5, EC-RWD-22/27; T-CALC-020 |
| D-02 | Revolut | One rate pair per plan from the FAQ | Debit (FAQ) and credit (credit-card page) by plan; credit available to Spain residents; the client guide's "Ultra only" recorded as CONFLICTING | Doc 00 RF-12, §5.11; FX-CARD-REV; EC-CARD-24 |
| D-03 | Catalogue scope | Implicit | Canonical names + website aliases; P0 catalogue / template / custom / P1 per product (D-27) | Doc 00 §5.11; REQ-REC-CAT-01; T-FUN-033 |
| D-04 | Amex Business Platinum | Absent | Template (business product; welcome UNVERIFIED; business-only allocation, EC-CARD-25) | Doc 00 RF-13, §5.11 |
| D-05 | Avios moves | 1:1, account ≥ 30 days | + BA bridge; Qatar must be linked to BA; names, date of birth and email must match; 30 vs 90 days CONFLICTING (stricter reading used) | Doc 00 RF-14, §5.7; REQ-RES-20; EC-CARD-21–23; T-FUN-032 |
| D-06 | Provenance | Badges only | Correctness vs provenance rule; "Example saving (illustrative data)"; pairing label; demo claim check | Doc 00 §7.12; REQ-RES-19; T-FUN-031, T-DEMO-005 |
| D-07 | Client method | Not captured | CG-1 to CG-8 adopted; reference persona P-G; scenario **REF-01** (MAD → JNB Business, illustrative) | Doc 00 §3.1b; doc 01 REF-01; doc 02 §4.4; T-CALC-024 |
| D-08 | Language | "English UI (owner decision)" | Evidence recorded: owner selected "English only (jury-friendly), Spanish later" on 26 Oct 2026; client confirmation open (QA-11); localisation implications; UNR-09 for launch | Doc 00 §2.1; doc 03 D-04 |

---

## 4. Remaining factual conflicts and unverified terms

| ID | Item | Status | Resolution path |
|---|---|---|---|
| GAP-15 | Iberia Aire €1,000 limit: do IAG and partner purchases count? Is the 0% FX up to €500/month still current? | AMBIGUOUS / UNVERIFIED | Ask Iberia Cards (QA-12) |
| GAP-16 | Revolut: Standard credit rate (FAQ only); Premium credit rate wording; client guide vs issuer on credit availability | CONFLICTING / VERIFIED-FAQ | Issuer page prevails; re-check before launch |
| GAP-17 | Amex Business Platinum welcome offer; business MR partner list beyond Iberia/SUMA; personal-use restrictions | UNVERIFIED | Template + user confirmation; UNR-10 |
| GAP-18 | Vueling cards: booking-earn rates differ between CaixaBank and Vueling sources | OFFICIAL-EXTRACT only | Fetch both full documents |
| GAP-19 | Iberia Zenit fee | Not found | User-entered |
| GAP-20 | MAD → JNB operators and award prices | Not verified | REF-01 stays illustrative |
| CR-19 | Avios account age 30 vs 90 days | CONFLICTING | Stricter reading until re-checked |
| GAP-02 | Release windows (about 355–360 days) | SECONDARY | Per-programme estimate only |
| (existing) | Iberia partner-award refunds; Flying Blue €70 fee; child award discounts; Amex Platinum offer by landing page | CONFLICTING / SECONDARY / UNVERIFIED | Unchanged (doc 02 §9) |

---

## 5. Traceability after the audit

| Artefact | Before | After | Change |
|---|---|---|---|
| Requirements | 81 | **87** | +REQ-RES-19, 20, 21; +REQ-REC-CAT-01, FCST-01, BUY-01 |
| Edge cases | 149 | **161** | +EC-TRIP-21; +EC-CARD-21 to 25; +EC-OPT-21, 22; +EC-RWD-24 to 27 |
| Planned tests | 167 | **181** | +T-FUN-031 to 034; +T-CALC-020 to 026; +T-REG-017; +T-TIME-012; +T-DEMO-005 |
| Corrected tests | — | — | T-ALLOC-102 (€50.14), T-CALC-005 (CS-02 wording), T-VAL-003 (no 360 limit), T-TIME-105 (ΔB €2.00) |
| Decisions | D-00 to D-24 | D-00 to **D-28** | +D-25 gap-fill limit, D-26 cap-scope default, D-27 P0 catalogue, D-28 REF-01 in demo |
| Assumptions | AS-01 to 21 | AS-01 to **24** | +AS-22 to 24; AS-03 narrowed to a per-programme estimate |
| Legal questions | UNR-01 to 08 | UNR-01 to **10** | +UNR-09 (Spanish-language consumer information), UNR-10 (business cards) |

**ID cross-check (script, re-run after the corrections):** 0 undefined test, edge-case, requirement, assumption, decision, UNR or QA references across the four documents. Stale-string scan: the withdrawn phrases appear only in labelled historical notes.

New traceability rows are in doc 02 §8 and doc 01 §11.

---

## 6. P0 (hackathon) vs deferred

| Scope | Features |
|---|---|
| **P0** | Quick Flight; Full Trip Plan; Normal / Hacked / Saving with **"Example saving (illustrative data)"**; Goal A/B; flexible dates and airports; wallet; verified transfer graph + **Avios move preconditions**; award steps + **gap-fill calculation**; Duffel test checkout; mock mode; **availability states (no horizon limit)**; **catalogue per D-27**; M3-lite (existing cards, RT-01/03/04/06 incl. Aire's ambiguous cap, gates, P-01, invariants, **named baselines**, **forecast bands + manual actuals**); seven-outcome verdict; replanning (latest diff); reminders; transparency page; export/delete; English UI with a string catalogue |
| **P0 engine only** | New-card and plan-upgrade fee logic (S-02b, M-06a); new-card ineligibility |
| **P1** | M4 UI; RT-02 (Icon €18,000 step); RT-05 promotions and multipliers; multi-bonus optimisation; offer snapshots; revision-history UI; email reminders; price alerts; forecast variance prompts; template → catalogue promotion; es-ES |
| **P2** | Authorised live award and price data; monitoring; more markets; link/screenshot pre-fill; more channels; tax notes (only with a lawyer) |

**Feasibility:** UNRESOLVED (gate G-16). The audit added modest P0 items. The plan holds only if the §2A decisions are approved tonight (D-22).

---

## 7. Owner decisions needed before the technical master plan is updated

From doc 03 §2A (hackathon MVP):

| Decision | Topic | Recommended default |
|---|---|---|
| D-01 | Objective | Goal B |
| D-02 | Valuation | €0.010 editable + break-even shown |
| D-05 | Reserve | Required, no default |
| D-08 | Minimum ΔB | max(€10, 5%) |
| D-10 | v_residual | 0 |
| D-11 | Need buffer | +10% (forecast only) |
| D-12 | Refund buffer | €0 / largest refundable |
| D-14 | Analytics | None |
| D-22 | Approval timing | Tonight |
| D-24 | Tolerance | max(5%, €25) |
| D-25 | Gap-fill limit | 20% |
| D-26 | Cap-scope default | Restrictive |
| D-27 | P0 catalogue set | As in doc 00 §5.11 |
| D-28 | REF-01 in demo | Only with client permission, labelled illustrative |

**Also:** approve the 30 proposed updates in doc 03 §9 before they are integrated into the master plan.

**Commercial-launch items (not hackathon blockers, doc 03 §2B):**
- D-06, D-09, D-13, D-15;
- UNR-01 to UNR-10;
- QA-11 (client language confirmation);
- the DPIA, paid hosting tiers and live-data agreements.

---

## 8. Limits of this audit

- **Legal:** this is research, not legal advice. No legal compliance is claimed.
- **Data sources:** card terms change. All facts are dated 26 Oct 2026, and some came from search extracts (marked OFFICIAL-EXTRACT).
- **Arithmetic checks:** corrected calculations were re-derived by hand and written into the fixtures. No code was run, because no application exists.
