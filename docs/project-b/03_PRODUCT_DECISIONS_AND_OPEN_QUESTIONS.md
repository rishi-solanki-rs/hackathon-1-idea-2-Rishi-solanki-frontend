# Project B: A Una Milla. 03: Product Decisions and Open Questions

| Field | Value |
|---|---|
| Phase | Phase 1: Discovery. Stops here: no architecture, no DDL, no implementation. |
| Status | Draft for owner review, 26 Oct 2026. **Revised by the audit and correction pass** (see [DISCOVERY_AUDIT_REPORT_2026-10-26.md](DISCOVERY_AUDIT_REPORT_2026-10-26.md); backup in `_backup/2026-10-26_pre-audit/`). |
| Companion docs | [00 Requirements](00_PRODUCT_DISCOVERY_AND_REQUIREMENTS.md) · [01 Flows](01_END_TO_END_USER_FLOWS.md) · [02 Edge cases and tests](02_EDGE_CASES_AND_ACCEPTANCE_TESTS.md) |
| Existing plan (not modified) | `C:\Users\vkapspc -15\.cursor\plans\project_b_planning_package_32a6e260.plan.md` |

---

## 1. Executive summary

**What this is.** A Spain-first, EUR-priced app in English for the A Una Milla community. It answers the brief's question, "How much could I save on this trip?". It works for one flight (Quick Flight) or a multi-stop trip (Full Trip Plan). It shows normal price, hacked price and saving in € and %, explains why the saving works, and either books the cash ticket (Duffel test mode) or gives safe, ordered award-booking steps. `[BRIEF]`

**What makes it different.** It is a planner with a conscience. For users who want it, it uses existing points, cards and already-planned spending. It decides whether to book now or wait, using labelled scenarios and never predictions. It replans when life changes, with "What changed" explanations.

Its governing rule is **P-01**: minimise the user's necessary spending and realistic total trip cost, and earn only rewards that genuinely help this trip. It never optimises for spending volume, gross points, bonuses for their own sake, or a card issuer's interests. `[OWNER]`

**What is honest about it:**
- In the hackathon, the only live data is Duffel's **test** environment. Its prices are not real.
- Award prices, card offers and balances are labelled fixtures or user entries.
- Savings can be €0 or negative ("Cash is better"). The app says so.
- **Calculation correctness and data provenance are kept separate.** The engine's arithmetic is tested, but every hackathon saving is an "Example saving (illustrative data)". None is a real market saving (REQ-RES-19).
- Card terms were re-verified on 26 Oct 2026. Several ambiguities and conflicts remain and are labelled, notably Iberia Aire's €1,000 limit scope and Revolut credit-card availability (section 4, CR-17 to CR-24).
- Several legal questions (new-card suggestions, commissions, who legally sells the ticket) need a Spanish lawyer before any commercial launch.

### 1.1 Recommended end-to-end flow (one paragraph)

1. **Landing.** The user lands and enters essentials (from, to, dates with a ±3-day chip, travellers, cabin).
2. **First result, as a guest.** Within seconds they see Normal vs Hacked vs Saving as a guest, with all-in prices, provenance badges and a confidence chip. In the hackathon this is always labelled "Example saving (illustrative data)".
3. **Act or personalise.** They can book cash (test), follow award steps, or personalise:
   - **M2:** add balances, exactly, as a range, or as "unknown".
   - **M3 (plan ahead):** add target date, reserve, existing cards, monthly spending, planned purchases, and two gate questions about paying in full and carrying debt.
4. **Plan.** The engine allocates only necessary planned spend using marginal usable value. It projects usable points to a points-goal meter, computes the award-feasible date against the latest safe booking date, and returns one of seven verdicts with a revisit date and invalidating events.
5. **Approve and save.** The user approves. Saving requires sign-in, and guest data migrates.
6. **Change.** Any later change (iPhone, refund, new balance, rejected card, new dates) creates a draft version with a "What changed" card. Approved and booked items stay protected.
7. **Outcome.** Every path ends in a test cash booking, a recorded award booking, or a dated next action.

Full detail is in doc 01, section 1.

### 1.2 Highest-risk missing or unresolved scenarios

| # | Scenario | Risk | Where handled / what's missing |
|---|---|---|---|
| 1 | Award data for Iberia and BA Avios in Spain | No authorised source; Seats.aero doesn't cover them | Fixtures only (GAP-01). P2 commercial agreement needed |
| 2 | New-card suggestions under the EU Consumer Credit Directive 2 (CCD2, from 20 Nov 2026) | May count as regulated "advisory services" | M4 stays P1, neutral, opt-in. Lawyer (UNR-01) |
| 3 | Any future commission | Credit-intermediary registration | No commissions (D-15). Lawyer (UNR-02) |
| 4 | Real booking (live Duffel) | KYC, merchant of record, travel-agency registration | Test mode only. UNR-03 |
| 5 | Award release-date timing | SECONDARY only | Labelled "estimated" (AS-03, GAP-02) |
| 6 | Family and infant award bookings | Phone-only paths; child discounts unverified | Instructions only (REQ-RES-04, GAP-12) |
| 7 | Default points valuation | Drives every Goal B ranking | D-02 needs the owner. Break-even always shown |
| 8 | Supabase free-tier sign-in email limits | Jury may not be able to sign in | Verify (GAP-10). Guest mode covers the core demo |
| 9 | Iberia Aire €1,000 limit scope (does IAG/partner spend count?) | Aire forecasts could be off by up to about 39% in the FX-CARD-AIRE example (350 vs 575 Avios) | Restrictive reading + sensitivity (EC-RWD-27); ask Iberia Cards (QA-12) |
| 10 | Category-total forecasts vs transaction-level rules | Forecast accuracy | ESTIMATE band; conservative value drives verdicts; actual postings replace estimates (REQ-REC-FCST-01) |
| 11 | Demo presenting test or illustrative prices as real | Misleading claims (LCD/UCPD); jury trust | REQ-RES-19, T-DEMO-005 |
| 12 | Spanish-language consumer information for a Spanish audience | Possible legal requirement; community fit | P0 English (D-04); string catalogue; UNR-09 for launch |

### 1.3 Decisions requiring owner approval (summary; details in section 2)

- **Needed for the hackathon MVP (section 2A):** D-01, D-02, D-05, D-08, D-10, D-11, D-12, D-14, D-22, D-25, D-26, D-27.
- **Can wait until commercial launch (section 2B):** D-06 (M4 timing beyond P1), D-09 (only matters with M4), D-13, D-15 (commission model), plus legal UNR-01 to UNR-10.

### 1.4 Requirements to approve before technical planning (prioritised)

1. **REQ-OWN-000 (P-01)** and INV-8 (objective neutrality).
2. **REQ-BRF-01–06:** Quick Flight, Full Trip Plan, Normal/Hacked/Saving, € and % with explanation, book or steps, mobile-first states.
3. **REQ-RES-01, 02, 06, 08, 13, 17:** all-in price, quote expiry, three-state conditions, no transfer before a live check, no "free", provenance badges.
4. **REQ-OWN-10 and section 7.2 of doc 00:** the definitions of N, H, economic cost (EC) and savings, plus Goal A vs Goal B.
5. **REQ-OWN-05:** the seven book-now-vs-wait outcomes and their precedence (doc 02, section 3.1).
6. **REQ-OWN-13:** gates G1–G8, and **REQ-REC-INV-01** (INV-1–8).
7. **REQ-REC-MARG-01–06** and **REQ-REC-CARD-01–08**, with the S and M cases as acceptance fixtures.
8. **REQ-REC-EXPL-01** (explanation contract) and **REQ-REC-REJ-01** (rejection memory).
9. **REQ-OWN-08:** replanning R-EV-01–14 and conflict rules CH-1–CH-5.
10. **REQ-OWN-09 / R1–R8:** useful without data.
11. **REQ-OWN-11/12:** data minimisation, guest mode and free-tier auth.
12. **P0 scope split** (section 3).
13. **Audit additions:**
    - REQ-RES-19 (provenance vs correctness);
    - REQ-RES-20 (Avios move preconditions);
    - REQ-RES-21 (no universal horizon limit; availability states);
    - REQ-REC-CAT-01 (catalogue scope, D-27);
    - REQ-REC-FCST-01 (forecast bands and actuals);
    - REQ-REC-BUY-01 (gap-fill only);
    - the corrected ΔB, break-even and S-04 definitions (doc 00 §7.2 and §7.5).

---

## 2. Decisions

**Status:** `CONFIRMED` (the owner answered on 26 Oct 2026) · `LOCKED` (a principle) · `PROPOSED` (needs owner approval).

| ID | Decision | Recommended default | Rationale | Status | Blocks |
|---|---|---|---|---|---|
| D-00 | Product principle P-01 | As written in doc 00, section 1.1 | Owner's final addendum | **LOCKED** | Everything |
| D-01 | Default objective | **Goal B, lowest true cost.** Both numbers always shown. | Owner's central objective is realistic total cost. Goal A is still one tap away. | PROPOSED | Ranking |
| D-02 | Default points valuation | **Show break-even v\* always.** Rank with an editable reference value of **€0.010 per point** for Avios-family and Flying Blue, labelled `ASSUMPTION`, with ±30% sensitivity. Alternative: break-even-only mode (no ranking until the user sets a value). | Published valuations are USD-based and use conflicting methods. A visible, editable conservative value lets Goal B work without pretending precision. | PROPOSED | Goal B ranking |
| D-03 | MVP market | Spain, cards issued in Spain, EUR | Community is Spain-based. Transfer ratios are keyed by country. | PROPOSED (research-backed) | Catalogue |
| D-04 | UI language | **English for P0**, with a string catalogue ready for es-ES (P1) | On 26 Oct 2026 the owner (the hackathon builder) chose "English only (jury-friendly), Spanish later" in a structured question. The client and community are Spanish-language; the client hasn't confirmed (QA-11). Localisation implications: doc 00 §2.1. | **CONFIRMED by owner for P0**; client confirmation **OPEN** | Copy |
| D-05 | Minimum cash reserve in M3 | **Required, no default value** | Financial safety. A default would be an assumption about someone's finances. | PROPOSED | M3 |
| D-06 | New-card exploration (M4) | **P1, opt-in, neutral, no commissions** | CCD2 and intermediary risk; deadline | PROPOSED | Scope |
| D-07 | Currencies in P0 | EUR display only; original currency shown in the breakdown | Scope; Reg 1008/2008 currency rule | PROPOSED | — |
| D-08 | Minimum ΔB to recommend a card strategy | **max(€10, 5% of the trip's economic saving)** | Avoid recommending trivial optimisations that add complexity | PROPOSED (OQ) | REQ-REC-CARD |
| D-09 | New-card fee horizon | **12 months** (conservative: welcome offers usually require keeping the card), with "until trip" shown as a sensitivity | Prevents short-horizon fee understatement | PROPOSED (OQ) | S-02b, M-06 |
| D-10 | `v_residual` (surplus points) | **0** unless the user states a later use with a horizon before expiry | P-01: don't value points with no realistic use | PROPOSED (OQ) | M-04, M-05 |
| D-11 | Trip points need buffer | **+10%** | Covers price variation between search and booking | PROPOSED (OQ) | AFD |
| D-12 | Refund buffer for thresholds | **€0**, or the largest refundable expense in the qualifying set when the user marks it refundable | Minimal overshoot plus clawback protection | PROPOSED (OQ) | M-03 |
| D-13 | Data retention | Delete inactive accounts after **12 months** with a 30-day notice. Keep quote logs for the life of the trip plus 12 months (to support savings claims). | GDPR storage limitation; consumer-law burden of proof | PROPOSED | Privacy |
| D-14 | Analytics in P0 | **None**, or cookieless first-party only | Consent rules (LSSI 22.2, AEPD); scope | PROPOSED | — |
| D-15 | Business model | **Free, no affiliate links or commissions** in P0. Any commission model goes to a lawyer first. | Ley 16/2011 / Ley 2/2009 intermediary risk; neutrality (INV-8) | PROPOSED | Card features |
| D-16 | Limits | ≤ 6 legs, ≤ 9 travellers, ≤ 3×3 airports | Search cost; Duffel and UX practicality | PROPOSED (AS-07/08) | Validation |
| D-17 | Infants | Cash: supported in P0. Award: instructions only (phone booking) | Programme rules (REQ-RES-04) | PROPOSED | F15 |
| D-18 | Guest data | Local storage until sign-in; one-time migration | Value-first onboarding | PROPOSED | Auth |
| D-19 | Live data | **Duffel test mode only**; everything else is a labelled mock | Owner answer | **CONFIRMED** | Providers |
| D-20 | AI in product | Templates by default; optional small LLM behind a flag that only rephrases explanation fields | Owner answer | **CONFIRMED** | REQ-REC-EXPL-01 |
| D-21 | Accounts | Free-tier Supabase Auth (email). Guest Quick Flight. | Owner answer: "use the convenient free version" | **CONFIRMED** (in principle) | Auth |
| D-22 | Approval timing | Approve discovery by end of **Mon 26 Oct 2026**, so technical planning and build fit before the **Wed 28 Oct** deadline | Hackathon schedule (brief, section 3) | PROPOSED | Schedule |
| D-23 | Default preferences | Self-transfer = No; nearby airports off; overnight layover = No | Risk avoidance | PROPOSED | Search |
| D-24 | Tolerance | max(5%, €25) | Avoid false precision in near-ties | PROPOSED (AS-10) | Ranking |
| D-25 | Gap-fill top-up limit (audit) | Gap ≤ **20%** of the award's points; price must be user-entered; only after the live check | Client guide CG-6; P-01 | PROPOSED (OQ) | REQ-REC-BUY-01 |
| D-26 | Ambiguous cap scope default (audit) | **Restrictive reading** (Iberia Aire: all spend shares €1,000/month) + order-conservative forecast; the alternative shown as a sensitivity | Conservative-defaults rule | PROPOSED | FX-CARD-AIRE |
| D-27 | P0 catalogue set (audit) | Catalogue: Iberia Aire, Iberia Icon, Amex Platinum, Amex Gold, Revolut (all plans, debit and credit). Templates: Iberia Zenit, Amex Business Platinum, Bankinter Visa Air Europa SUMA, Vueling Visa / UP!. Custom: CaixaBank Miles & More, Santander plan. | Matches the A Una Milla card page; the verification depth fits the deadline (doc 00 §5.11) | PROPOSED | Catalogue |
| D-28 | Use REF-01 (the consultation example) in the demo? (audit) | Optional. If used, it must be labelled "illustrative" with the client's permission. | The client's personal data and preferences | PROPOSED | Demo script |

### 2A. Decisions needed to complete the hackathon MVP

These must be answered (or the recommended default accepted) before the technical master plan is updated:

| Decision | Why it blocks the MVP |
|---|---|
| D-01 objective, D-02 valuation, D-24 tolerance | Every ranking and hero depends on them |
| D-05 reserve required | M3-lite can't compute without it |
| D-08 minimum ΔB, D-10 v_residual, D-11 need buffer, D-12 refund buffer, D-25 gap-fill limit, D-26 cap-scope default | Fixture expected values and tests depend on them |
| D-27 P0 catalogue set | Determines seed data and catalogue tests |
| D-14 analytics | Consent banner in P0 or not |
| D-22 approval timing | The Wed 28 Oct deadline |
| D-28 REF-01 in demo | Demo script |

**Already decided (CONFIRMED):** D-04 (English P0), D-19 (Duffel test only), D-20 (templates + optional LLM), D-21 (free-tier auth + guest).
**Locked principle:** D-00 (P-01).

### 2B. Decisions and questions that can wait until commercial launch (not hackathon blockers)

| Item | Why it can wait |
|---|---|
| D-06 M4 timing and D-09 fee horizon | M4 is P1; the fee engine is tested in P0 with D-09's default |
| D-13 retention | Needed before real users; the hackathon has no real users |
| D-15 commission model | P0 has no affiliate links |
| UNR-01 to UNR-10 (section 7.2) | Legal questions for commercial use |
| QA-11 client language confirmation | P0 is English; Spanish is P1 |
| Paid hosting tiers, DPIA sign-off, live data agreements | Required before real users or commercial use |

---

## 3. Scope (P0 / P1 / P2) as specified in Phase 1

| Scope | Included |
|---|---|
| **P0 (hackathon)** | Quick Flight; Full Trip Plan (≤ 6 legs) with shared-pool combinations; Normal/Hacked/Saving; Goal A/B; flexible dates and airports; wallet (exact/range/unknown); verified transfer graph **with Avios move preconditions (REQ-RES-20)**; award steps with guards **and optional gap-fill calculation (REQ-REC-BUY-01)**; Duffel test checkout; mock mode; saved trips with guest migration; provenance and confidence **with "Example saving (illustrative data)" labelling (REQ-RES-19)**; **availability states with no universal horizon limit (REQ-RES-21)**; **catalogue per D-27 with canonical names and aliases (REQ-REC-CAT-01)**; **M3-lite**: existing cards only, monthly spend, purchases, reserve, gates, RT-01/03/04/06 (incl. Iberia Aire's ambiguous cap with a sensitivity), a welcome threshold for cards already held, P-01 rules, INV-1–8, explanation contract with named baselines, rejection memory, the seven-outcome verdict, **forecast bands and manual reconciliation of actual postings (REQ-REC-FCST-01)**, replanning with a What-changed card (latest diff); in-app and .ics reminders; transparency page; export/delete; English UI with a string catalogue |
| **P0 engine only (UI in P1)** | New-card and plan-upgrade fee logic (S-02b, M-06a, T-CALC-104/119a); offer-ineligibility for new cards (S-13 new-card variant) |
| **P1** | M4 new-card comparison UI; RT-02 step thresholds (Iberia Icon €18,000 step); RT-05 promotions, multipliers (e.g. Revolut Shops) and transfer bonuses; competing multi-bonus optimisation; offer snapshot versioning; full revision history UI; email reminders; price alerts; refund-risk history; residual valuation horizons; forecast variance prompts; promoting template cards to catalogue; es-ES localisation; entry-rules notices beyond the static China notice |
| **P2** | Authorised live award data and price monitoring; more markets; link/screenshot pre-fill; more notification channels; historical insights; tax notes (only if a lawyer approves) |

---

## 4. Conflicting requirements and how they are resolved

| ID | Conflict | Sources | Resolution | Status |
|---|---|---|---|---|
| CR-01 | "Book the flight inside the app" vs Duffel live access requiring business KYC and payment approval | `[BRIEF-IDEA]` vs `[RESEARCH]` | Test-mode booking, labelled "no real ticket"; award steps cover "clear steps to book" `[BRIEF]` | Proposed |
| CR-02 | "Savings impossible to miss" vs honest €0 or negative savings | `[BRIEF]` vs `[OWNER]` honesty | Saving is always prominent, including "Cash is better by €98". Honesty wins. | Proposed |
| CR-03 | "AI-powered" vs "no LLM numbers or decisions" | `[OWNER]` | AI explains and asks; the deterministic engine decides (doc 00, section 8) | Proposed |
| CR-04 | "Production-ready on free tiers" vs Vercel Hobby non-commercial terms, Supabase free pausing after 7 days, no backups | `[OWNER]` vs `[RESEARCH]` | Acceptable for the hackathon; paid tiers before any commercial use (UNR-06) | Proposed |
| CR-05 | Owner's new-card recommendations vs CCD2 "advisory services" and intermediary rules | `[OWNER]` vs `[RESEARCH]` | P1, neutral comparison, opt-in, no "advice" wording, no commissions, lawyer review | Proposed |
| CR-06 | Owner example "Spain to China", which implicitly assumes Iberia awards | `[OWNER]` vs `[RESEARCH]` | Iberia doesn't operate its own flights to mainland China (China Southern codeshare). Visa-free ends 31/12/2026. Fixtures use generic programme awards; notice shown. | Proposed |
| CR-07 | Doc suggestion "Redis for caching and queues" vs a minimal stack | `[DOC-SUGGESTION]` | Deferred to technical planning; not a Phase 1 requirement | Deferred |
| CR-08 | Brief APIs (Amadeus, Kiwi Tequila) vs their current status | `[BRIEF]` vs `[RESEARCH]` | Amadeus Self-Service decommissioned 17 Jul 2026; Kiwi invite-only. Not used. | Resolved |
| CR-09 | Doc suggestion "with none, show buy points / transfer bonus paths" vs P-01 | `[DOC-SUGGESTION]` vs `[OWNER]` | Updated in audit to match the client guide (CG-6): buying points is never a default. It appears only as a gap-fill after a specific award is found, with gap ≤ 20% (D-25), a user-entered price, and placement after the live check (REQ-REC-BUY-01). | Proposed |
| CR-10 | Spanish UI labels from research vs the English decision | `[RESEARCH]` vs `[OWNER]` | English copy | Resolved |
| CR-11 | File numbering: Phase 1 `00_`–`03_` vs the earlier plan's `01_`–`08_` in the same folder | Plans | Rename at integration (Proposed Update 9) | Proposed |
| CR-12 | Doc suggestion mentions hidden-city tactics | `[DOC-SUGGESTION]` | Excluded: airline terms risk; never recommended | Proposed |
| CR-13 | Owner wants price and award monitoring vs no authorised sources | `[OWNER]` vs `[RESEARCH]` | P0: revisit reminders. P2: authorised monitoring. | Proposed |
| CR-14 | Earlier "Bonus-threshold rule" vs addendum sections 5A and 5B | Plans | Superseded by RT taxonomy, ΔB, gates, MV and P-01 | Resolved |
| CR-15 | S-04 result (corrected in audit) | Plan vs calculation vs audit | **Superseded.** Pre-audit doc 02 used an implicit all-on-A baseline (7-point loss, ΔB €52.00). The audit makes the baseline explicit (`A_status_quo` = {T €280, A €20}). A gives up 6 points (€0.06) and **ΔB_change = €50.14**. | Resolved |
| CR-16 | Owner's €280/€300 and $300/$320 examples use "$" | `[OWNER]` | Expressed in EUR for the Spain market; same numbers | Resolved |
| CR-17 | Iberia Aire rule: earlier "stops earning above €1,000/month" vs official terms (three category rates; €1,000 limit wording with ambiguous scope) | Pre-audit `[RESEARCH]` vs re-verified issuer page | Corrected in RF-7, RT-01, RT-04, FX-CARD-AIRE, EC-RWD-22/27 and T-CALC-020. Restrictive reading by default (D-26). | Resolved (scope UNVERIFIED) |
| CR-18 | Client guide: "Revolut credit card only with Ultra" vs Revolut's official Spain credit-card page (available to Spain residents; earn rates for Plus, Premium, Metal and Ultra) | `[CLIENT-GUIDE]` vs issuer | Issuer prevails; conflict shown on the product (EC-CARD-24) | Resolved |
| CR-19 | Avios account age: 30 days (avios.com, client guide) vs 90 days for Iberia (BA terms) | Two official sources | Stricter reading for BA ↔ Iberia (EC-CARD-23) | Open (needs re-check) |
| CR-20 | Universal 360-day trip limit vs long-term planning (12+ months) | Pre-audit spec vs `[OWNER]` | Limit removed. Availability states per leg (REQ-RES-21). | Resolved |
| CR-21 | ΔB formula included residual value while saying residual is never in the trip saving; it also double-counted lost bonuses | Pre-audit doc 00 §7.5 (internal contradiction) | Redefined as allocation-level TripValue with named baselines; residual shown separately (doc 00 §7.5) | Resolved |
| CR-22 | Break-even formula subtracted "extras" already inside cashOut | Pre-audit doc 00 §7.2 | Corrected; T-CALC-022 | Resolved |
| CR-23 | CS-02 message "Points would save €110" while the award was not bookable | Pre-audit doc 02 | Corrected to "Not bookable with your current points…"; H stays cash | Resolved |
| CR-24 | Confidence "High" allowed for demo fixtures vs no real data in the hackathon | Pre-audit doc 00 §7.10 vs REQ-RES-17 | New level "Illustrative"; High needs `VERIFIED_RESULT` | Resolved |
| CR-25 | S-02b / M-06(a) (new-card fees) marked P0, while M4 is P1 | Pre-audit priorities | P0 engine / P1 UI | Resolved |
| CR-26 | A Una Milla website names ("Iberia Icon Aire", "Iberia Zenit Gold", "Air Europa Bankinter", "Vueling UP", "Miles & More Caixabank") vs issuer product names | Website vs issuer | Canonical names + aliases (doc 00 §5.11) | Resolved |

---

## 5. Assumptions requiring validation

| ID | Assumption | Used in | Validate by |
|---|---|---|---|
| AS-01 | The community's audience is mainly in Spain | Market | Owner / community admin |
| AS-02 | An English UI is acceptable to a Spanish-speaking community for the MVP | Copy | Owner (confirmed for hackathon) |
| AS-03 | **Per-programme estimate only** (corrected; no universal limit): Iberia about 360 days, BA about 355 (SECONDARY). Other programmes → `UNKNOWN_AVAILABILITY` until sourced. | Timeline | Official programme pages |
| AS-04 | Jury accepts Duffel test prices clearly labelled as not real | Demo | Organiser |
| AS-05 | Users accept entering balances manually | Wallet | User interviews (5 min each, brief Stage 04) |
| AS-06 | Fixture arithmetic uses 30-day months | Doc 02 | Engineering convention for tests only |
| AS-07 | ≤ 6 legs is enough for the Full Trip Plan | Validation | Community feedback |
| AS-08 | ≤ 9 travellers per search | Validation | Provider limits (not verified) |
| AS-09 | A nearby-airport option without a transport cost needs a saving > €50 to rank first under Goal B | Ranking | Owner |
| AS-10 | Tolerance max(5%, €25) | Ranking, TOO_UNCERTAIN | Owner |
| AS-11 | Catalogue terms are stale after 30 days | Confidence | Owner / ops capacity |
| AS-12 | Variable spending gets a −20% conservative band | Forecast | Owner |
| AS-13 | Rewards earned by a cash ticket count only if known (verified or user-entered) | EC | — |
| AS-14 | Unknown rounding is `floor` (e.g. Iberia Cards) | RT-01 | Issuer |
| AS-15 | Undocumented posting delay = 1 statement cycle + 10 business days | RT-03 | Issuer |
| AS-16 | LSBD safety buffer = 3 days | Verdict | Owner |
| AS-17 | Pessimistic cash scenario = +15% (an assumption, not a forecast) | Verdict | Owner |
| AS-18 | Changes within 2 minutes merge into one draft | Replanning | UX testing |
| AS-19 | FX snapshot usable for ≤ 7 days if the source fails | FX | Owner |
| AS-20 | WAIT revisit cadence of 30 days | Reminders | Owner |
| AS-21 | Search rate limit of about 10/min per user/IP (aligned with Duffel's live default of 10/60 s) | Security / cost | Technical planning |
| AS-22 | Gap-fill limit 20% of the award's points (D-25) | REQ-REC-BUY-01 | Owner / community |
| AS-23 | Order-conservative forecasting when a shared cap applies and transaction order is unknown | FX-CARD-AIRE | Issuer clarification |
| AS-24 | Business cards are allocated only expenses marked business-eligible | EC-CARD-25 | Issuer terms (UNVERIFIED) |

---

## 6. Product and domain research references

Status values: VERIFIED (official page read on 26 Oct 2026 unless dated), VERIFIED-FAQ (official but non-contractual), SECONDARY, CONFLICTING, UNVERIFIED. All are subject to change.

### 6.1 Brief and community

| Fact | Source | Status | Implication |
|---|---|---|---|
| Project B brief, rules, jury, deadline Wed 28 Oct, demo Thu 29 Oct | *Becoming 10X Developers: Full Documentation*, sections 6B.1, 6B.2, 6C | Primary | Baseline (doc 00, section 3) |
| Community is Spanish-language and Spain-focused; topics include Iberia Club, Amex, Revolut, Iberia Cards, Flying Blue, Seats.aero | [aunamilladetudestino.com](https://aunamilladetudestino.com/), [Quiénes somos](https://aunamilladetudestino.com/quien-soy/), [Blog](https://aunamilladetudestino.com/blog/) | VERIFIED | Spain market; catalogue scope |
| Website card list (re-read 26 Oct 2026 audit): Iberia Icon, "Iberia Icon Aire", "Iberia Zenit Gold", Revolut Ultra, Amex Platinum, Amex Gold, "Air Europa Bankinter", "Vueling UP", "Miles & More Caixabank". Copy still says "Iberia Plus" (old programme name). | [Tarjetas de crédito](https://aunamilladetudestino.com/tarjetas-de-credito/) | VERIFIED (website content) | Catalogue scope and aliases (doc 00 §5.11) |
| Client post-consultation guide (06/09/2026): goals, method rules CG-1 to CG-8, Revolut table, Avios-move steps via BA | Supplied by the owner, 26 Oct 2026 (English summary of the client's PDF) | Client document; card claims checked against issuers | REF-01; REQ-RES-20; REQ-REC-BUY-01 |
| BA "Combine My Avios": move between BA Club, Iberia Club, AerClub, Loganair, Vueling Club "as often as you like"; details must match; accounts ≥ 30 days. Qatar: link to BA first. | [BA Combine Avios](https://www.britishairways.com/content/the-british-airways-club/avios/combine-avios), [avios.com move](https://www.avios.com/en-GB/move/transfer-avios), [avios.com Qatar](https://www.avios.com/manage-avios/move-and-combine-avios/partner/qatar/exchange) | Cited by the client guide; avios.com rules VERIFIED earlier; BA page **not re-fetched** in this pass | REQ-RES-20; CR-19 |

### 6.2 Providers

| Fact | Source | Date | Status | Implication |
|---|---|---|---|---|
| Amadeus Self-Service decommissioned 17 Jul 2026 | [PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers), [GitHub README](https://raw.githubusercontent.com/amadeus4dev/developer-guides/master/README.md) | 9 Feb 2026 | VERIFIED (trade press + official repo) | Not usable |
| Kiwi Tequila invitation-only | [Kiwi media](https://media.kiwi.com/articles-and-interviews/better-for-business-kiwi-com-takes-a-new-approach-to-partnerships/) | 30 May 2024 | VERIFIED | Not usable |
| Duffel test mode; Duffel Airways ZZ; unrealistic prices | [Test mode](https://duffel.com/docs/api/overview/test-mode) | — | VERIFIED | LIVE-TEST badge |
| Offers expire 15–30 min; `price_changed`; re-fetch before booking | [Offer schema](https://duffel.com/docs/api/v2/offers/schema), [Response handling](https://duffel.com/docs/api/overview/response-handling/order-and-booking-creation) | — | VERIFIED | REQ-RES-02 |
| Passenger age or type; under-18 age; infant needs a unique adult | [Create offer request](https://duffel.com/docs/api/v2/offer-requests/create-offer-request), [Getting started](https://duffel.com/docs/guides/getting-started-with-flights) | — | VERIFIED | REQ-RES-03 |
| `null` conditions = unknown | [Displaying conditions](https://duffel.com/docs/guides/displaying-offer-and-order-conditions) | — | VERIFIED (official guide) | REQ-RES-06 |
| Hold orders (`type: hold`) | [Create order](https://duffel.com/docs/api/v2/orders/create-order) | — | VERIFIED | ST-11 |
| Live rate limit default 10 per 60 s | [Help](https://help.duffel.com/hc/en-gb/articles/10229200096786) | 8 Sep 2026 | VERIFIED | AS-21 |
| Pricing: $3/order + 1% Managed Content; excess search fee | [Pricing](https://duffel.com/pricing) | — | VERIFIED | Cost (technical plan) |
| Payment Intents not accepting new customers; customer cards need approval | [Payment Intents](https://duffel.com/docs/api/v2/payment-intents), [Customer cards](https://duffel.com/docs/guides/paying-with-customer-cards) | — | VERIFIED | Test balance only |
| Live access needs business verification | [Getting started](https://duffel.com/guides/getting-started), [Services Agreement](https://duffel.com/services-agreement) | — | VERIFIED | CR-01 |
| Seats.aero: non-commercial API terms; 60-day public display; no Iberia/BA programmes; no booking | [Terms](https://seats.aero/terms), [Concepts](https://developers.seats.aero/reference/concepts-copy.md) | 12 Aug 2026 | VERIFIED | Award data mocked |
| AwardTool enterprise API needs approval; point.me no public API | [AwardTool](https://www.awardtool.com/enterprise-api), [point.me Gateway](https://www.point.me/insights/gateway-launch-embeds-award-travel-for-partners/) | 1 Oct 2026 | VERIFIED | P2 |
| OurAirports data public domain | [OurAirports](https://ourairports.com/data/) | 25 Oct 2026 | VERIFIED | Airport list (technical plan) |
| ECB reference rates; EUR/USD 1.1193 on 23 Oct 2026 | [ECB](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html) | 23 Oct 2026 | VERIFIED | FX-RATE-01 |

### 6.3 Loyalty programmes

| Fact | Source | Status | Implication |
|---|---|---|---|
| Avios expire after 36 months without activity; transfers between programmes don't count; Family Account up to 7 | [Iberia Club conditions](https://www.iberia.com/es/iberiaplus/condiciones/), [Avios FAQ](https://www.iberia.com/es/preguntas-frecuentes/iberia-club/Avios/) | VERIFIED | REQ-RES-09; EC-CARD-20 |
| Avios Wallet linking counts as activity | [Avios Wallet T&C](https://wallet.iberia.com/es/help/terms-and-conditions) | VERIFIED | Activity hint |
| Avios moves 1:1; account ≥ 30 days; Qatar via BA | [avios.com](https://www.avios.com/move/transfer-avios) | VERIFIED. BA T&Cs mention 90 days for Iberia (CONFLICTING) | EC-CARD-19 |
| Iberia chart (Iberia-operated only); band 8 business 70,500 / 103,500 | [iberia.com chart](https://www.iberia.com/co/iberiaplus/partners/vuelos/iberia/) | VERIFIED, subject to change | FX-AWARD-02 |
| Infant award tickets can't be booked online; tickets only for member, beneficiary or companion | [Avios FAQ](https://www.iberia.com/es/preguntas-frecuentes/iberia-club/Avios/), [Conditions](https://www.iberia.com/es/iberiaplus/condiciones/) | VERIFIED | REQ-RES-04/05 |
| Iberia Avios change and refund fees by fare; partner-award refund rules conflict | Same pages | VERIFIED / CONFLICTING | GAP-03 |
| Flying Blue: 24-month expiry; Promo Rewards; Light/Standard/Flex since 8 Sep 2026; rewards bookable for anyone, infants by phone | [Flying Blue rewards](https://www.flyingblue.com/en/spend/flights/rewards), [T&C](https://img.static-fb.com/m/210bf6c67e0bebac/original/Fbcom_Terms-and-Conditions-EN.pdf) | VERIFIED. €70 Standard fee SECONDARY | GAP-04 |
| Iberia doesn't operate its own flights to mainland China; China Southern codeshare | [Iberia news](https://www.iberia.com/es/news-updates/china-agreement/) | VERIFIED | CR-06 |
| Visa-free entry to China for Spanish passports until 31 Dec 2026 | [Exteriores](https://www.exteriores.gob.es/Consulados/shanghai/es/Comunicacion/Noticias/Paginas/Articulos/Ampliaci%C3%B3n-en-duracion-de-exencion-de-visado-chino.aspx) | VERIFIED, subject to change | REQ-RES-18 |
| Award release about 360 days (Iberia), 355 (BA) | [Head for Points](https://www.headforpoints.com/2025/12/01/how-to-book-avios-redemption-flights-iberia/) | SECONDARY | AS-03 |

### 6.4 Card terms (reward-rule evidence)

| Fact | Source | Status | Used in |
|---|---|---|---|
| Amex MR Spain earn rates; per-transaction half-up rounding; exclusions; marketplace exception; refund reversal; points lost on cancellation | [MR T&Cs](https://www.americanexpress.com/es-es/rewards/membership-rewards/terms) | VERIFIED | RT-01, EC-RWD-07/13 |
| Amex Spain MR partners: Iberia, BA, Flying Blue 1:1; Emirates suspended | [Partners](https://www.americanexpress.com/es-es/rewards/membership-rewards/travel/all?currenttravelproducttype=All) | VERIFIED | FX-RULE-01 |
| Ratio by issuing country (ES 1:1, NL 3:2…) | [Iberia Amex page](https://www.iberia.com/es/iberiaplus/partners/finanzas/american_express_membership_rewards/) | VERIFIED | T-CALC-010 |
| MR → Iberia up to 30 min, possibly up to 14 days; MR → Flying Blue about 5 working days, min 500, increment 5 | [Iberia partner](https://www.americanexpress.com/es-es/rewards/membership-rewards/partner/IBERIA-PLUS/IberiaRT-Plus/IBERT), [FB partner](https://www.americanexpress.com/es-es/rewards/membership-rewards/partner/AIR-FRANCE/Flying-Blue/AF02) | VERIFIED | T-CALC-011, 018 |
| Amex Platinum welcome: monthly ≥ €1,500 → 5,000 MR for 10 months; posts within 10 business days, up to 180; clawback; 12-month prior-holder exclusion; terms vary by landing page | [Platinum](https://www.americanexpress.com/es-es/tarjetas-de-cargo/tarjeta-platinum/), [Programa de puntos](https://www.americanexpress.com/es/tarjetas/beneficios/programa-de-puntos/) | VERIFIED / CONFLICTING | RT-03, EC-RWD-09/20 |
| Amex Platinum fee €65/month; Gold €16/month; FX 2.90% (credit cards) | Platinum / Gold pages, [Amex fees](https://www.americanexpress.com/es/empresa/tablon-de-anuncios/american-express-europe/datos-generales/comisiones-habituales/tarjetas-de-credito/) | VERIFIED (charge-card FX SECONDARY) | RT-06, FX-CARD-T |
| **Iberia Aire (corrected in audit):** 1 Avios/€1 at Iberia & IAG; 1/€2 at Iberia Club partners; 1/€3 elsewhere; "1 Avios cada 3 € de gasto hasta un máximo de 1.000 € mensuales. A partir de este importe el resto de operaciones no acumularán Avios" (scope ambiguous); €5/month; welcome 9,500 at month 6 + 6,000 at month 18. The 0% FX up to €500/month appears only in the 2025 contract PDF, not on the current product page (UNVERIFIED current). | [Aire terms](https://www.iberiacards.es/wp/iberia-aire/), [Aire product](https://www.iberiacards.es/tarjetas-personales/iberia-aire/) | VERIFIED 26 Oct 2026 (cap scope AMBIGUOUS) | RT-01, RT-04, FX-CARD-AIRE, T-CALC-020 |
| **Iberia Zenit:** 3/€1 on Iberia/IAG tickets (up to 10 with Club Oro); 1/€1 elsewhere; mobile wallets 1/€1 up to €5,000/month, then 0; 0% FX; Club Oro status (renewal ≥ €15,000/year incl. ≥ €750 on iberia.com) | [Zenit](https://www.iberiacards.es/wp/iberia-zenit/) | VERIFIED; fee not on page | Template (D-27) |
| **Revolut Spain:** credit card for Spain residents, subject to approval; credit rates Plus 1.5/€10, Premium 1.5/€4, Metal 1/€1, Ultra 1.5/€1. Debit rates (FAQ) Standard/Plus 1/€10, Premium 1/€4, Metal 1/€2, Ultra 1/€1. Exclusions include utilities, rent, taxes and financial services; 3-year validity. | [Credit cards ES](https://www.revolut.com/es-ES/credit-cards/), [Earn FAQ ES](https://help.revolut.com/es-ES/help/revpoints/what-is-revpoints/question-how-to-earn-revpoints/) | VERIFIED / VERIFIED-FAQ; CONFLICTING with the client guide ("credit only on Ultra") | FX-CARD-REV; CR-18 |
| **Amex Business Platinum (Spain):** €65/month (€780/year max); 1 MR/€1; "1 punto Membership Rewards equivale a 1 Iberia Avios o 1 AirEuropa Millas suma"; points without limit or expiry; for SMEs and the self-employed | [Business Platinum](https://www.americanexpress.com/es-es/negocios/tarjetas/tarjeta-business-platinum/) | VERIFIED; welcome offer not found | Template; REF-01 |
| **Vueling Visa / Vueling UP! Visa (CaixaBank):** 1 Avios/€2 on everyday purchases; UP! welcome 9,000 Avios for ≥ €600 in 3 months; first year free, then €90 (UP!) / €45; Spain residents only; everyday Avios post after the monthly statement | [CaixaBank Vueling](https://www.caixabank.es/particular/tarjetas/visa-vueling.html), [Vueling T&C 2026 PDF](https://static.vueling.com/corporativeCMS/media/ny0lb3mj/tc_vueling_visa_2026-es.pdf) | OFFICIAL-EXTRACT (search extract; booking-earn rates differ between sources) | Template (D-27); GAP-18 |
| Iberia Icon: 1 per €10 above €18,000 "anuales"; €9.90/month; welcome at statement 7 | [Icon](https://www.iberiacards.es/wp/iberia-icon/), [Icon promo PDF](https://www.iberiacards.com/mgm-icon/resources/fonts/202603_v1_Condiciones_legales_y_Privacidad_MGMICON.pdf) | VERIFIED (some conflicts) | RT-02/03, EC-RWD-03 |
| Iberia Cards exclusions; refunds annulled or offset; unregistered Avios lost after 6 months | [Excluded sectors](https://www.iberiacards.es/tablon-anuncios/sectores-actividad-excluidos/), [Contract PDF](https://www.iberiacards.es/documentacion/ccgg-tarjetas-personales-icon-icon-plus.pdf) | VERIFIED | EC-RWD-12 |
| Santander Iberia plan welcome: €700 in one of the first 3 periods (not summed); Avios taxed as capital income | [Welcome PDF](https://assets.santandermedia.com/adobe/assets/urn:aaid:aem:247674c0-f15a-43be-8b41-5f828a1c550f/original/as/ES_bbll-bienvenida-plan-iberia-uso-tarjeta_sorteos-promocionesWeb.pdf), [Plan page](https://www.bancosantander.es/particulares/tarjetas/credito/plan-iberia-plus/) | VERIFIED | RT-03 |
| Bankinter SUMA: 1,390 miles per period cap | [Bankinter](https://www.bankinterconsumerfinance.com/financiacion/tarjetas/tarjeta-credito-air-europa) | VERIFIED | RT-04 |
| CaixaBank M&M fee waived above €10,000 **or if purchases are financed** | [CaixaBank](https://www.caixabank.es/particular/tarjetas/visa-miles-and-more.html) | VERIFIED | EC-RWD-16 |
| Revolut RevPoints: rates (FAQ, non-contractual); exclusions; 3-year validity; negative balance allowed; +20% Avios promo 17–30 Aug 2026, 19% withholding | [Earn FAQ](https://help.revolut.com/en-ES/help/revpoints/what-is-revpoints/question-how-to-earn-revpoints/), [RevPoints Terms](https://www.revolut.com/en-ES/legal/RevPoints/), [Promo](https://www.revolut.com/en-ES/legal/revpoints-avios-promotion/) | VERIFIED / VERIFIED-FAQ | RT-05, EC-RWD-06/17 |
| Spain bans payment surcharges for "cualesquiera instrumentos de pago" | [RDL 19/2018 art. 35.3](https://www.boe.es/eli/es/rdl/2018/11/23/19/con) | VERIFIED text. Whether it covers Amex is our reading. | S-05 surcharge only for non-EU merchants |
| EU interchange caps 0.2%/0.3%; three-party exemption | [Reg 2015/751](https://eur-lex.europa.eu/eli/reg/2015/751/oj/eng) | VERIFIED | Market context |

### 6.5 UX and competitors

| Fact | Source | Status | Implication |
|---|---|---|---|
| Progressive disclosure; > 2 levels hard to use | [NN/g](https://www.nngroup.com/articles/progressive-disclosure/) | VERIFIED (2006) | Q-PREF "More options" |
| Onboarding tutorials skipped; prefer contextual help | [NN/g](https://www.nngroup.com/articles/onboarding-tutorials/) | VERIFIED (2023) | Value-first |
| Recommendation explanations ("Because you…") | [NN/g](https://www.nngroup.com/articles/recommendation-guidelines/) | VERIFIED (2018) | Explanation contract |
| Question pages; "I do not know"; optional labels | [GOV.UK](https://design-system.service.gov.uk/patterns/question-pages/), [Structuring forms](https://www.gov.uk/service-manual/design/form-structure) | VERIFIED | Questionnaire |
| Field count; extra costs cause about 39% of abandonment | [Baymard](https://baymard.com/research-articles/checkout-flow-average-form-fields), [Baymard stats](https://baymard.com/lists/cart-abandonment-rate) | OFFICIAL-EXTRACT | All-in prices; short forms |
| Google Flights insights low/typical/high; "no guarantee"; separate-ticket warnings; bag filter | [GF 7664728](https://support.google.com/travel/answer/7664728?hl=en), [GF 2475306](https://support.google.com/travel/answer/2475306?hl=en), [GF 9074247](https://support.google.com/travel/answer/9074247?hl=en-GB) | VERIFIED | Forecast labelling; REQ-RES-10 |
| KAYAK ±3 days flex; forecast with confidence | [KAYAK help](https://www.kayak.com/c/help/pricing/) | VERIFIED | Q-FLEX caps |
| Skyscanner whole month / cheapest month; self-transfer label | [Skyscanner](https://help.skyscanner.net/hc/en-gb/articles/201150942-How-do-I-find-the-best-prices), [Self-transfer](https://help.skyscanner.net/hc/en-us/articles/206028971-What-does-it-mean-when-I-see-self-transfer-on-Skyscanner) | VERIFIED | Q-FLEX; REQ-RES-10 |
| Seats.aero ±1/3/7/14 day ranges; multi-airport | [Docs](https://docs.seats.aero/article/89-how-to-search-using-date-ranges-in-seats-aero) | OFFICIAL-EXTRACT | Award flex caps |
| point.me value = (cash − taxes) ÷ points; Trustpilot complaints (phantom availability, fees after transfer) | [point.me](https://www.point.me/insights/how-we-evaluate-the-value-of-an-award-fare/), [Trustpilot](https://www.trustpilot.com/review/point.me) | VERIFIED / SECONDARY | Live-check guard; all-in award costs |
| Valuation methods differ (TPG trimmed average; NerdWallet median); retail-price fallacy critique | [TPG](https://thepointsguy.com/loyalty-programs/points-miles-valuations-methodology/), [NerdWallet](https://www.nerdwallet.com/travel/learn/airline-miles-and-hotel-points-valuations), [OMAAT](https://onemileatatime.com/value-redeemed-miles/) | VERIFIED / SECONDARY | D-02; N definition |
| Hopper FTC settlement (hidden fees, Price Freeze) | [FTC](https://www.ftc.gov/news-events/news/press-releases/2026/07/travel-app-hopper-pay-35-million-settle-ftc-allegations-it-charged-fees-without-consent-deceived) | VERIFIED (Jul 2026) | No pre-selected extras; no guarantees |
| AwardWallet paywalled expiry alerts (1 Oct 2026) | [Miles to Memories](https://milestomemories.com/awardwallet-free-accounts-losing-points-expiration-alerts/) | SECONDARY | Free expiry warnings as a trust feature |
| Closest analogue: Reward Flight Finder (GBP, BA/Iberia only) | [Reward Flight Finder](https://rewardflightfinder.com/avios-calculator) | VERIFIED | Differentiation |

---

## 7. Compliance and evidence (research, not legal advice)

We do **not** claim legal compliance. Items are CONFIRMED (legal requirement, official text read), UNRESOLVED (applicability unclear, needs a lawyer) or SAFEGUARD (recommended).

### 7.1 CONFIRMED requirements and how the spec meets them

| Requirement | Source | Spec item |
|---|---|---|
| Final all-in price shown at all times, from the first display, for each flight; extras opt-in | [Reg 1008/2008 Art. 23 via CJEU C-573/13](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A62013CJ0573), [C-28/19](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:62019CJ0028), [C-112/11](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:62011CJ0112) | REQ-RES-01 |
| Final price incl. management fees; link to main ranking parameters from results | [TRLGDCU arts. 20.1(c), 20.3, 60](https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555) | REQ-RES-01, REQ-RES-11 |
| Savings claims not misleading; trader bears burden of proof; "free" banned where costs apply; hidden paid ranking banned | [LCD arts. 5, 7, 22.5, 26](https://www.boe.es/buscar/act.php?id=BOE-A-1991-628), [UCPD Guidance 2021/C 526/01](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=oj%3AJOC_2021_526_R_0001) | REQ-RES-12, 13; INV-8 |
| Comparison tools disclose business model | [Commission key principles](https://commission.europa.eu/document/download/4daaec50-817c-4506-8b47-621a5fb01df2_en) | REQ-RES-11 (business-model note) |
| Layered privacy notice incl. profiling | [LOPDGDD art. 11](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673) | Settings and privacy screen |
| Analytics cookies need consent; reject at the same level as accept | [LSSI art. 22.2](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758), [AEPD cookie guide](https://www.aepd.es/guias/guia-cookies.pdf) | REQ-RES-15, D-14 |
| DPIA likely needed (≥ 2 criteria: habit profiling + financial situation) | [AEPD DPIA list](https://www.aepd.es/documento/listas-dpia-es-35-4.pdf) | Before commercial launch (UNR-05) |
| Data minimisation; erasure; portability; privacy by default | GDPR arts. 5, 17, 20, 25 ([EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj)); [AEPD](https://www.aepd.es/derechos-y-deberes/cumple-tus-deberes/medidas-de-cumplimiento/proteccion-de-datos-por-defecto) | REQ-OWN-11, REQ-NFR-05 |
| AI interaction / generated-text transparency from 2 Aug 2026 | [AI Act art. 50](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50) | REQ-RES-14 |
| Creditworthiness scoring is high-risk (obligations delayed to 2 Dec 2027) | [Annex III 5(b)](https://ai-act-service-desk.ec.europa.eu/en/ai-act/annex-3), [Reg 2026/1744](https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng) | No approval-odds features (REQ-RES-16) |
| Credit advertising: "borrowing money costs money" warning (CCD2 art. 8, from 20 Nov 2026); representative example with APR (TAE) (Ley 16/2011 art. 9) | [CCD2](https://eur-lex.europa.eu/eli/dir/2023/2225/oj/eng), [Ley 16/2011](https://www.boe.es/buscar/act.php?id=BOE-A-2011-10970) | REQ-RES-16 |
| Commercial communications identifiable; affiliate links labelled | [LSSI art. 20](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758), LCD art. 26 | No affiliate links (D-15) |
| Account-information services need Banco de España registration | [RDL 19/2018 art. 15](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16036) | No bank linking (REQ-OWN-11) |
| Micro-enterprises exempt from the accessibility law for services | [Ley 11/2023 art. 2.3](https://www.boe.es/buscar/act.php?id=BOE-A-2023-11022) | WCAG 2.1 AA target anyway (REQ-NFR-02) |
| Price-reduction "prior price" rule doesn't apply to services | [Commission guidance](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ%3AC%3A2021%3A526%3AFULL), [Ley 7/1996 art. 20](https://www.boe.es/buscar/act.php?id=BOE-A-1996-1072) | Not applicable; UCPD still applies to savings claims |

### 7.2 UNRESOLVED (needs a qualified Spanish lawyer before commercial launch)

| ID | Question | Why |
|---|---|---|
| UNR-01 | Do personalised new-card suggestions (M4) count as CCD2 "advisory services" (art. 3(17), 16(6))? | Spain's transposition is a draft (Council of Ministers 7 Jan 2026; CNMC report 1 Oct 2026) |
| UNR-02 | Would any referral commission make the app a credit intermediary needing registration and insurance (Ley 16/2011 art. 2.3; Ley 2/2009; RD 106/2011)? | No "merely introducing" carve-out in current Spanish law |
| UNR-03 | Who legally sells the ticket under Duffel's model: travel-agency declaration, payment-services exposure, consumer-law liability? | Regional travel-agency rules (e.g. Madrid) |
| UNR-04 | Does Reg 1008/2008 art. 23 bind a comparison app and award prices? | Applicability to award pricing unclear |
| UNR-05 | DPIA sign-off; international transfers if a US LLM is used (EU-US Data Privacy Framework upheld 3 Sep 2025; appeal C-703/25 P pending) | Profiling and financial data |
| UNR-06 | Commercial use on free tiers (Vercel Hobby non-commercial terms) | Hosting terms |
| UNR-07 | AI Act role (provider vs deployer) if LLM explanations are used | Art. 50(2) marking duty |
| UNR-08 | Tax wording on Avios from banks (no binding ruling from the Spanish tax authority's rulings unit, DGT, found) | Avoid tax statements beyond "may have tax implications" |
| UNR-09 (audit) | Must consumer-facing price, legal and contract information be available in Spanish for Spanish consumers? | P0 is English (D-04); commercial-launch question, not a hackathon blocker |
| UNR-10 (audit) | Business cards (e.g. Amex Business Platinum): do consumer-credit protections and recommendation rules apply differently, and may personal spending be allocated to them? | REF-01-type users; EC-CARD-25 |

### 7.3 SAFEGUARDS adopted in the spec

- No affiliate links or commissions (D-15).
- M4 is neutral, opt-in, P1, and avoids the words "advice" and "approval odds".
- Paying the statement in full is always assumed, and G2/G3 gate all card optimisation.
- Credit warning and APR (TAE) wherever a card's cost appears.
- A "How we calculate and rank" page and a business-model note.
- A dated quote log for every displayed saving.
- No CO₂ or environmental claims.
- AI text is labelled and the validator is enforced.
- No analytics, or cookieless analytics, in P0.
- Export and delete; minimal data; no card numbers or bank credentials.
- Accessibility notes are never stored in the profile.
- No tax statements.

---

## 8. Questions to answer before the architecture is finalised

| ID | Question | Owner / source | Recommended answer |
|---|---|---|---|
| QA-01 | Approve D-01 to D-24 (section 2)? | Owner | As recommended |
| QA-02 | Which catalogue cards and programmes to seed for P0? | Owner | Amex Spain Gold/Platinum (MR), Iberia Aire, Iberia Icon, Revolut (Premium/Metal), Santander Iberia plan; programmes Iberia Club, BA Club, Vueling, Flying Blue, Air Europa SUMA, Qatar (balances and expiry only) |
| QA-03 | Which demo routes for the 3-minute demo? | Owner | MAD→PEK (Quick Flight, CS-01/CS-04), MAD→SCL business (CS-03), MAD→PEK / PEK→PVG / PVG→MAD (CS-05), 6-month plan (section 3.2 of doc 02) |
| QA-04 | Accounts to create: Duffel (test token), Supabase (free project), hosting, optional LLM key, optional SMTP | Owner | Duffel + Supabase + hosting now; LLM optional |
| QA-05 | Is M3-lite in P0 acceptable given the Wed 28 Oct deadline? | Owner | Yes, with existing cards only and the scope in section 3 |
| QA-06 | Default valuation (D-02): reference €0.010 or break-even only? | Owner | Reference €0.010, labelled, editable |
| QA-07 | Verify Supabase Auth default email limits (GAP-10) | Technical planning | Verify; custom SMTP if needed |
| QA-08 | Repo layout (existing empty `frontend/` and `backend/` folders) | Owner | Decide in technical planning |
| QA-09 | Should the community admin review copy and catalogue? | Owner | Yes, if available (AS-01, AS-02) |
| QA-10 | Confirm the Phase 1 → technical-plan integration approach (section 9) | Owner | Approve the 30 updates, then integrate |
| QA-11 (audit) | Does the client (A Una Milla / Eriz) accept an English-only P0? | Owner → client | Ask; P0 is English either way; es-ES in P1 |
| QA-12 (audit) | Ask Iberia Cards whether IAG and partner spend count toward Aire's €1,000 monthly limit, and whether the €500/month 0% FX allowance still applies | Owner / community admin | Keep the restrictive reading until answered |
| QA-13 (audit) | May REF-01 (the client's consultation) appear in the demo? | Owner → client | Only with permission, anonymised and labelled illustrative (D-28) |

---

## 9. Proposed Updates to Existing Project B Plan

**Affected file:** `C:\Users\vkapspc -15\.cursor\plans\project_b_planning_package_32a6e260.plan.md`.

These updates are **recorded only, not applied.** After owner approval they will be integrated into the existing plan. Useful research and decisions will be kept, and a dated change note will be added.

| # | Affected section | Reason | Recommended change |
|---|---|---|---|
| 1 | §6 Savings and financial model | The owner separated Goal A and Goal B | Add the objective selector. Ranking order is hard constraints, then objective, then soft preferences within tolerance. Both numbers are always shown. |
| 2 | §6 (book now vs wait) | Only a partial outcome set exists | Replace it with the 7 outcomes, their precedence, revisit dates and invalidating events (doc 02 §3.1). |
| 3 | §7 User journeys | The value-first order is evidence-based (NN/g, GOV.UK, Baymard) | Replace the onboarding order with the guest result first, then modes M1–M4. Spending questions appear only in M3. |
| 4 | §5 Domain model | New required data | For later DDL work, add: passenger ages and infant–adult links; three-state fare conditions; balance as exact, range or unknown; card-offer dismissals scoped by trip or globally; planning mode and consent flags; guest-trip migration; award traveller relationship. |
| 5 | §9 Security, privacy, cost | Research found these requirements | Add the Reg 1008/2008 art. 23 all-in rule, GDPR art. 9 handling of accessibility notes, and the "statement paid in full" gate question. |
| 6 | §7 (booking steps) | Programme rules | Route infant award bookings to phone. Add the Iberia beneficiary/companion rule. |
| 7 | §2 Research facts | New findings | Add Flying Blue Light/Standard/Flex, and the Iberia partner-award refund conflict. |
| 8 | §11 Scope | Deadline realism | Confirm M3-lite in P0, limited to existing cards and monthly spend. |
| 9 | §13 Files to create | Numbering clash with Phase 1 `00_`–`03_` | Renumber the technical package (e.g. `10_`–`17_`) or move it to `docs/project-b/technical/`. |
| 10 | Copy | English UI chosen | All product copy in English. Spanish labels from research are not used. |
| 11 | §6 | The card addendum | Replace the single bonus rule with: ΔB against the best feasible alternative; bonus split into for-trip and residual; maximum posting delay for deadlines; gates G1–G8; INV-1–7. |
| 12 | §5 | Reward-rule data needs | Add, for later DDL work: a reward-rule record using the RT-01–06 fields (window anchor, cap period, rounding, posting delay, reversal, snapshot hash, source type); an allocation ledger with negative refund entries; points committed per trip; a recommendation-rejection record with scope; an explanation object stored on each plan version. |
| 13 | §2 | Card T&C evidence | Add: Aire hard stop at €1,000/month; Icon step to 1 per €10 above €18,000/year; Amex bonus posting up to 180 days and clawback; MR loss on cancellation; Revolut negative balances; RDL 19/2018 art. 35.3. Correct the Amex Platinum offer entry to CONFLICTING (varies by landing page; one Iberia-page offer expired 30 Apr 2026). |
| 14 | §9 | Compliance research (section 7 above) | Add the CONFIRMED and UNRESOLVED items. Add a DPIA and AI Act art. 50 labelling to the launch checklist. Make "no affiliate links" a firm P0 rule. Add CCD2 advisory services to the lawyer-blocker list. |
| 15 | §11 | Scope split | Adopt the P0/P1/P2 split in section 3 above. New-card comparison moves explicitly to P1. |
| 16 | §10 Testing | New tests | Add T-CALC-101–113 and the EC-RWD and EC-ALLOC groups. |
| 17 | §3 Key decisions and §6 | Final addendum | Add P-01 as a locked decision. Replace any "maximise points" wording with marginal usable value, the goal-met rule, minimal overshoot and INV-8. Cap the bonus value for the trip at the remaining usable need. |
| 18 | §5 | P-01 data needs | Add, for later DDL work: the trip's points need plus buffer; a usable vs surplus split in projections; `v_residual` with a horizon; payment-preference constraints; a refund-risk flag per expense. |
| 19 | §10 | New tests | Add T-CALC-114–119, T-ALLOC-116, T-REG-120 (property test) and T-FLOW-121. |
| 20 (audit) | §2 Research facts | Iberia Aire re-verified | Replace "Aire stops earning above €1,000/month" with the three category rates plus the ambiguous-scope cap (CR-17). Treat the FX allowance as unverified-current. |
| 21 (audit) | §2 and §5 | Catalogue scope | Adopt doc 00 §5.11: canonical names, website aliases, catalogue/template/custom status (D-27). Add Iberia Zenit, Amex Business Platinum, Vueling Visa / UP!, Revolut debit and credit by plan. |
| 22 (audit) | §6 Savings model | ΔB contradiction and double-counting | Use allocation-level TripValue with named baselines (`A_status_quo`, `A_without`); residual kept separate; no separate lost-bonus term. |
| 23 (audit) | §6 | Break-even formula | `v* = (EC_cash(C) − cashOut(A)) / points(A)`, with no separate extras term. |
| 24 (audit) | §6 / §7 | Horizon limit | Remove any universal 360-day limit; add the availability states (REQ-RES-21) and their verdict restrictions. |
| 25 (audit) | §6 | Need buffer | Apply the buffer to forecasts only; use the exact need against a live-verified price. |
| 26 (audit) | §6 / §5 | Forecast granularity | Add REQ-REC-FCST-01. For later DDL work: per-card, per-month "actual posted points" records and an estimate band. |
| 27 (audit) | §4 / §9 | Data provenance | Add REQ-RES-19: "Example saving (illustrative data)", the Illustrative confidence level, pairing labels, and a demo claim check (T-DEMO-005). |
| 28 (audit) | §7 Booking steps | Avios-move preconditions and gap-fill | Add REQ-RES-20 (BA bridge, Qatar link, matching details, account age) and REQ-REC-BUY-01 (gap-fill rule) to the award steps. |
| 29 (audit) | §1 / §7 Localisation | Language decision evidence | English P0 with a string catalogue and es-ES in P1; record client confirmation as open (QA-11, UNR-09). |
| 30 (audit) | §10 Testing | New and corrected tests | Add T-CALC-020–026, T-FUN-031–034, T-REG-017, T-TIME-012, T-DEMO-005; corrected T-ALLOC-102 (€50.14), T-CALC-005, T-VAL-003. |

---

## 10. Phase 1 final review gate

### 10.0 Audit re-check of the original gate (26 Oct 2026)

The original gate below (10.1 and 10.2) marked every check ✓. In the audit I re-checked each claim independently against the **pre-audit** documents (the backup in `_backup/2026-10-26_pre-audit/`). Any check with a contradiction between a rule, a formula and a test in another document is marked FAIL. The last column is the status **after** this correction pass.

| # | Check | Pre-audit result | Evidence (pre-audit) | After correction | Evidence (now) |
|---|---|---|---|---|---|
| G-01 | Journey from first visit to booking outcome | PASS | Doc 01 §1, F01–F16 | PASS | Unchanged + REF-01 walk-through |
| G-02 | Essential vs optional questions | PASS | Doc 00 §5 | PASS | + Q-SPEND-02b |
| G-03 | Users can skip or refuse disclosure | PASS | R1–R8 | PASS | Unchanged |
| G-04 | Useful without cards or points | PASS | REQ-OWN-09, CS-01 | PASS | Unchanged |
| G-05 | Date and route flexibility precisely defined | **FAIL** | Q-TRIP-04 imposed an unsupported universal 360-day limit, contradicting UG-3/REQ-OWN-01 long-term planning | PASS | Doc 00 §5.2a availability states; REQ-RES-21; T-VAL-003, T-TIME-012 |
| G-06 | Existing cards before optional new cards; priorities consistent | **FAIL** | S-02b and M-06(a) (new-card fees) were P0 while M4 was P1 | PASS | P0 engine / P1 UI split (CR-25; doc 03 §3) |
| G-07 | Monthly spending not double-counted | PASS (spending); see G-13 for bonuses | INV-1, INV-7 | PASS | Allocation-level valuation removes the lost-bonus double count |
| G-08 | Thresholds can't justify unnecessary spending | PASS | G1, S-03 | PASS | Unchanged |
| G-09 | Book now vs wait explicitly defined | PASS, but V9 depended on the 360-day assumption | Doc 02 §3 | PASS | Availability-state rule; V9 revised; V10 added |
| G-10 | Future estimates never presented as certain | **FAIL** | Confidence "High" was allowed with demo fixtures; the hero said "Save €78" on illustrative data | PASS | REQ-RES-19; Illustrative confidence; T-FUN-031, T-DEMO-005 |
| G-11 | Major changes trigger replanning | PASS | R-EV-01–14 | PASS | + actual postings in R-EV-04 |
| G-12 | Alternative paths and failure handling | PASS | F01–F16 | PASS | + F15 precondition branches |
| G-13 | Financial calculations explicit and testable | **FAIL** | ΔB added `bonusValueResidual` while saying residual is never in the trip saving; per-expense summing contradicted per-period rounding (S-04's 7-point loss and €52.00 can't both follow from the formula); break-even subtracted extras twice; CS-02 said "Points would save €110" for an unbookable award | PASS | Doc 00 §7.2 and §7.5 rewritten; S-04 = €50.14 with a named baseline; T-CALC-022, 023, 025 |
| G-14 | Edge cases connect to acceptance criteria and tests | PASS (ID existence) | Cross-check script | PASS | Script re-run after the audit (section 10.3) |
| G-15 | Sources, assumptions and requirements separated | **FAIL** | Iberia Aire was presented as a VERIFIED "hard stop" (RF-7, RT-02, FX-CARD-C), but the official wording is ambiguous in scope and omits two category rates | PASS (with UNRESOLVED facts labelled) | CR-17; EC-RWD-27; GAP-15 to GAP-21 |
| G-16 | P0 achievable for the hackathon | UNRESOLVED | Depended on approval timing | **UNRESOLVED** | The audit added small P0 items (labels, states, templates, gap-fill calculation, forecast bands). It is still feasible only if D-22 and the §2A decisions are approved tonight. |
| G-17 | No implementation started | PASS | Markdown only | PASS | Only the four documents were edited, plus backups and the audit report |
| A-01 | RT-01 to RT-06 fully specified | **FAIL** | Aire was misfiled as RT-02 with no category rates; there was no `cap_scope` field | PASS | Doc 00 §7.4 |
| A-02 | S-cases have expected numbers | **FAIL** | S-04's baseline was implicit and inconsistent with the formula; S-09's residual treatment was ambiguous | PASS | Doc 02 §4.2 (corrected rows) |
| A-03 | 13 required tests have requirement, edge-case and test IDs | PASS | Doc 00 §9.4 | PASS | Unchanged IDs |
| A-04 | Explanation contract and rejection memory | PASS | Doc 00 §7.8–7.9 | PASS | + named baseline in explanations (T-CALC-025) |
| A-05 | Card-to-trip dependency chain | PASS | Doc 01 §7 | PASS | Unchanged |
| A-06 | Compliance split CONFIRMED / UNRESOLVED / SAFEGUARD | PASS | Section 7 | PASS | + UNR-09, UNR-10 |
| A-07 | P-01 everywhere | PASS | Doc 00 §1.1 | PASS | Unchanged |
| A-08 | M-cases numbers and traceability | **FAIL** | M-06(a) charged a fee to a card treated like a held card, contradicting the §7.5 rule (a committed fee counts as 0) | PASS | M-06 scope note; REQ-REC-MARG-06 priority |
| A-09 | Nothing optimises spend volume or gross points | PASS | INV-8 | PASS | Residual excluded from ΔB |
| A-10 | Cross-references consistent across the 4 docs | **FAIL** | IDs existed, but doc 00's ΔB formula contradicted doc 02's S-04 and S-09 calculations | PASS | Section 10.3 |
| N-01 (audit) | Catalogue verified against the A Una Milla website and issuers | — | — | PASS, with UNRESOLVED terms listed | Doc 00 §5.11; GAP-15 to GAP-19 |
| N-02 (audit) | Language decision recorded with evidence | — | — | PASS | D-04, QA-11, UNR-09 |
| N-03 (audit) | Calculation correctness kept separate from provenance | — | — | PASS | Doc 00 §7.12 |
| N-04 (audit) | Forecast granularity labelled; actuals replace estimates | — | — | PASS | Doc 00 §7.13; T-CALC-021, T-REG-017 |
| N-05 (audit) | MVP decisions separated from launch blockers | — | — | PASS | Sections 2A and 2B |
| N-06 (audit) | Consultation example included without generalising | — | — | PASS | P-G persona; REF-01 (doc 02 §4.4); D-28 |

The original pre-audit tables are kept below for history.

### 10.1 Prompt section 18 gate (original, pre-audit; superseded by 10.0)

| Check | Result | Evidence |
|---|---|---|
| Journey defined from first visit to booking outcome | ✓ | Doc 01 §1, F01–F16 |
| Essential vs optional questions distinguished | ✓ | Doc 00 §5 |
| Users can skip or refuse card and spending disclosure | ✓ | R1–R8 (doc 01 §4) |
| Useful without cards or points | ✓ | REQ-OWN-09, CS-01, T-FLOW-001/006 |
| Date and route flexibility have precise behaviour | ✓ | Q-FLEX (doc 00 §5.3), F08 |
| Existing cards before optional new cards | ✓ | M3 vs M4; G5; D-06 |
| Monthly spending not double-counted | ✓ | INV-1, INV-7; T-ALLOC-001/007 |
| Bonus thresholds can't justify unnecessary spending | ✓ | G1, P-01, S-03, T-CALC-103 |
| Book now vs wait explicitly defined | ✓ | Doc 00 §7.7; doc 02 §3 |
| Future estimates never presented as certain | ✓ | REQ-OWN-06; ESTIMATE badge; T-FUN-022 |
| Major changes trigger understandable replanning | ✓ | R-EV-01–14; What-changed card |
| Every major flow has alternative paths and failure handling | ✓ | F01–F16 tables; doc 01 §2.3 |
| Financial calculations have explicit inputs and testable outcomes | ✓ | Doc 02 §3–4 |
| Edge cases connect to acceptance criteria and tests | ✓ | Doc 02 §1, §8 |
| Sources, assumptions and requirements separated | ✓ | Tags; §5, §6 |
| P0 achievable for the hackathon | ✓ with conditions | Section 3; depends on D-22 approval timing |
| No implementation started | ✓ | Only these 4 Markdown files were created; no code, packages, config or Git changes |

### 10.2 Addendum gates (original, pre-audit; superseded by 10.0)

| Check | Result | Evidence |
|---|---|---|
| RT-01–06 fully specified | ✓ | Doc 00 §7.4 |
| S-01–S-13 (plus S-02b, S-02c) have expected numbers | ✓ | Doc 02 §4.2 |
| The 13 required tests have requirement, edge-case and test IDs | ✓ | Doc 00 §9.4; doc 02 §6 |
| Explanation contract and rejection memory | ✓ | Doc 00 §7.8–7.9; doc 01 §8 |
| Card-to-trip dependency chain | ✓ | Doc 01 §7 |
| Compliance split into CONFIRMED, UNRESOLVED and SAFEGUARD | ✓ | Section 7 |
| P-01 everywhere (REQ-OWN-000; REQ-REC-*; flows; decisions) | ✓ | Doc 00 §1.1, §9; doc 01 header and §8; D-00 |
| M-01–M-06 have expected numbers; T-CALC-114–119, T-ALLOC-116, T-REG-120, T-FLOW-121 traceable | ✓ | Doc 02 §4.3, §6, §8 |
| Nothing optimises spend volume, gross points or bonuses for their own sake | ✓ | INV-8; T-REG-120 |
| IDs cross-reference consistently across the 4 docs | ✓ | Checked at gate (see the gate note in section 10.3) |

### 10.3 Gate note

**Original note (pre-audit):** every EC-*, T-*, REQ-* and fixture ID cited in docs 00, 01 and 03 is defined in docs 00 or 02.

**Audit note:** ID existence alone did not catch the semantic contradictions recorded in 10.0 (G-13, A-10). After the correction pass, the ID cross-check script was re-run, and the corrected calculations were re-derived by hand and recorded in doc 02. The results are in the audit report. **Phase 1 stops here.** Technical architecture, DDL, the provider implementation plan and the task breakdown will start only after the owner approves these documents and the proposed updates in section 9.
