# Project B: A Una Milla. 02: Edge Cases and Acceptance Tests

| Field | Value |
|---|---|
| Phase | Phase 1: Discovery. These are **planned** tests, not test code. |
| Status | Draft for owner review, 26 Oct 2026. **Revised by the audit and correction pass** (see [DISCOVERY_AUDIT_REPORT_2026-10-26.md](DISCOVERY_AUDIT_REPORT_2026-10-26.md)). Existing IDs are kept; changed expected values are marked "(corrected)". |
| Depends on | [00 Requirements](00_PRODUCT_DISCOVERY_AND_REQUIREMENTS.md) · [01 Flows](01_END_TO_END_USER_FLOWS.md) · [03 Decisions](03_PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md) |

## 0. Conventions

- **Fixture data is ILLUSTRATIVE.** Every fare, award price, balance, card term and expense in sections 3–5 is illustrative unless it is marked VERIFIED, with its source given in doc 03 section 6. VERIFIED terms (rule mechanisms such as hard-stop caps) are reused, but the amounts in each fixture are illustrative.
- **Currency.** All money is in EUR. Amounts are written as €x.xx, and calculations use integer cents (doc 00 §7.1). Points are valued per point (for example €0.010 = 1.0 euro cent).
- **Edge-case IDs** are `EC-<domain>-NN`. The domains are:

  | Domain | Covers |
  |---|---|
  | ONB | Onboarding |
  | TRIP | Trip requirements |
  | CARD | Cards and rewards |
  | SPD | Spending |
  | OPT | Booking optimisation |
  | TECH | Technical and data |
  | RWD | Reward-rule mechanics |
  | ALLOC | Allocation integrity |
  | MARG | Marginal value (P-01) |

- **Test IDs** are `T-<type>-NNN`. Numbers 101–121 are the addendum scenarios and are unique across all test types.
- **Recalculation rule** in the edge-case tables uses these values:
  - **None**: nothing is recomputed.
  - **Local**: only the affected option.
  - **Trip**: all options for the trip.
  - **Plan**: allocation, forecast and verdict, which creates a new draft version.

---

## 1. Edge-case catalogue

### 1.1 Onboarding (EC-ONB)

| ID | Trigger | Expected behaviour | User message | Recovery | Recalc | Test |
|---|---|---|---|---|---|---|
| EC-ONB-01 | Profile skipped or incomplete | Use only trip inputs. Modes needing missing data are disabled with a reason. | "Add your balances to see what you can book with points." | Inline add | None | T-FLOW-006 |
| EC-ONB-02 | Country other than Spain selected | MVP rules are Spain-keyed: show a notice and use Spain rules only where they are country-agnostic. Country-keyed transfer ratios are hidden. | "We currently support cards issued in Spain. Some results may not apply." | Change country | Trip | T-VAL-012 |
| EC-ONB-03 | Ambiguous city (e.g. "Santiago") | Disambiguation list showing country and IATA code | "Which Santiago?" | Pick one | None | T-VAL-001 |
| EC-ONB-04 | No reward accounts | Refusal path R1 | "No cards needed – here's the cheapest way to fly." | — | None | T-FLOW-001 |
| EC-ONB-05 | Guest later registers | One-time migration of local trips, wallet and plan. Duplicates detected. | "We moved 2 trips to your account." | Review list | None | T-FLOW-017 |
| EC-ONB-06 | Leaves mid-flow and returns | Draft is autosaved locally (and on the server if signed in) and restored | "Continue where you left off?" | Discard draft | None | T-FLOW-018 |
| EC-ONB-07 | Declines data sharing (balances or spending) | R3, R4 and R5. Nothing is assumed. | "That's fine – here's what we can do without it." | Add later | None | T-FLOW-006 |
| EC-ONB-08 | Guest data exists in two browsers, then signs in on both | Second migration compares with the account. Duplicate trips are merged with the user's choice. | "This trip already exists in your account. Keep both / Keep newest." | Choose | None | T-FLOW-017 |
| EC-ONB-09 | Sign-in email not received | Resend with a 60 s cooldown and "check spam". Guest work is kept. | "Didn't get it? Resend in 60 s." | Resend | None | T-FUN-006 |
| EC-ONB-10 | Analytics consent rejected | No non-essential cookies. App works fully. | — | Change in Settings | None | T-FUN-024 |
| EC-ONB-11 | User switches from M3 back to M1 | M3 data kept but not used, labelled "paused" | "Planning paused – your data is kept." | Resume M3 | Trip | T-FLOW-016 |
| EC-ONB-12 | User asks for a non-EUR display currency | P0: EUR only, original currency shown in the breakdown (D-07) | "Prices are shown in EUR." | — | None | T-CALC-008 |

### 1.2 Trip requirements (EC-TRIP)

| ID | Trigger | Expected behaviour | User message | Recovery | Recalc | Test |
|---|---|---|---|---|---|---|
| EC-TRIP-01 | Flexible dates find nothing cheaper | Show H = N with a €0 saving, honestly | "Your dates are already the cheapest we found." | Widen flex | None | T-FLOW-001 |
| EC-TRIP-02 | One-way trip | Return hidden. N and H are one-way. | — | — | None | T-FUN-001 |
| EC-TRIP-03 | More than 6 legs requested | Blocked at 6 (AS-07) | "Up to 6 flights per plan. Split into two plans." | Split | None | T-VAL-008 |
| EC-TRIP-04 | Mixed traveller types (adult + child + infant) | Ages required. Infant linked to an adult. Prices per passenger and in total. | "Add the child's age so we can price correctly." | Enter ages | Trip | T-VAL-005 |
| EC-TRIP-05 | Different cabins on different legs | Per-leg cabin used. A "mixed cabin" badge on awards. | "Mixed cabins." | — | Trip | T-FUN-002 |
| EC-TRIP-06 | Tight deadline (departure < 14 days) | Award strategies whose transfer lead time exceeds the time left are excluded. Cash is prioritised. | "Too close to departure for a points transfer to be safe." | — | Trip | T-TIME-002 |
| EC-TRIP-07 | Leg sequence invalid or overlapping | Blocking error on the leg | "Flight 2 leaves before flight 1 lands." | Edit leg | None | T-VAL-008 |
| EC-TRIP-08 | Nearby airport chosen, no transport cost entered | Flagged "transport cost not included". It can't be the top Goal B pick unless its saving exceeds AS-09. | "Getting to BCN isn't included." | Enter cost | Local | T-FLOW-008 |
| EC-TRIP-09 | Bag needed but price excluded bags | Bag-inclusive price turned on. The label stays visible. Award bag rules shown where known. | "Prices include 1 checked bag." | Toggle | Trip | T-FUN-016 |
| EC-TRIP-10 | Refundable fare needed, conditions unknown (`null`) | "Unknown" doesn't satisfy the requirement. The option is excluded from recommendations. | "Refund rules unknown for this fare." | Relax requirement | Trip | T-INT-010 |
| EC-TRIP-11 | Destination changed after a plan exists | R-EV-08 | See doc 01 §6 | — | Plan | T-REG-008 |
| EC-TRIP-12 | Dates changed after a plan exists | R-EV-09 | See doc 01 §6 | — | Plan | T-REG-009 |
| EC-TRIP-13 | Origin equals destination | Validation error | "Origin and destination must differ." | Edit | None | T-VAL-001 |
| EC-TRIP-14 | Date in the past, or at a time-zone boundary | Validated against the origin airport's local date | "That date has passed in Madrid." | Edit | None | T-VAL-002, T-TIME-009 |
| EC-TRIP-15 | Beyond a programme's estimated release window, or beyond the provider horizon (corrected: no universal 360-day cap) | Planning allowed. Award `ESTIMATED_RELEASE_WINDOW` (or `UNKNOWN_AVAILABILITY` if the programme has no estimate); cash `NOT_YET_SEARCHABLE` | "Award seats usually open around [date] (estimate, not confirmed)." | Reminder | None | T-VAL-003, T-TIME-010 |
| EC-TRIP-16 | Infant combined with an award | Instructions route to phone booking (REQ-RES-04) | "Infant award tickets must be booked by phone with Iberia." | Call steps | Local | T-FUN-017 |
| EC-TRIP-17 | Award for a non-member flying alone (Iberia) | Beneficiary step required | "Add them as a beneficiary in Iberia Club first." | Steps | Local | T-FUN-018 |
| EC-TRIP-18 | Destination with time-limited entry rules (China visa-free ends 31/12/2026) | Notice with official link. No legal advice given. | "Entry rules may change before your trip – check the official source." | Link | None | T-FUN-026 |
| EC-TRIP-19 | Child turns 2 or 12 between search and travel | Age is computed at the date of the last flight (Duffel). Price type may change. | "Prices use ages on the travel date." | — | Trip | T-VAL-006 |
| EC-TRIP-20 | Open-jaw gap needs ground travel | Gap shown. Transport cost entered by the user, otherwise flagged. | "You'll need to get from Beijing to Shanghai." | Add leg/cost | Trip | T-CALC-007 |
| EC-TRIP-21 | Trip far beyond every known horizon (e.g. 500 days) | Planning, forecast and reminders work. Neither cash nor award is searchable, so the verdict is limited to `MONITOR_NO_TRANSFER` or `TOO_UNCERTAIN` | "Too early to compare prices. Keep earning normally; we'll remind you around [date] (estimate)." | Reminder | None | T-TIME-012 |

### 1.3 Cards and rewards (EC-CARD)

| ID | Trigger | Expected behaviour | User message | Recovery | Recalc | Test |
|---|---|---|---|---|---|---|
| EC-CARD-01 | Card not in the catalogue | Custom card. The user enters currency, earn rate, fee and caps, labelled "user-confirmed". | "Add your card's terms." | — | Plan | T-FUN-008 |
| EC-CARD-02 | Catalogue terms older than 30 days | Stale badge. Still used, but confidence drops to Medium. | "Terms may have changed – check [issuer link]." | Confirm/edit | Plan | T-FUN-029 |
| EC-CARD-03 | Conflicting sources (e.g. Amex landing pages) | Most restrictive reading applied, with a banner showing both versions | "Offer terms differ between pages – using the stricter one." | Override | Plan | T-CALC-019 |
| EC-CARD-04 | Not enough points | Gap shown. Cash or mixed option. M3 suggested. | "You're 5,000 points short." | Plan ahead | None | T-CALC-005 |
| EC-CARD-05 | Points balance unknown | R3: affordability "Unknown", break-even shown | "Add your balance to check." | Add | None | T-CALC-110 |
| EC-CARD-06 | Points expire before the trip | Points become surplus after expiry. Warning with an activity hint. | "Your Avios may expire on [date]." | Activity | Plan | T-TIME-008 |
| EC-CARD-07 | Transfer ratio changed | New rule snapshot (R-EV-07). Affected options recomputed. | "Transfer ratio changed on [date]." | — | Plan | T-REG-007 |
| EC-CARD-08 | Transfer slower than expected | R-EV-14 | "Transfer not arrived yet – you still have until [date]." | Contact programme | Plan | T-REG-014 |
| EC-CARD-09 | Transfer attempted before a live check | Step order blocks it | "Check the seat is bookable first – transfers can't be undone." | Do step 1 | None | T-FUN-019 |
| EC-CARD-10 | Transfer path suspended (Amex Spain → Emirates) | Path unavailable, labelled "suspended" | "This transfer is currently suspended." | Other path | Trip | T-CALC-010 |
| EC-CARD-11 | Welcome bonus not achieved | Bonus removed from projections. Verdict recomputed (T-TIME-112). | "Bonus not reached – plan updated." | — | Plan | T-TIME-112 |
| EC-CARD-12 | Eligible-transaction exclusions (taxes, cash, marketplaces) | Excluded spend doesn't count toward thresholds or earn bonus rates | "Tax payments don't count toward this bonus." | — | Plan | T-CALC-101 (S-07) |
| EC-CARD-13 | Refund reverses rewards | Negative ledger entry. Clawback risk. Replan. | "A refund may reverse points." | — | Plan | T-REG-002 |
| EC-CARD-14 | Rewards cap reached | MV = 0 above the cap. Spend routed elsewhere. | "Card C stops earning after €1,000 this month." | — | Plan | T-CALC-115 |
| EC-CARD-15 | Card application declined or user ineligible | Product removed. G6 records the reason. | "Removed – not eligible." | — | Plan | T-CALC-108 |
| EC-CARD-16 | User rejects a recommendation | Rejection memory with scope (REQ-REC-REJ-01) | "Got it – we won't suggest this again for this trip." | Undo | Plan | T-FUN-028 |
| EC-CARD-17 | User disables recommendations entirely | M4 hidden for all trips | — | Settings | Plan | T-FLOW-109 |
| EC-CARD-18 | Card cancelled while MR points are unredeemed | Warning: "MR points are lost immediately on cancellation" (VERIFIED) | "Transfer or use your points before cancelling." | — | Plan | T-REG-005 |
| EC-CARD-19 | Avios account less than 30 days old | Move blocked until day 30. AFD shifted. | "New accounts can receive Avios after 30 days." | — | Plan | T-CALC-011 |
| EC-CARD-20 | Family-pooled Avios treated as transferable | Pool used only for redemption, never for transfers | "Family-pool Avios can't be transferred." | — | Trip | T-CALC-010 |
| EC-CARD-21 | Account details don't match between Avios programmes (name, date of birth, email) | Move step blocked with the reason | "Your details must match on both accounts (use your passport details)." | Fix details with the programme | Plan | T-FUN-032 |
| EC-CARD-22 | Qatar Privilege Club not linked to BA Club | A link step is inserted before any BA ↔ Qatar move | "Link your Qatar and BA accounts first." | Link | Plan | T-FUN-032 |
| EC-CARD-23 | Conflicting account-age rules (30 days on avios.com and in the client guide; 90 days for Iberia in BA's terms) | Stricter reading (90 days for BA ↔ Iberia, 30 days otherwise) until resolved. AFD shifts. | "New accounts may need up to 90 days before moving Avios with Iberia." | — | Plan | T-FUN-032 |
| EC-CARD-24 | The client guide's card claim conflicts with the issuer (Revolut credit card "Ultra only" vs the official page "available to Spain residents, rates by plan") | Issuer terms used; conflict recorded on the product | "Rates from Revolut's official page (checked [date])." | — | None | T-FUN-033 |
| EC-CARD-25 | Business card (e.g. Amex Business Platinum) | Only expenses the user marks as business-eligible are allocated to it (whether personal use is allowed is UNVERIFIED) | "Only business expenses are allocated to this card." | Mark expenses | Plan | T-ALLOC-008 |

### 1.4 Spending (EC-SPD)

| ID | Trigger | Expected behaviour | User message | Recovery | Recalc | Test |
|---|---|---|---|---|---|---|
| EC-SPD-01 | Daily, weekly and monthly amounts mixed | Normalised (×365/12, ×52/12). Original entry kept. | "€10/day ≈ €304.17/month." | — | Plan | T-FUN-009 |
| EC-SPD-02 | Duplicate or overlapping expenses | Prompt; only one is kept | "Is this the same as 'Supermarket'?" | Merge/keep | Plan | T-ALLOC-007 |
| EC-SPD-03 | Fixed, variable and one-off expenses mixed | Variable amounts get a −20% conservative band (AS-12). One-offs are dated. | "Estimated range shown." | — | Plan | T-FUN-009 |
| EC-SPD-04 | Expense already completed | `already_paid` items are excluded from allocation | — | — | Plan | T-FUN-010 |
| EC-SPD-05 | Purchase refunded | R-EV-02 | See doc 01 §6 | — | Plan | T-REG-002 |
| EC-SPD-06 | Unexpected expense after the plan is approved | R-EV-01 | See doc 01 §6 | — | Plan | T-REG-107 |
| EC-SPD-07 | Minimum-spend window | Only necessary, planned, eligible spend inside the window counts | — | — | Plan | T-CALC-101 |
| EC-SPD-08 | Several cards compete for one expense | Highest MV wins (P-01). One allocation only (INV-1). | "Card B is better for groceries." | — | Plan | T-ALLOC-111 |
| EC-SPD-09 | Plan breaks the minimum reserve | G4 fails. The strategy is rejected, or the plan is flagged. | "This would take you below your €1,500 safety reserve." | Edit reserve/plan | Plan | T-CALC-113 |
| EC-SPD-10 | A reward would encourage unnecessary spending | G1. Never suggested. | "Buying something you don't need isn't a saving." | — | None | T-CALC-103 |
| EC-SPD-11 | Expense can't be paid by card (e.g. rent by transfer) | Excluded from allocation | — | Edit | Plan | T-ALLOC-008 |
| EC-SPD-12 | Non-EUR purchase | FX fee per card. Allowance rules applied. | "Card T charges 2.9% on foreign currency." | — | Plan | T-CALC-101 (S-05) |
| EC-SPD-13 | User carries card debt | G2/G3 off. S-12. | See S-12 | Banco de España link | Plan | T-CALC-113 |
| EC-SPD-14 | Allocation exceeds credit limit or comfortable range | G8 caps the card's allocation. Warning. | "This exceeds the limit you entered." | Edit | Plan | T-ALLOC-008 |

### 1.5 Booking optimisation (EC-OPT)

| ID | Trigger | Expected behaviour | User message | Recovery | Recalc | Test |
|---|---|---|---|---|---|---|
| EC-OPT-01 | Cash fare cheaper than the award (economic cost) | ST-12 | "Cash is better by €98." | — | None | T-CALC-106 |
| EC-OPT-02 | Award needs excessive points or fees | Ranked by EC, with break-even shown | "Worth it only if you value points above €0.00xx." | — | None | T-CALC-003 |
| EC-OPT-03 | Seat disappears after transfer | Points stay in the destination programme. Alternatives in that programme, plus a cash fallback. R-EV-12. | "That seat is gone. Your points are in Iberia Club – here are other options." | Alternatives | Plan | T-REG-012 |
| EC-OPT-04 | Cash prices differ across providers | Lowest bookable all-in price used. Both shown with source. | "Prices differ by source." | — | Local | T-INT-008 |
| EC-OPT-05 | No award results | Cash only, with an explicit note | "No award prices for this route in our data." | Change route | None | T-FLOW-002 |
| EC-OPT-06 | Route involves separate tickets | Badge and warning. Excluded if Q-PREF-05 = No. | "Separate tickets: a missed connection isn't protected." | Toggle | Trip | T-FUN-020 |
| EC-OPT-07 | Alternate airport cheaper but transport is costly | Transport added to cashOut | "€15 more after the train." | — | Local | T-FLOW-008 |
| EC-OPT-08 | Cheaper date clashes with a hard date | Not recommended (REQ-OWN-07) | — | "Show what I'm missing" | None | T-CALC-013 |
| EC-OPT-09 | Multi-leg combination cheaper than individual tickets | Whole-trip fare considered | "One open-jaw ticket beats separate tickets." | — | Trip | T-CALC-007 |
| EC-OPT-10 | Fare changes before booking | Re-price, then re-confirm | "Price changed from €702 to €719." | Confirm/cancel | Local | T-INT-004 |
| EC-OPT-11 | Can't book before the latest safe booking date (LSBD) | `INSUFFICIENT_BY_DEADLINE`, then cash fallback | "You won't have enough points in time." | Book cash | Plan | T-TIME-002 |
| EC-OPT-12 | Goal A and Goal B disagree | Both shown. Ranking follows the selected goal. | "Lower cash today, but €98 more overall." | Switch goal | Trip | T-CALC-012 |
| EC-OPT-13 | Premium cabin uses many more points for no better saving | Trade-off sentence. Preferred (not minimum) cabin gives way to economy if EC is better. | "Business uses 62,000 more points and costs €410 more overall." | Mark business as minimum | Trip | T-CALC-013 |
| EC-OPT-14 | Near-tie with low confidence | `TOO_UNCERTAIN`: options shown side by side | "These are too close to call with current data." | Refresh / revisit | None | T-TIME-006 |
| EC-OPT-15 | Award priced but taxes unknown | Excluded from recommendations. Shown as "taxes unknown". | "Taxes unknown – check on the programme site." | — | Local | T-FUN-016 |
| EC-OPT-16 | Mixed-cabin award | Badge, with the cabin per segment | "Business on the long flight only." | — | Local | T-FUN-002 |
| EC-OPT-17 | Phantom or cached award availability | `MONITOR_NO_TRANSFER`. Never `BOOK_AWARD_NOW` without a live check. | "Seen in cached data – verify before transferring." | Live check step | None | T-TIME-005 |
| EC-OPT-18 | Shared points pool across legs | INV-4. Infeasible combinations rejected with a reason. | "Needs 50,000 points; you have 30,000." | — | Trip | T-CALC-007 |
| EC-OPT-19 | Lower cash fare seen later (month 3) | Recompute. `BOOK_CASH_NOW` if it beats the award EC. | "Cash dropped to €690 – book cash now." | Book | Plan | T-TIME-004 |
| EC-OPT-20 | Fallback hold or refundable cost exceeds the benefit of waiting | Waiting is rejected for users who need a guaranteed seat | "Holding a refundable fare costs more than waiting saves." | — | Plan | T-TIME-003 |
| EC-OPT-21 | Small points gap: a top-up is tempting | Gap-fill shown only if: the award is found, the gap is ≤ 20% (D-25), the user entered a price, and G2–G4 pass. It sits after the live-check step. | "Topping up only makes sense once you've confirmed the seat." | — | Local | T-CALC-023 |
| EC-OPT-22 | A LIVE-TEST cash price shown next to an ILLUSTRATIVE award price | Labelled "illustrative pairing – not the same real flight"; hero says "Example saving" | "Example saving (illustrative data)." | — | None | T-FUN-031 |

### 1.6 Technical and data (EC-TECH)

| ID | Trigger | Expected behaviour | User message | Recovery | Recalc | Test |
|---|---|---|---|---|---|---|
| EC-TECH-01 | Provider timeout (> 10 s) | Partial results, retry, mock fallback in demo | "Some prices took too long. Retry" | Retry | Local | T-INT-001 |
| EC-TECH-02 | Rate limit (HTTP 429) | Back off. Cached results labelled. Per-user limit message. | "Too many searches – try again in a minute." | Wait | None | T-INT-002, T-SEC-004 |
| EC-TECH-03 | Expired quote | New search, not a retry | "This price expired. Search again." | Search | Local | T-INT-003 |
| EC-TECH-04 | Partial results across providers | Show what arrived. Trip total marked incomplete. | "Award prices missing for flight 2." | Retry | Local | T-INT-007 |
| EC-TECH-05 | Stale cached results | Age badge. Booking requires a refresh. | "3 hours old – refresh before booking." | Refresh | Local | T-FLOW-016 |
| EC-TECH-06 | Invalid input (client bypassed) | Server-side schema validation rejects it | "Please check the highlighted fields." | Edit | None | T-SEC-005 |
| EC-TECH-07 | Currency conversion failure | Comparison blocked for the affected item. Last snapshot used only if it is less than 7 days old (AS-19) and labelled. | "Can't convert USD right now – showing original currency." | Retry | Local | T-INT-006 |
| EC-TECH-08 | Concurrent updates (two tabs) | Version check. Re-base or merge (CH-1/CH-2). | "This plan changed in another tab – reload." | Reload | Plan | T-REG-016 |
| EC-TECH-09 | Duplicate background job | Dedupe key makes it a no-op | — | — | None | T-REG-016 |
| EC-TECH-10 | User A requests User B's data | Denied by row-level isolation. Generic 404. | "Not found." | — | None | T-SEC-001 |
| EC-TECH-11 | Account deleted while a reminder is pending | Reminders cancelled in the same transaction | — | — | None | T-SEC-006 |
| EC-TECH-12 | Contradictory provider data (e.g. total ≠ base + tax) | Provider total trusted as all-in. Breakdown shown as "not available". Logged. | "Price breakdown not available." | — | Local | T-INT-008 |
| EC-TECH-13 | No live data available for the demo | Mock mode. Full journey works. ILLUSTRATIVE badges. | "Demo data – illustrative." | — | None | T-DEMO-003 |
| EC-TECH-14 | Session lost mid-flow | Draft restored after sign-in | "Sign in again to continue – your draft is safe." | Sign in | None | T-FLOW-018 |
| EC-TECH-15 | Database write failed | Retry with idempotency. User told; draft kept locally. | "Couldn't save – we'll retry. Your changes are kept." | Retry | None | T-SEC-009 |
| EC-TECH-16 | Duplicate booking submission | Idempotency key gives one order | — | — | None | T-SEC-009 |
| EC-TECH-17 | `price_changed` at order creation | Show the new price and require confirmation | "The airline changed the price to €719." | Confirm | Local | T-INT-004 |
| EC-TECH-18 | LLM unavailable, or output fails validation | Template explanation used. AI label not shown. | — | — | None | T-SEC-008 |
| EC-TECH-19 | Rounding or precision error risk | Integer cents. Half-away-from-zero rounding at display only. | — | — | None | T-CALC-002 |
| EC-TECH-20 | DST or time-zone date boundary | Airport-local dates. Day counts in UTC with a documented rule. | — | — | None | T-TIME-009 |
| EC-TECH-21 | Duplicate saved trips | Detect the same legs, dates and travellers. Offer "open existing". | "You already saved this trip." | Open | None | T-FUN-006 |
| EC-TECH-22 | Free-tier database paused after inactivity (production risk) | Health check. Uptime ping noted as an ops risk in doc 03. | "We're waking up – try again in a moment." | Retry | None | T-DEMO-004 |

### 1.7 Reward-rule mechanics (EC-RWD)

| ID | Trigger | Expected behaviour | User message | Recovery | Recalc | Test |
|---|---|---|---|---|---|---|
| EC-RWD-01 | Rounding rule unknown (Iberia Cards) | `floor`, plus AS-14 | "Estimated – rounding not published." | Override | Plan | T-CALC-015 |
| EC-RWD-02 | Fractional points carried over between transactions | Not assumed. Per-transaction rounding applies if stated, otherwise `floor` per period. | — | — | Plan | T-CALC-015 |
| EC-RWD-03 | "anual" period undefined (Icon €18,000) | Restrictive reading (card year vs calendar year, whichever triggers first). User confirms. | "Confirm whether this is per calendar year." | Confirm | Plan | T-CALC-017 |
| EC-RWD-04 | Monthly cap measured per statement period or calendar month | Ask, or use the restrictive reading | — | Confirm | Plan | T-CALC-016 |
| EC-RWD-05 | Refunds counted gross vs net toward a threshold | Assume net (refunds reduce qualifying spend) | — | — | Plan | T-REG-002 |
| EC-RWD-06 | Negative points balance (Revolut allows it) | Shown as negative. Usable = max(0, balance). | "Your balance is negative after a refund." | — | Plan | T-ALLOC-006 |
| EC-RWD-07 | Wallet or marketplace exclusions (Amex category bonus) | Base rate only, or excluded per rule | — | — | Plan | T-CALC-015 |
| EC-RWD-08 | Dynamic currency conversion (DCC) or non-EUR purchase | FX rule. Earn on the posted EUR amount. | — | — | Plan | T-CALC-008 |
| EC-RWD-09 | Offer terms differ by landing page | User selects which offer they received. Default is restrictive. | "Which offer did you sign up for?" | Choose | Plan | T-CALC-019 |
| EC-RWD-10 | Offer URL reused for a new version (Revolut) | Snapshot hash per version. Old version kept for history. | — | — | Plan | T-REG-007 |
| EC-RWD-11 | Points posted by the airline, not the issuer | Posting delay includes the partner delay (maximum) | — | — | Plan | T-CALC-018 |
| EC-RWD-12 | Card Avios not registered within 6 months are lost (Iberia Cards) | Warning, plus a membership-number check step | "Link your Iberia Club number or these Avios may be lost." | Link | Plan | T-TIME-008 |
| EC-RWD-13 | MR points lost on card cancellation | Warning (EC-CARD-18) | — | — | Plan | T-REG-005 |
| EC-RWD-14 | Missed payment cancels points (Amex, Iberia Cards) | G2 relevance: no optimisation unless paid in full | — | — | Plan | T-CALC-113 |
| EC-RWD-15 | Annual fee billed monthly | Counted per month inside the horizon | — | — | Plan | T-CALC-104 |
| EC-RWD-16 | Fee waived when purchases are financed or revolving (CaixaBank, Bankinter) | **Never** counted as a benefit. Note shown. | "Fee waiver requires financing – not counted." | — | Plan | T-CALC-104 |
| EC-RWD-17 | Transfer bonus with tax withholding (Revolut: 19% for ES residents) | Points after withholding (P1). Shown as "net after withholding (stated by Revolut)". | — | — | Plan | T-CALC-019 |
| EC-RWD-18 | Transfer takes the maximum documented time | AFD uses the maximum (Amex MR → Iberia: up to 14 days) | — | — | Plan | T-CALC-018 |
| EC-RWD-19 | User override contradicts the catalogue | User value used, labelled "user-confirmed". Confidence Medium. | "Using your value instead of published terms." | Revert | Plan | T-FUN-029 |
| EC-RWD-20 | Bonus posting delay of up to 180 days (Amex) | Maximum used for deadline decisions | — | — | Plan | T-TIME-105 |
| EC-RWD-21 | Threshold step (Icon: 1 per €10 after €18,000) | Marginal earn changes after the step | — | — | Plan | T-CALC-017 |
| EC-RWD-22 | Hard-stop cap, generic (fixture Card C) (corrected: Iberia Aire's cap is ambiguous in scope, see EC-RWD-27) | MV = 0 above the cap | — | — | Plan | T-CALC-016, T-CALC-115 |
| EC-RWD-23 | Issuer-estimated benefit value (e.g. "€587 hotels") | Counted only if the user says they'll use it. Labelled "issuer estimate". | — | — | Plan | T-CALC-104 |
| EC-RWD-24 | A per-transaction rule (rounding, merchant code) but only category totals are known | Forecast labelled ESTIMATE with a band; conservative value drives verdicts | "Estimate – actual points depend on individual purchases." | Record actual postings | Plan | T-CALC-021 |
| EC-RWD-25 | Merchant eligibility unknown ("Not sure" for partners or category merchants) | Base rate. 0 if the category is on the card's exclusion list. | "We used the standard rate because we're not sure these shops count." | Answer Q-SPEND-02b | Plan | T-CALC-021 |
| EC-RWD-26 | Actual posted points differ from the estimate | Actual replaces the estimate; future months re-projected; difference shown | "Card X posted 260 points (we estimated 233)." | — | Plan | T-REG-017 |
| EC-RWD-27 | Ambiguous cap scope (Iberia Aire: whether IAG and partner spend count toward €1,000/month) | Restrictive reading (all spend shares the limit) + order-conservative forecast; the alternative reading is shown as a sensitivity | "Iberia Cards' terms are unclear here – we used the cautious reading." | Confirm with the issuer | Plan | T-CALC-020 |

### 1.8 Allocation integrity (EC-ALLOC)

| ID | Trigger | Expected behaviour | Test |
|---|---|---|---|
| EC-ALLOC-01 | The same expense-month would be assigned to two cards | Rejected (INV-1) | T-ALLOC-001 |
| EC-ALLOC-02 | A bonus would be counted twice (two plans or two trips) | Counted once per user (INV-2) | T-ALLOC-002 |
| EC-ALLOC-03 | A fee would be counted twice | Once per horizon (INV-3) | T-ALLOC-003 |
| EC-ALLOC-04 | Points pledged to two trips | Priority prompt. Committed once (INV-4). | T-ALLOC-004 |
| EC-ALLOC-05 | A transfer bonus applied twice | Once per transfer (INV-5) | T-ALLOC-005 |
| EC-ALLOC-06 | A refund netted silently | Negative entry plus replan (INV-6) | T-ALLOC-006 |
| EC-ALLOC-07 | Competing bonuses in overlapping windows | Choose the higher ΔB. Record the reason for the other. | T-ALLOC-111 |
| EC-ALLOC-08 | A payment preference violated ("never use Card X for rent") | Constraint respected | T-ALLOC-008 |
| EC-ALLOC-09 | Pull-forward breaks the reserve | G4 rejects it | T-CALC-113 |
| EC-ALLOC-10 | Expense moved between cards | Ledger shows from → to. No duplicate. | T-ALLOC-102 |
| EC-ALLOC-11 | Lumpy expenses overshoot a threshold | Minimal-overshoot subset chosen | T-CALC-114 |
| EC-ALLOC-12 | Heuristic used instead of exact search | Labelled "approximate" | T-REG-120 |

### 1.9 Marginal value (EC-MARG, P-01)

| ID | Trigger | Expected behaviour | Test |
|---|---|---|---|
| EC-MARG-01 | Same usable reward at €200 and €280 on one card | Extra spend routed to the card with the highest MV (M-01) | T-CALC-114 |
| EC-MARG-02 | Cap reached; extra spend earns 0 | Split allocation (M-02) | T-CALC-115 |
| EC-MARG-03 | Threshold met, remaining expenses exist | Remainder goes to the best card; buffer variant (M-03) | T-ALLOC-116 |
| EC-MARG-04 | Trip points need already met | Goal-met rule: cash-optimal routing (M-04, S-02c) | T-CALC-117, T-FLOW-121 |
| EC-MARG-05 | Points with no realistic use before the target date | ΔUsable = 0 (M-05) | T-CALC-118 |
| EC-MARG-06 | Higher nominal rate loses after fees or opportunity cost | Existing card kept (M-06) | T-CALC-119 |

**Count (after audit):** ONB 12 + TRIP 21 + CARD 25 + SPD 14 + OPT 22 + TECH 22 + RWD 27 + ALLOC 12 + MARG 6 = **161 edge cases**. The 149 earlier IDs are unchanged; 12 were added.

---
## 2. Functional acceptance criteria (complements doc 00, section 9)

The acceptance criteria for brief, owner and recommendation requirements live in doc 00, section 9. This section adds full Given/When/Then text for the research-driven requirements and for each book-now-vs-wait outcome.

| Req | Given | When | Then (pass) | Fail condition |
|---|---|---|---|---|
| REQ-RES-01 | A cash option with base €520, taxes €260, total €780 | It appears in a list, date grid, detail page or reminder | €780 is displayed everywhere, and the breakdown sits one tap away | Any surface shows €520 as the headline |
| REQ-RES-02 | A live-test offer with `expires_at` in 5 min | The user opens checkout after it expires | "This price expired. Search again." and a new search | A retry of the expired offer |
| REQ-RES-03 | 1 adult and 2 infants | The user searches | Blocking error: "Each infant needs an adult." | The search runs |
| REQ-RES-04 | 2 adults, 1 infant, Iberia award | The user opens award steps | A phone-booking step replaces the online booking step | Online steps shown |
| REQ-RES-05 | A traveller who is neither the member nor a beneficiary, flying alone on Iberia Avios | The user opens steps | The "Add as beneficiary first" step appears before transfer | Missing |
| REQ-RES-06 | An offer whose `refund_before_departure` = null | The user requires a refundable fare | The option shows "Refund rules: Unknown" and is excluded | Shown as refundable or not refundable |
| REQ-RES-07 | MR issued in NL, 45,000 points | The user computes the Iberia path | 30,000 Avios (3:2) | 45,000 |
| REQ-RES-08 | Award steps | The user tries to mark "Transfer" done before "Live check" | Blocked with an explanation | Allowed |
| REQ-RES-09 | Avios last active 34 months ago, departure in 4 months | Plan computed | Expiry warning; those Avios are surplus after the expiry date | No warning |
| REQ-RES-10 | A two-ticket itinerary | Results shown | "Separate tickets" badge plus risk text | Missing |
| REQ-RES-11 | Results page | Rendered | A "How we calculate and rank" link is visible | Missing |
| REQ-RES-12 | A displayed saving | Inspected | References stored quote IDs and timestamps | No reference |
| REQ-RES-13 | Any award result | Rendered | The word "free" never appears | Present |
| REQ-RES-14 | LLM explanation enabled | Rendered | "AI-generated explanation of calculated results" label | Missing |
| REQ-RES-15 | First visit, no consent given | Page loads | No analytics cookie set | Set |
| REQ-RES-16 | A card view showing a fee | Rendered | Credit warning, plus representative APR (TAE) if the card is credit. No "advice" or "approval odds". No affiliate link. | Any violation |
| REQ-RES-17 | Any price | Rendered | Exactly one provenance badge | Zero or two |
| REQ-RES-18 | Trip to China after 31/12/2026 | Results shown | Entry-rules notice with official link | Missing |
| REQ-RES-19 | Any deciding input LIVE-TEST or ILLUSTRATIVE | Hero rendered | "Example saving (illustrative data)"; confidence "Illustrative"; pairing label if mixed | "You save", "real price" or High confidence shown |
| REQ-RES-20 | Avios move from Iberia via BA to Qatar; Qatar account 10 days old; not linked | User opens award steps | Link step + "wait until account is 30 days old ([date])" shown before transfer; transfer step blocked | Transfer step available |
| REQ-RES-21 | Departure 500 days out | Plan computed | Planning works; award `ESTIMATED_RELEASE_WINDOW`; cash `NOT_YET_SEARCHABLE`; verdict `TOO_UNCERTAIN` or `MONITOR_NO_TRANSFER` | Validation error or a `BOOK_*` verdict |

---

## 3. Decision tables

### 3.1 Book-now-vs-wait outcomes (REQ-OWN-05)

Inputs are defined in doc 00, section 7.7: LSBD (latest safe booking date), AFD (award-feasible date), tolerance (AS-10), pessimistic cash increase X (AS-17), and safety buffer (AS-16).

| Outcome | Conditions (all must hold) | Message (proposed) | Revisit date | Invalidating events | Test |
|---|---|---|---|---|---|
| `CASH_BETTER_THAN_AWARD` | Economic cost of award ≥ economic cost of cash at the user's valuation | "Paying cash is better: the award costs €X more once your points are valued. Keep your points." | When the cash price or the valuation changes | Valuation change; cash rise above the award's economic cost; transfer bonus | T-TIME-001 |
| `INSUFFICIENT_BY_DEADLINE` | AFD > LSBD | "You won't have enough usable points before [LSBD]. Book cash, or change dates." | Now | Balance increase; earning increase; dates moved | T-TIME-002, T-TIME-112 |
| `WAIT_ACCUMULATE` | Award economic cost < cash; AFD ≤ LSBD; AFD ≤ latest bookable date; award economic cost < pessimistic cash; a cash fallback remains bookable; fallback cost < benefit (or no hold needed); G4 holds | "Keep earning. You should have enough by [AFD]. Don't transfer yet. Check again on [revisit]." | Every 30 days (AS-20), plus a key check at AFD − 7 days | Cheaper cash ≤ award economic cost; award no longer shown; spending, balance or date change; offer expiry; reserve breach | T-TIME-003 |
| `BOOK_CASH_NOW` | Waiting fails a condition and cash is acceptable, or cash ≤ award economic cost now (observed) | "Book the cash fare now: €X. Waiting doesn't pay off because…" | — | — | T-TIME-004 |
| `MONITOR_NO_TRANSFER` | Usable points ≥ need, but availability is not verified live | "You have enough points, but this seat isn't confirmed. Check the programme site before transferring." | Daily until LSBD (in-app) | Live check done; LSBD reached | T-TIME-005 |
| `TOO_UNCERTAIN` | Top two options within tolerance, and confidence Low | "These options are too close to call with current data." Both shown. | +7 days, or on refresh | New data | T-TIME-006 |
| `BOOK_AWARD_NOW` | Usable points ≥ need, availability verified live, award wins on the objective | "Book with points now. First re-check the seat, then transfer N points." | — | Seat gone after check | T-TIME-007 |

**Precedence when several outcomes match:** missing inputs (Insufficient confidence) → `CASH_BETTER_THAN_AWARD` → `BOOK_AWARD_NOW` / `MONITOR_NO_TRANSFER` → `INSUFFICIENT_BY_DEADLINE` → `WAIT_ACCUMULATE` → `TOO_UNCERTAIN` → `BOOK_CASH_NOW`. This is the same order as the flowchart in doc 01, section 9.

### 3.2 Worked example: trip in 6 months (FX-WIN-02)

All figures are ILLUSTRATIVE.

**Fixture:**
- Today is day 0. Departure is day 180, which is a hard date.
- Cash quote now: **€780** all-in (1 adult, economy return).
- Award option: **50,000 points + €320** taxes and surcharges. Availability is ILLUSTRATIVE (cached).
- Usable balance today: **35,200**. Usable earning: **4,400 per month**, after the maximum posting delay.
- Need with the 10% buffer: **55,000**.
- Months to reach the need: (55,000 − 35,200) ÷ 4,400 = 4.5, which is day 135. Adding the maximum transfer lead time (14 days, Amex MR → Iberia, VERIFIED) gives **AFD = day 149**.
- Safety buffer: 3 days. Pessimistic cash X = 15%, so **€897**. Tolerance = max(5% × 780, €25) = **€39**.

| Variant | Change | Calculation | Outcome | Test |
|---|---|---|---|---|
| V1 | v = €0.012 | Award economic cost = 320 + 600 = **€920** ≥ €780. Break-even v* = (780 − 320) / 50,000 = **€0.0092** | `CASH_BETTER_THAN_AWARD` | T-TIME-001 |
| V2 | v = €0.008; cut-off 30 days before departure | Award economic cost = 320 + 400 = **€720** < €780. LSBD = 150 − 3 = **day 147** < AFD 149 | `INSUFFICIENT_BY_DEADLINE`, so book cash | T-TIME-002 |
| V3 | v = €0.008; cut-off 14 days | LSBD = 166 − 3 = **day 163** ≥ AFD 149. €720 < €897 (pessimistic). Fallback = buy cash later (no hold). Reserve OK. Benefit €60 > tolerance €39. | `WAIT_ACCUMULATE`; revisits every 30 days (days 30, 60, 90 …) plus a key check on day 142 (AFD − 7) | T-TIME-003 |
| V4 | V3, then cash €690 observed on day 90 | €690 < €720 | `BOOK_CASH_NOW` (the brief's "cheaper cash in month 3" case) | T-TIME-004 |
| V5 | V3, but the user ranks "avoid risk" and needs a guaranteed seat (hold or refundable premium €120) | Fallback cost €120 > benefit €60 | `BOOK_CASH_NOW` | T-TIME-003 (variant) |
| V6 | v = €0.0088 | Award economic cost = 320 + 440 = **€760**. Difference €20 < tolerance €39. Availability ILLUSTRATIVE, so confidence Low. | `TOO_UNCERTAIN` | T-TIME-006 |
| V7a | Balance 56,000 usable now; availability cached | Usable ≥ need; not verified live | `MONITOR_NO_TRANSFER` | T-TIME-005 |
| V7b | V7a, and availability verified live | Usable ≥ need; verified | `BOOK_AWARD_NOW` (re-check, then transfer) | T-TIME-007 |
| V8 | Same as V3, but departure at day 90 (a 3-month trip) | LSBD = 76 − 3 = **day 73** < AFD 149 | `INSUFFICIENT_BY_DEADLINE` | T-TIME-002 (variant) |
| V9 | Same as V3, but departure at day 365 (a 12-month trip); a cash quote exists | Award state `ESTIMATED_RELEASE_WINDOW` until ≈ day 5 (365 − 360, AS-03 estimate for this programme only). AFD 149 ≤ LSBD 348. | `WAIT_ACCUMULATE` with "award seats usually open around [day 5] (estimate)" and a release reminder | T-TIME-010 |
| V10 (audit) | Same as V3, but departure at day 500; neither cash nor award searchable | Award `ESTIMATED_RELEASE_WINDOW` until ≈ day 140 (estimate). Cash `NOT_YET_SEARCHABLE`. No comparison possible. | `TOO_UNCERTAIN` + reminders at ≈ day 133 (release − 7, estimate) and when cash becomes searchable | T-TIME-012 |

**Missed bonus deadline** (T-TIME-112, REQ-REC-TIME-01). This uses the V2 cut-off (30 days, LSBD day 147).
- **Earning:** 3,000 per month, plus a planned **8,000-point** bonus posting by day 75 (maximum delay).
- **With the bonus:** 35,200 + 3,000m + 8,000 ≥ 55,000 at m = 3.94 (day 118). AFD = **day 132** ≤ LSBD 147, so `WAIT_ACCUMULATE`.
- **Bonus missed:** 35,200 + 3,000m ≥ 55,000 only at m = 6.6 (day 198). That is after departure, so `INSUFFICIENT_BY_DEADLINE` and the verdict switches to `BOOK_CASH_NOW` at the current quote.
- **Message:** "You missed the bonus deadline, so waiting no longer works. Book cash now."

### 3.3 Goal A vs Goal B (CS-04; T-CALC-012)

| Option | Cash you pay | Points | Economic cost (v = €0.012) | Goal A rank | Goal B rank |
|---|---|---|---|---|---|
| Cash | €620 | 0 | €620 | 2 | **1** |
| Award | €310 | 34,000 | €718 | **1** | 2 |

Both columns are always shown. Under Goal A, the award row is labelled "€98 more overall".

### 3.4 Safety-gate outcomes (doc 00, section 7.5)

| Gate failing | Strategy effect | Message | Case |
|---|---|---|---|
| G1 | Amount rejected | "Buying something you don't need isn't a saving." | S-03 |
| G2 / G3 | All card optimisation off | "Rewards rarely outweigh card interest…" | S-12 |
| G4 | Strategy rejected or plan flagged | "This would take you below your €X safety reserve." | S-11, T-REG-107 |
| G5 | New card not shown | — | F05 |
| G6 / G7 | Candidate removed with reason | "You aren't eligible for this offer (…)." | S-13 |
| G8 | Allocation capped at the limit | "This exceeds the limit you entered." | EC-SPD-14 |

---

## 4. Calculation scenarios (deterministic expected outputs)

### 4.1 Core savings scenarios (CS-01 to CS-05)

| ID | Inputs | Expected calculation | Expected output and explanation | Test |
|---|---|---|---|---|
| CS-01 No points, no cards | FX-CASH-01 (MAD→PEK, exact dates, **€780**); FX-CASH-02 (±2 days, **€702**); FX-CASH-03 (BCN **€735** + train **€60**); no balances | N = €780. H = €702 (date +2). BCN = €795 (worse). Saving = €78. 78/780 = **10.0%** | "Normal €780 · Hacked €702 · Save €78 (10.0%). Fly 2 days later." Award options: "Needs 50,000 points; you have none." | T-CALC-004 |
| CS-02 Partial points (corrected messaging) | FX-MULTI-01 leg 1 only: cash **€520**; award **25,000 + €160**; balance **20,000**; v = €0.010 | Award is **not bookable** with current points (20,000 < 25,000; gap **5,000**). Hypothetical economic cost **if** the gap were covered = 160 + 250 = €410. The hacked option H stays **cash €520**; saving €0.00 vs N. | "Not bookable with your current points: you have 20,000 of the 25,000 needed. If you could cover the gap, this award would cost about €410 in economic terms vs €520 cash (illustrative estimate)." Options: book cash; plan ahead (M3); or gap-fill (CS-02b) **only after confirming the seat**. Never "Points would save €110". | T-CALC-005 |
| CS-02b Gap-fill top-up (audit) | CS-02 + user-entered purchase price **€0.0213 per Avios** (`USER_ENTERED`); gap 5,000 = 20.0% of 25,000 (boundary of D-25) | cashOut = 160 + 5,000 × 0.0213 = **€266.50**. pointsCost = 20,000 × 0.010 = €200. EC = **€466.50** < €520, a saving of **€53.50 (10.3%)** | "Topping up 5,000 Avios (about €106.50 at the price you entered) would make this award about €53.50 cheaper overall – only once you've confirmed the seat." Shown after the live-check step. | T-CALC-023 |
| CS-03 Large balance | FX-CASH-04 MAD→SCL one-way business: cash **€2,900** (ILLUSTRATIVE); award **70,500 Avios** (Iberia chart band 8 off-peak, VERIFIED 26 Oct 2026, subject to change) + **€380** (ILLUSTRATIVE); balance 120,000; v = €0.012 | Points cost = 70,500 × 0.012 = €846. Award economic cost = **€1,226**. Economic saving = **€1,674**. 1,674/2,900 = **57.7%**. Cash saving today = **€2,520** | Hero: "€2,900 → €380 + 70,500 Avios · Save €1,674 (57.7%) · Cash today −€2,520" | T-CALC-006, T-FUN-003 |
| CS-04 Award looks cheaper but is worse | FX-CASH-05: cash **€620**; award **34,000 + €310**; v = €0.012 | Award economic cost = 310 + 408 = **€718** > €620. v* = 310/34,000 = **€0.0091** | "Cash is better by €98. Points only make sense if you value them above €0.0091." | T-CALC-106, T-CALC-003 |
| CS-05 Multi-leg: best overall ≠ cheapest per leg | FX-MULTI-01: L1 MAD→PEK cash €520 / award 25,000 + €160; L2 PEK→PVG cash €90; L3 PVG→MAD cash €540 / award 25,000 + €170; open-jaw cash (L1 + L3) **€880**; balance **30,000**; v = €0.010 | Per-leg cheapest: L1 award €410 + L3 award €420 + L2 €90 = **€920**, but needs 50,000, so **infeasible**. (a) L1 award + L3 cash = 410 + 540 + 90 = €1,040. (b) L1 cash + L3 award = 520 + 420 + 90 = €1,030. (c) Open-jaw cash + L2 = **€970**. N = €970 (open-jaw is how a normal traveller would book). Saving = **€0.00 (0.0%)** | "Your best option is one open-jaw cash ticket (€970) and you keep your 30,000 points. Using points on one leg would cost €60–€70 more overall." Naive "sum of one-ways" N = €1,150 would overstate the saving; not used. | T-CALC-007 |

### 4.2 Incremental-spend cases (S-01 to S-13)

**Shared fixtures:**
- **FX-CARD-T:** 1 point per €1, rounded half-up per transaction. Bonus of 5,000 points for ≥ €300 eligible spend within 30 days of approval (FX-WIN-01). Posting typically 10 business days, maximum 180 days. FX fee 2.9%. Annual fee €0 if already held; €60 per year if new.
- **FX-CARD-A:** 1 point per €3, `floor` rounding per period. €1,000 monthly hard stop. 0% FX up to €500 per month. A generic **illustrative** card, deliberately **not** Iberia Aire (Aire's real terms are in FX-CARD-AIRE, section 4.5).
- **FX-CARD-B:** 3 points per € on groceries.
- **Valuation:** v = €0.010 for all programmes. Trip need not yet met, unless stated otherwise.
- **FX-EXP-01:** €280 domestic, in EUR, inside the window. All necessary.
- **Baselines (corrected in audit; see doc 00 §7.5):**
  - **Shared premise:** Card A is the user's current everyday card, and Card T was approved on day 0.
  - **Unless stated otherwise:** `A_status_quo` = all planned spend on A, and `A_without` = all on A (T unused). So ΔB_change = ΔB_strategy.
  - **Allocation valuation:** allocations are valued as a whole (per-period rounding).
  - **Residual value:** never part of ΔB. It is shown as ΔResidual.

| ID | Inputs (beyond shared) | Expected calculation | Explanation shown | Recovery | Pass / fail |
|---|---|---|---|---|---|
| S-01 | Baseline: all €280 on A | Recommended: T 280 pts = €2.80. Baseline: A floor(280/3) = 93 pts = €0.93. Bonus not met. **ΔB_change = ΔB_strategy = €1.87** | "Your planned €280 is €20 short of the €300 bonus. We won't suggest extra spending. Card T still earns €1.87 more than Card A." | — | Pass if ΔB = €1.87, bonus = 0, and no extra-spend suggestion |
| S-02 | +€20 necessary, planned, eligible, in window (FX-EXP-02). Baseline: all €300 on A | Recommended: T 300 + 5,000 = 5,300 pts = €53.00. Baseline: A 100 pts = €1.00. **ΔB = €52.00** | "Your planned €20 purchase reaches the threshold: bonus worth about €50." | — | Pass if €52.00 and recommended |
| S-02b | As S-02, but T would be a new card at €60/year, with a 12-month horizon (P0 engine / P1 UI) | ΔB_strategy = TripValue(with T) − TripValue(without T) = (53.00 − 60.00) − 1.00 = **−€8.00** | "The €60 fee outweighs the bonus over 12 months." | — | Pass if not recommended |
| S-02c | As S-02, but trip need already met; v_residual = 0 | Goal met, so v_trip = 0 for further points: **ΔB = €0.00**. ΔResidual = (5,300 − 100) × 0 = €0.00. Goal-met (cash-optimal) routing applies. | "Bonus not needed for this trip (your points goal is met)." | State a later use to value the residual | Pass if no bonus pursuit is recommended |
| S-03 | +€20 optional, only to earn the reward (FX-EXP-03) | G1 fails; the outcome is S-01 | "Buying something you don't need to reach a bonus isn't a saving. Keep your budget." | — | Pass if never recommended and no ΔB shown for the rejected path |
| S-04 (corrected) | The user already follows S-01 (€280 on T). The €20 necessary expense is at a merchant where they habitually use A. **Explicit baseline `A_status_quo` = {T: €280, A: €20}** | Baseline value: T 280 pts + A floor(20/3) = 6 pts = 286 pts = **€2.86**. Recommended {T: €300}: 300 + 5,000 = 5,300 pts = **€53.00**. **ΔB_change = €50.14**. ΔB_strategy (`A_without` = the same as the status quo, i.e. not moving the €20) = **€50.14**. The pre-audit €52.00 used an implicit all-on-A baseline and is withdrawn. | "Move your planned €20 purchase from Card A to Card T: you give up 6 points (€0.06) on Card A and Card T's €300 bonus is reached – about €50.14 more in total." | — | Pass if the baseline is named, the ledger shows A → T for the €20 only, one allocation per expense, and €50.14 |
| S-05 | The €20 is from a foreign merchant in USD | FX on T = €0.58 (A is 0% within its allowance). **ΔB = €51.42**. If all €300 were foreign: 52.00 − 8.70 = **€43.30**. A merchant surcharge entered by the user is subtracted. | FX line shown explicitly | — | Pass on both values |
| S-06 | The €300 is groceries, and Card B is held | Baseline B: 900 pts = €9.00. **ΔB = 53.00 − 9.00 = €44.00**. After the window, groceries return to B. | "Use Card T for groceries until [window end], then Card B again." | — | Pass if €44.00 and the date-bounded allocation is correct |
| S-07 | The €20 is a tax payment (excluded); or a cap applies | Qualifying spend stays €280, so the outcome is S-01. Cap variant: €1,400/month on A, and only €1,000 earns. | "Tax payments don't count toward this bonus." | — | Pass if bonus = 0 |
| S-08 | The €20 is planned for day 35 (the window ends day 30) | Not counted. If marked necessary and movable, the outcome is S-02; otherwise S-01. | "Your purchase falls after the window ends on [date]." | Mark as movable (only if it truly is) | Pass on both branches |
| S-09 (corrected) | LSBD = day 60. Bonus posts up to 180 days after the window. Baseline: all €300 on A | Maximum posting date ≈ day 210 > LSBD, so the bonus adds 0 usable points. **ΔB = 3.00 − 1.00 = €2.00** (ordinary earn only). ΔResidual = 5,000 × v_residual, which is €0 by default, or €50 at €0.010 only if the user states a later use. It is shown separately and never in ΔB. | "The bonus may arrive too late for this trip. It's shown separately." | — | Pass if ΔB = €2.00 and the bonus appears only as residual |
| S-10 | S-02, then €40 is refunded after the window | Qualifying spend €260 < €300: clawback risk. Projected −5,000 pts and −40 pts. R-EV-02 runs. | "A refund means you may lose the bonus. Here's how your plan changes." | Review plan | Pass if a negative ledger entry and a draft version are created |
| S-11 | Reserve €1,500. Cash on the pull-forward date is €1,510; pulling the €20 forward makes it €1,490. | G4 fails, so the pull-forward is rejected. The outcome is S-01. | "This would take you below your €1,500 safety reserve." | Keep the original date | Pass if rejected |
| S-12 | G2 = No or G3 = Yes | All card optimisation is off. Only cash and existing-points options are shown. Banco de España revolving-credit link included. | "Rewards rarely outweigh card interest, so we won't optimise card spending while a balance is carried." | — | Pass if no allocation or bonus output appears |
| S-13 | The offer expires before approval, or the user held an Amex card in the last 12 months | G7 / G6 fail. Candidate removed; reason recorded; recompute. | "You aren't eligible for this offer (held an Amex in the last 12 months)." | — | Pass if removed and the reason is stored |

### 4.3 Marginal-value cases (M-01 to M-06, P-01)

**Fixtures** (v = €0.010 unless stated):
- **FX-CARD-M:** 2,000 points once spend reaches €200 in the month; nothing else.
- **FX-CARD-D:** 3 points per € on dining.
- **FX-CARD-A:** as above.
- **FX-CARD-C:** 2 points per € up to €1,000 per month, then 0. A generic illustrative hard-stop cap. (Corrected: this was previously described as "the mechanism VERIFIED for Iberia Aire". Aire's cap wording is real, but its scope is ambiguous; see FX-CARD-AIRE and EC-RWD-27.)
- **FX-CARD-B:** 3 points per € on groceries.
- **FX-CARD-K:** 0.5% cashback.
- **FX-CARD-U:** 1.5 points per €, fee €9.90 per month.

| ID | Inputs | Expected calculation | Chosen | Explanation | Test |
|---|---|---|---|---|---|
| M-01 | FX-EXP-04: groceries €120, fuel €90, dining €70 | X: M = {groceries, fuel} = €210 ≥ €200 → 2,000; dining on D: 210 pts. Total **€22.10**. Y: all on M = 2,000 = **€20.00**. Z: groceries on A (40), fuel + dining on M = €160 (milestone missed) → **€0.40** | X | "Spending more than €200 on Card M doesn't earn more. Put your €70 dining on Card D (+€2.10)." | T-CALC-114 |
| M-02 | FX-EXP-05: €1,400 general per month | All on C: 2,000 = **€20.00**. C €1,000 + A €400: 2,000 + 133 = **€21.33** | Split | "Card C stops earning after €1,000 this month. Use Card A for the rest." | T-CALC-115 |
| M-03 | T bonus needs €300 (met by planned spend). FX-EXP-06: €500 more groceries in the window | Remaining €500 on T: 500 pts = **€5.00**. On B: 1,500 = **€15.00** | €500 → B (+€10.00). Buffer variant (€40 refund risk): T €340, B €460 | "Your bonus is covered. Card B earns 3× on the rest of your groceries." | T-ALLOC-116 |
| M-04 | Need 34,000 + 10% = 37,400. Usable 38,000. €600/month planned until LSBD | Goal met, so v_trip = 0. K = €3.00/month. Points cards: v_residual = 0, so €0. Variant with a later Avios use at €0.008: A = 200 pts = €1.60 < €3.00 | K | "Your trip is covered. We won't push for more points." | T-CALC-117 |
| M-05 | (a) Spend earns SUMA miles; trip award is Avios; no verified path. (b) Points post after LSBD (maximum delay) | ΔUsable = 0; surplus at v_residual = 0 | Best card for the trip programme, or cashback | "These points couldn't be used for this trip in time." | T-CALC-118 |
| M-06 | (a) €400/month × 6 months. (b) Moving €300 to U breaks T's bonus in progress. (c) 2 pts/€ at €0.006 vs 1 pt/€ at €0.012 | (a) U: 3,600 pts = €36.00 − €59.40 fees = **−€23.40**. A: 800 pts = **€8.00**. (b) U loses the €50 bonus. (c) Both €0.012 per €; the tie goes to the programme the trip needs (usable cap). | A (a); keep T (b); the trip programme (c) | "Card U's higher rate doesn't pay off after its €59.40 in fees." | T-CALC-119 |

Scope note for M-06(a), added in the audit: the fee counts only because U is a **new card or plan upgrade**. That is an M4 decision, so it is P0 engine and P1 UI. For a card already held with its fee committed, the attributable fee is 0 (doc 00 §7.5).

### 4.4 Reference scenario REF-01: the client consultation (Madrid → Johannesburg, Business) `[CLIENT-GUIDE]`

**Purpose.** This shows the engine on the community's own consultation example. Its cards and preferences are **this client's only** and are not defaults for anyone else.

**Data status.** All prices and availability are **ILLUSTRATIVE**. Neither the route operators nor the award prices were verified in this pass.

**Inputs (fixture FX-REF-01):**
- **Goal:** Business Class, MAD → JNB one-way, 1 adult. "Book within 90 days" gives a hard booking deadline at day 90, so LSBD = day 87. The travel window is days 120–200.
- **Programmes:** Iberia Club (account 2 years old), BA Club (2 years), Qatar Privilege Club (**opened 10 days ago, not linked to BA**).
- **Balances:** Revolut Ultra 60,000 RevPoints; Amex **Business** Platinum (Spain) 30,000 MR. No Avios yet.
- **Verified transfer paths:**
  - Revolut → Iberia, BA, Qatar at 1:1 (Revolut partner list).
  - Business MR → Iberia at 1:1 ("1 MR = 1 Iberia Avios", Business Platinum page). Business MR → BA is UNVERIFIED and not used.
  - Iberia → BA → Qatar by moving Avios. Needs BA ↔ Qatar linking and matching details. Accounts must be ≥ 30 days old; BA's terms say 90 days for Iberia (CONFLICTING), so the stricter reading applies.
- **Options (ILLUSTRATIVE):**
  - Cash business: **€3,200**.
  - **IB-ILL:** 80,000 Avios + €450.
  - **QR-ILL:** 85,000 Avios + €250.
- **Valuation:** v = €0.010.

**Expected calculation:**

| Option | Points needed | Buffered need (+10%, forecast) | Usable for this option | Affordability | EC | Example saving vs cash |
|---|---|---|---|---|---|---|
| IB-ILL | 80,000 | 88,000 | 60,000 (Revolut → Iberia) + 30,000 (MR → Iberia) = **90,000** | Yes (≥ buffered need) | 450 + 800 = **€1,250** | €1,950 (60.9%) |
| QR-ILL | 85,000 | 93,500 | 60,000 (Revolut → Qatar) + 30,000 (MR → Iberia → BA → Qatar, after linking and the account-age wait) = **90,000** | Maybe (≥ the price shown, < buffered need) | 250 + 850 = **€1,100** | €2,100 (65.6%) |

**Ranking and verdict:**
- **Goal B ranking:** QR-ILL first. The difference (€150) is more than the tolerance max(5% × €1,100, €25) = €55.
- **Verdict:** **`MONITOR_NO_TRANSFER`** for both options. No availability is live-verified, and the pairing is illustrative.

**Next actions, in order:**
1. Search live award seats on the Qatar and Iberia sites (Seats.aero or SeatSpy can help; CG-3).
2. Wait until the Qatar account is 30 days old (day 20). Under the stricter reading, any Iberia ↔ BA move needs 90 days, which is fine for these 2-year-old accounts.
3. Link Qatar ↔ BA, and check that name, date of birth and email match.
4. Only after the seat and price are confirmed: transfer, then book.

**Gap-fill variant REF-01b.** The live price for QR turns out to be 92,000. The gap is 2,000 points (2.2% ≤ 20%). A top-up is shown only if the user enters the purchase price, and only after the live check (REQ-REC-BUY-01).

**Explanation shown:** "Example saving (illustrative data): Qatar via BA looks cheapest (~€1,100 in economic terms vs €3,200 cash), but you'd have only 5,000 points to spare at the price shown. Check live seats first; don't transfer yet." The test is **T-CALC-024**.

### 4.5 Iberia Aire rule fixture (FX-CARD-AIRE): real terms, illustrative spend (audit)

**Terms (VERIFIED 26 Oct 2026, [iberiacards.es/wp/iberia-aire](https://www.iberiacards.es/wp/iberia-aire/)):**
- 1 Avios per €1 at Iberia and IAG airlines; 1 per €2 at Iberia Club partners; 1 per €3 elsewhere.
- "hasta un máximo de 1.000 € mensuales. A partir de este importe el resto de operaciones no acumularán Avios".
- Excluded sectors apply. Fee €5/month. Welcome 9,500 Avios at month 6 + 6,000 at month 18.

**Spend (ILLUSTRATIVE):** one calendar month with Iberia.com €200, partner €150, other €900, total €1,250.

| Reading | Calculation | Avios |
|---|---|---|
| (b) Restrictive: all spend shares €1,000; **order unknown** (category totals only), so the order-conservative case is used (the highest-rate spend falls past the cap) | Other €900 → 300; partner €100 → 50; Iberia.com €0 | **350** (drives verdicts) |
| (b) Restrictive, posting order known: Iberia → partner → other | 200 + floor(150/2) = 75 + floor(650/3) = 216 | **491** |
| (a) Only the 1-per-€3 rate is capped | 200 + 75 + floor(900/3) = 300 | **575** (sensitivity) |

**Expected output:** a band of 350–575 Avios, with the forecast using 350 and the label "Iberia Cards' terms are unclear about which purchases count toward the €1,000 limit". The test is **T-CALC-020**.

---

## 5. Fixture catalogue (all ILLUSTRATIVE unless marked)

| ID | Content |
|---|---|
| FX-CASH-01 | MAD→PEK return, economy, 1 adult, exact dates: **€780** all-in (base €520 + taxes €260) |
| FX-CASH-02 | Same route, date +2 days: **€702** |
| FX-CASH-03 | BCN→PEK: **€735**. User-entered train MAD↔BCN: **€60** |
| FX-CASH-04 | MAD→SCL one-way business: **€2,900** |
| FX-CASH-05 | Illustrative long-haul economy return: **€620** |
| FX-CASH-06 | Same as FX-CASH-01 with `price_changed` at order: **€702 → €719** (T-INT-004) |
| FX-CASH-07 | Offer with `conditions.refund_before_departure = null` (T-INT-010) |
| FX-AWARD-01 | Paired with FX-CASH-01: **50,000 + €320**, availability cached |
| FX-AWARD-02 | Paired with FX-CASH-04: **70,500 Avios** (Iberia chart band 8 off-peak business, VERIFIED, subject to change) + **€380** |
| FX-AWARD-03 | Paired with FX-CASH-05: **34,000 + €310** |
| FX-MULTI-01 | L1 MAD→PEK €520 / 25,000 + €160. L2 PEK→PVG €90. L3 PVG→MAD €540 / 25,000 + €170. Open-jaw L1 + L3 cash **€880** |
| FX-BAL-01 | No balances |
| FX-BAL-02 | 20,000 Avios |
| FX-BAL-03 | 120,000 Avios |
| FX-BAL-04 | 35,200 usable (6-month example) |
| FX-BAL-05 | MR 45,000 (issued ES) + Avios 12,000 |
| FX-BAL-06 | 38,000 usable; need 37,400 |
| FX-BAL-07 | 30,000 (CS-05) |
| FX-BAL-08 | Range bucket 20–50k |
| FX-CARD-T/A/B/C/D/K/M/U | As defined in sections 4.2 and 4.3 |
| FX-CARD-T2 | 3,000-point bonus for €300 in the same window as T (T-ALLOC-111) |
| FX-EXP-01…08 | €280 base · +€20 necessary · +€20 optional · {120, 90, 70} · €1,400 · €500 groceries · iPhone €1,200 (necessary, day 40) · €400/month × 6 |
| FX-WIN-01 | Bonus window: day 0–30 from approval |
| FX-WIN-02 | 6-month timeline (section 3.2) |
| FX-VAL | v ∈ {€0.008, €0.0088, €0.010, €0.012}; v_residual = 0 (default) |
| FX-RATE-01 | EUR/USD **1.1193**, dated 23 Oct 2026 (ECB reference rate, VERIFIED as published; used here only as a test snapshot) |
| FX-RULE-01 | Transfer graph: MR (ES) → Iberia 1:1, minimum 50, increment 1, up to 14 days. MR (NL) → Iberia 3:2. MR (ES) → Flying Blue 1:1, minimum 500, increment 5, about 5 working days. MR (ES) → Emirates: suspended. Avios moves 1:1, account ≥ 30 days (90 days BA ↔ Iberia per BA terms, CONFLICTING, so the stricter reading is used); BA as bridge; Qatar must be linked to BA; names, date of birth and email must match. Revolut → Iberia, BA, Qatar, Flying Blue and others 1:1. Business MR (ES) → Iberia 1:1 (others UNVERIFIED). All VERIFIED 26 Oct 2026 unless marked, subject to change. |
| FX-CARD-AIRE | Iberia Aire real earn terms (section 4.5), with illustrative spend |
| FX-CARD-REV | Revolut by plan and card type: debit (FAQ) Standard/Plus 1 per €10, Premium 1 per €4, Metal 1 per €2, Ultra 1 per €1; credit (credit-card page) Plus 1.5 per €10, Premium 1.5 per €4, Metal 1 per €1, Ultra 1.5 per €1. VERIFIED / VERIFIED-FAQ; the client guide's "credit only on Ultra" is CONFLICTING. |
| FX-REF-01 | Reference consultation scenario (section 4.4), ILLUSTRATIVE prices |
| FX-CASH-08 | Break-even with extras: cash all-in €580 + checked bag €40 = cashOut **€620**; award taxes €310 + bag €40 = cashOut **€350**; 34,000 points |
| FX-PRICE-01 | User-entered Avios purchase price €0.0213 per Avios (`USER_ENTERED`, not a verified price) |
| FX-FCST-01 | Category-total forecast on Iberia Aire: groceries €400 ("other"), restaurants €300 (partner? **Not sure**) |

---
## 6. Planned test catalogue

**How to read the table**
- **Columns:** ID · Req · Scenario · Pri · Preconditions / input · Action / event · Expected result · Expected message · Recovery · Pass/fail.
- **Mode:** all tests run in mock mode (`PROVIDER_MODE=mock`) unless they are marked **[INT]**. [INT] tests need an authorised integration.
- **Priority:** P0 tests are required for the hackathon delivery. P1 tests specify deferred features.

### 6.1 Functional (T-FUN)

| ID | Req | Scenario | Pri | Preconditions / input | Action / event | Expected result | Expected message | Recovery | Pass/fail |
|---|---|---|---|---|---|---|---|---|---|
| T-FUN-001 | REQ-BRF-01 | Quick Flight comparison | P0 | FX-CASH-01/02, FX-AWARD-01 | Search | Hero shows N, H, saving € and %, badge | "Save €78 (10.0%)" | — | All 4 values present and correct |
| T-FUN-002 | REQ-BRF-02 | Full Trip Plan per-leg and total | P0 | FX-MULTI-01 | Search | Per-leg table, trip total, chosen combination | "One open-jaw ticket…" | — | Totals match CS-05 |
| T-FUN-003 | REQ-BRF-03 | Hero for a large balance | P0 | CS-03 | Search with balance | €1,674 / 57.7% / cash −€2,520 | — | — | Exact values |
| T-FUN-004 | REQ-BRF-05 | Award steps generated | P0 | FX-AWARD-01 | Open steps | 6 ordered steps | — | — | Order and content correct |
| T-FUN-005 | REQ-BRF-05 | Test checkout **[INT: Duffel test]** | P0 | Duffel test token; ZZ offer | Confirm | One test order, reference shown | "Test booking confirmed – no real ticket" | Cancel test order | Exactly one order |
| T-FUN-006 | REQ-BRF-10, REQ-OWN-12 | Save trip, sign-in, total saved | P0 | Guest trip | Sign in, save | Trip saved once; total = sum of booked savings | "Saved" | Resend email | Count = 1; total correct |
| T-FUN-007 | REQ-BRF-08 | Wallet exact / range / unknown | P0 | FX-BAL-08, need 55,000 | Add range | Affordability = No | "Your range suggests not enough." | Add exact | Correct state |
| T-FUN-008 | REQ-OWN-11, REQ-OWN-02 | Add card from catalogue or custom; no card-number fields | P0 | Catalogue | Add | Card saved without any card-number, CVV or bank-login field | — | — | No such fields exist |
| T-FUN-009 | REQ-OWN-03 | Spending normalisation | P0 | €10/day; €70/week | Save | €304.17 and €303.33 per month | — | — | Exact cents |
| T-FUN-010 | REQ-OWN-04 | Planned purchases | P0 | `already_paid` item | Compute | Excluded from allocation | — | — | Not in ledger |
| T-FUN-011 | REQ-NFR-05 | Export and delete data | P0 | Signed-in user with data | Export, then delete | JSON export complete; delete cascades | "Your data has been deleted." | — | No rows remain |
| T-FUN-012 | REQ-RES-17, REQ-BRF-06 | Provenance badges | P0 | Mix of sources | Render | One badge per price | — | — | 0 or 2 badges = fail |
| T-FUN-013 | REQ-OWN-10 | Objective toggle | P0 | CS-04 | Toggle A/B | Ranking changes; both numbers shown | "€98 more overall" | — | Correct ranks |
| T-FUN-014 | REQ-RES-11 | "How we calculate and rank" page | P0 | Results | Click link | Page explains N, H, EC, valuation and ranking | — | — | Link present and page complete |
| T-FUN-015 | REQ-BRF-12 | Link / screenshot pre-fill | P2 | Pasted link | Parse | Fields pre-filled; each needs confirmation | "Check these details" | Edit | Nothing used before confirmation |
| T-FUN-016 | REQ-RES-01 | All-in price everywhere | P0 | FX-CASH-01 | Render list, grid, detail, reminder | €780 everywhere | — | — | Base fare never used as headline |
| T-FUN-017 | REQ-RES-04 | Infant award | P0 | 2 adults + 1 infant; Iberia award | Open steps | Phone step replaces online booking | "Infant award tickets must be booked by phone" | — | Online booking step absent |
| T-FUN-018 | REQ-RES-05 | Award traveller relationship | P0 | Non-beneficiary flying alone | Open steps | Beneficiary step before transfer | — | — | Order correct |
| T-FUN-019 | REQ-RES-08 | Transfer guard | P0 | Award steps | Try transfer first | Blocked | "Check the seat first – transfers can't be undone." | Do step 1 | Blocked |
| T-FUN-020 | REQ-RES-10 | Separate-ticket warning | P0 | Two-ticket itinerary | Render | Badge and text | "Separate tickets…" | Toggle | Present |
| T-FUN-021 | REQ-RES-12 | Quote log | P0 | Any saving | Inspect | Quote IDs and timestamps stored | — | — | Referenced |
| T-FUN-022 | REQ-RES-13, REQ-OWN-06 | Banned words | P0 | All result templates | Render | No "free", "guaranteed" or "will drop" | — | — | None found |
| T-FUN-023 | REQ-RES-14 | AI label | P0 if LLM enabled | LLM on | Render | Label present | "AI-generated explanation of calculated results" | — | Present on every AI text |
| T-FUN-024 | REQ-RES-15 | Cookie consent | P0 | First visit | Load page | No non-essential cookies | Consent banner (if analytics enabled) | Settings | None set before consent |
| T-FUN-025 | REQ-RES-16 | Card view compliance | P0 (P1 for M4) | Card with fee | Render | Credit warning; APR (TAE); no "advice", "approval odds" or affiliate link | — | — | All conditions hold |
| T-FUN-026 | REQ-RES-18 | Entry notice | P1 (static in P0) | Trip to China after 31/12/2026 | Render | Notice with official link | "Entry rules may change…" | — | Present |
| T-FUN-027 | REQ-REC-EXPL-01 | Explanation contract | P0 | Any recommendation | Validate | All 9 fields present, otherwise not displayed | — | Template fallback | Validator enforces |
| T-FUN-028 | REQ-REC-REJ-01 | Rejection scopes | P0 | Reject card for "this trip" | Compute another trip | Card may appear on the other trip, not on this one | "We won't suggest this again for this trip." | Undo | Scope respected |
| T-FUN-029 | REQ-REC-CONF-01 | Confidence levels | P0 | Stale rule; user override | Compute | Medium, with reason | "Terms may have changed" | Confirm | Level correct |
| T-FUN-030 | REQ-BRF-11 | Price alerts | P1 | Saved trip; threshold €700 | Quote €690 | One alert | "Price below €700" | — | Exactly one alert |
| T-FUN-031 | REQ-RES-19, REQ-BRF-03 | Illustrative-data wording | P0 | CS-01 in demo mode (LIVE-TEST cash + ILLUSTRATIVE award) | Render hero | "Example saving (illustrative data)"; confidence "Illustrative"; pairing label | "Example saving (illustrative data)" | — | No "You save", no "real", no High |
| T-FUN-032 | REQ-RES-20 | Avios move preconditions | P0 | REF-01: Qatar 10 days old, not linked; mismatched email variant | Open award steps | Link step; "wait until [day 20]"; details-mismatch block | "Link your Qatar and BA accounts first." / "Your details must match…" | Fix / wait | Transfer step blocked until all preconditions are met |
| T-FUN-033 | REQ-REC-CAT-01 | Catalogue aliases and status | P0 | Search "Iberia Icon Aire", "Zenit Gold", "Revolut Ultra" | Search | Canonical products found (Iberia Aire, Iberia Zenit, Revolut + plan picker); status badges; unverified fields listed; Revolut conflict note | — | — | All three resolve; statuses correct |
| T-FUN-034 | REQ-NFR-10 | Localisation readiness | P0 | String catalogue; locale switch (test only) | Render | No hard-coded UI strings; € format follows the locale; Spanish programme names kept | — | — | Lint/scan finds no inline copy |

### 6.2 Validation and boundaries (T-VAL)

| ID | Req | Scenario | Pri | Input | Action | Expected result | Message | Recovery | Pass/fail |
|---|---|---|---|---|---|---|---|---|---|
| T-VAL-001 | REQ-BRF-01 | Origin = destination; ambiguous city | P0 | MAD→MAD; "Santiago" | Submit | Error; disambiguation list | "Origin and destination must differ." / "Which Santiago?" | Edit | No search runs |
| T-VAL-002 | REQ-BRF-01 | Past date in airport local time | P0 | Today − 1 (MAD time) | Submit | Error | "That date has passed in Madrid." | Edit | Blocked |
| T-VAL-003 (corrected) | REQ-OWN-01, REQ-RES-21 | No universal horizon limit | P0 | +400 and +500 days | Submit | Accepted (no validation error). Award `ESTIMATED_RELEASE_WINDOW` (or `UNKNOWN_AVAILABILITY`); cash `NOT_YET_SEARCHABLE` if beyond the provider horizon | "Award seats usually open around [date] (estimate, not confirmed)." | Reminder | Accepted, with correct states |
| T-VAL-004 | REQ-BRF-01 | Return before departure | P0 | Return < depart | Submit | Error | "Return must be after departure." | Edit | Blocked |
| T-VAL-005 | REQ-RES-03 | Infants exceed adults | P0 | 1 adult + 2 infants | Submit | Error | "Each infant needs an adult." | Edit | Blocked |
| T-VAL-006 | REQ-RES-03 | Child age required; age on last flight | P0 | Child without age; child turning 2 before return | Submit | Age required; type computed at last flight | "Add the child's age." | Enter age | Correct |
| T-VAL-007 | REQ-BRF-01 | More than 9 passengers | P0 | 10 | Submit | Error (AS-08) | "Up to 9 travellers per search." | Split | Blocked |
| T-VAL-008 | REQ-BRF-02 | More than 6 legs; overlapping legs | P0 | 7 legs; leg 2 departs before leg 1 arrives | Submit | Errors | "Up to 6 flights…" / "Flight 2 leaves before flight 1 lands." | Edit | Blocked |
| T-VAL-009 | REQ-BRF-08 | Invalid balance | P0 | −5, "abc", 1e12 | Save | Error | "Enter a whole number of points." | Edit | Rejected server-side |
| T-VAL-010 | REQ-OWN-03 | Spending bounds | P0 | Negative amount; > €100,000/month | Save | Error / confirm | "Please check this amount." | Edit | Rejected / confirm required |
| T-VAL-011 | REQ-OWN-13 | Reserve required in M3 | P0 | Empty reserve | Compute | Blocked | "Enter a minimum cash reserve to plan ahead." | Enter | Blocked |
| T-VAL-012 | REQ-BRF-07 | Flex caps; non-Spain country | P0 | Cash ±7; country FR | Submit | Capped at ±3 for cash; Spain-only notice | "Cash search supports up to ±3 days." | — | Capped |
| T-VAL-013 | REQ-NFR-07 | Currency precision | P0 | €10.999 | Save | Error | "Use at most 2 decimals." | Edit | Rejected |

### 6.3 Calculations (T-CALC)

| ID | Req | Scenario | Pri | Input | Action | Expected result | Message | Recovery | Pass/fail |
|---|---|---|---|---|---|---|---|---|---|
| T-CALC-001 | REQ-BRF-04 | EC formula | P0 | €160 + 25,000 × €0.010, no fees | Compute | EC = €410.00 | — | — | Exact cents |
| T-CALC-002 | REQ-BRF-04 | % rounding half away from zero | P0 | €24.70 / €200.00; €1,674 / €2,900 | Compute | 12.4%; 57.7% | — | — | Exact |
| T-CALC-003 | REQ-REC-VAL-01 | Break-even valuation | P0 | CS-04 | Compute | v* = €0.0091 | "Worth it above €0.0091 per point" | — | 4 decimals |
| T-CALC-004 | REQ-BRF-07 | CS-01 flex saving | P0 | CS-01 | Compute | €78 / 10.0%; BCN €795 rejected | "Fly 2 days later" | — | Exact |
| T-CALC-005 (corrected) | REQ-BRF-08 | CS-02 partial points | P0 | CS-02 | Compute | Award "not bookable"; gap 5,000; H = cash €520; hypothetical award EC €410 labelled "if the gap were covered"; no top-up unless CS-02b conditions are met | "Not bookable with your current points: you have 20,000 of the 25,000 needed…" | Plan ahead / gap-fill after seat confirmed | Text never says "Points would save"; H is cash |
| T-CALC-006 | REQ-BRF-03 | CS-03 large balance | P0 | CS-03 | Compute | €1,226 EC; €1,674; 57.7%; −€2,520 cash | — | — | Exact |
| T-CALC-007 | REQ-BRF-02, REQ-REC-MULTI-01 | CS-05 shared pool | P0 | CS-05 | Compute | Open-jaw €970 chosen; €920 combination rejected with reason; saving €0.00 | "Needs 50,000 points; you have 30,000." | — | Exact |
| T-CALC-008 | REQ-NFR-10 | FX conversion | P0 | USD 100.00 @ 1.1193 (FX-RATE-01) | Compute | €89.34, rate date shown | — | — | Exact |
| T-CALC-009 | REQ-REC-VAL-01 | Break-even-only valuation mode | P0 | Valuation = none | Compute | No EC ranking for award; v* shown | "Worth it if you value points above…" | Set value | No assumed v |
| T-CALC-010 | REQ-RES-07 | Country ratios; suspended path; family pool | P0 | MR 45,000 ES / NL; Emirates; pooled Avios | Compute | 45,000 / 30,000; suspended; pool not transferable | — | — | Exact |
| T-CALC-011 | REQ-RES-07 | Minimum, increment and account-age rules | P0 | Flying Blue 12,503; 499; Avios account age 20 days | Compute | 12,500; 0; blocked until day 30 | — | — | Exact |
| T-CALC-012 | REQ-OWN-10 | Goal A vs B | P0 | CS-04 | Rank | Goal A: award first; Goal B: cash first | "€98 more overall" | — | Ranks correct |
| T-CALC-013 | REQ-OWN-07 | Hard constraints; premium trade-off | P0 | Hard date + €200 cheaper next day; business preferred +62,000 points | Rank | Off-date not recommended; trade-off sentence shown | "Business uses 62,000 more points…" | Toggle "show what I'm missing" | Correct |
| T-CALC-014 | REQ-BRF-04 (AS-13) | Rewards earned by cash ticket | P1 | CS-04 + cash earns 1,500 Avios (user-entered) at €0.010 | Compute | EC(cash) = €605; still beats €718 | — | — | Exact |
| T-CALC-015 | REQ-REC-RULE-01 | Unknown rounding uses `floor`; wallet/marketplace exclusion | P0 | 1 per €3 on €100 | Compute | 33 points; marketplace spend at base rate | "Estimated – rounding not published." | Override | Exact |
| T-CALC-016 | REQ-REC-RULE-01 | Hard-stop cap | P0 | Card C €1,200 in month | Compute | 2,000 points (nothing above €1,000) | — | — | Exact |
| T-CALC-017 | REQ-REC-RULE-01 | Threshold step (P1) | P1 | €19,000/yr at 1 per €3, then 1 per €10 above €18,000 | Compute | 6,000 + 100 = 6,100 | "Confirm calendar vs card year" | Confirm | Exact |
| T-CALC-018 | REQ-REC-RULE-01 | Maximum posting / transfer delay used | P0 | Bonus up to 180 days; transfer up to 14 days | Compute AFD | Maximums used | — | — | Exact dates |
| T-CALC-019 | REQ-REC-RULE-01 | Conflicting sources use the restrictive reading | P0 | Two offer versions | Compute | Stricter terms used; banner | "Offer terms differ – using the stricter one." | User selects offer | Correct |
| T-CALC-020 | REQ-REC-RULE-01 | Iberia Aire categories + ambiguous cap | P0 | FX-CARD-AIRE (section 4.5) | Compute | Conservative 350; known-order 491; sensitivity 575; band shown | "Iberia Cards' terms are unclear…" | Confirm with issuer | Exact values |
| T-CALC-021 | REQ-REC-FCST-01 | Forecast granularity labelling | P0 | FX-FCST-01 | Forecast | Conservative: floor(400/3) = 133 + floor(300/3) = 100 = **233**/month; upper if restaurants are partners: 133 + 150 = **283**; labelled ESTIMATE; verdict uses 233 | "Estimate – actual points depend on individual purchases." | Answer Q-SPEND-02b | Exact; band shown; verdict uses conservative |
| T-CALC-022 | REQ-BRF-04 | Break-even not double-counting extras | P0 | FX-CASH-08 | Compute | v* = (620 − 350) / 34,000 = **€0.0079**. The pre-audit formula would give €0.0068, which is wrong. | — | — | €0.0079 |
| T-CALC-023 | REQ-REC-BUY-01 | CS-02b gap-fill | P0 | CS-02b; boundary 20.0%; variant gap 21% | Compute | EC €466.50, saving €53.50 (10.3%); shown after the live-check step. Variant (> 20%) not shown. Variant with no price entered: not shown. | CS-02b copy | — | Exact; boundary respected |
| T-CALC-024 | REQ-REC-CAT-01, REQ-RES-20 | REF-01 consultation scenario | P0 | FX-REF-01 | Compute | IB-ILL 90,000 usable (Yes), EC €1,250; QR-ILL 90,000 usable (Maybe), EC €1,100; Goal B QR first; `MONITOR_NO_TRANSFER`; ordered next actions; "Example saving" labels | §4.4 copy | — | Exact values and order |
| T-CALC-025 | REQ-REC-CARD-02 | Baseline naming | P0 | S-01, S-04, S-06 | Compute | Each displayed ΔB states its baseline ("compared with how you pay today" / "compared with the best use of your other cards") | — | — | Baseline label present and correct |
| T-CALC-026 | REQ-REC-MARG-04 (doc 00 §7.6) | Need buffer only for forecasts | P0 (engine; live data P2) | Simulated `VERIFIED_RESULT` price 85,000; usable 90,000 | Compute | Need = 85,000 exact, so affordable. With an illustrative price, buffered need 93,500 → "Maybe" | — | — | Both branches |
| T-CALC-101 | REQ-REC-CARD-01 | S-01 (plus S-05, S-07 variants) | P0 | S-01 | Compute | ΔB €1.87; bonus 0 | S-01 copy | — | Exact; no extra-spend text |
| T-CALC-103 | REQ-REC-CARD-03, REQ-OWN-000 | S-03 | P0 | S-03 | Compute | G1 rejects; same as S-01 | S-03 copy | — | Never recommended |
| T-CALC-104 | REQ-REC-CARD-04 | S-02b; fee rules | P0 | S-02b; monthly-billed fee; revolving-only waiver | Compute | −€8.00; per-month fee; waiver not counted | S-02b copy | — | Exact |
| T-CALC-106 | REQ-REC-VAL-01 | CS-04 | P0 | CS-04 | Compute | EC €718 vs €620; cash first (Goal B) | "Cash is better by €98" | — | Exact |
| T-CALC-108 | REQ-REC-CARD-06 | S-13 | P0 | S-13 | Compute | Removed; reason stored; recompute | S-13 copy | — | Correct |
| T-CALC-110 | REQ-REC-DATA-01 | R3 + R5 | P0 | No spending; unknown balance | Compute | Affordability Unknown; no forecast; break-even shown | "Add your balance any time…" | Add data | Correct |
| T-CALC-113 | REQ-REC-RES-01 | Reserve breach | P0 | S-11; T-REG-107 data | Compute | Flagged; strategy rejected or approval required | "Below your €1,500 safety reserve" | Edit | Correct |
| T-CALC-114 | REQ-REC-MARG-01 | M-01 | P0 | M-01 | Allocate | X = €22.10 chosen | M-01 copy | — | Exact; X chosen |
| T-CALC-115 | REQ-REC-MARG-02 | M-02 | P0 | M-02 | Allocate | Split €21.33 | M-02 copy | — | Exact |
| T-CALC-117 | REQ-REC-MARG-04 | M-04 | P0 | M-04 | Allocate | K chosen; €3.00/month; variant €1.60 < €3.00 | "Your trip is covered…" | — | Exact |
| T-CALC-118 | REQ-REC-MARG-05 | M-05 | P0 | M-05 (a), (b) | Allocate | ΔUsable = 0; routed elsewhere | M-05 copy | — | Exact |
| T-CALC-119 | REQ-REC-MARG-06 | M-06 | P0 | M-06 (a), (b), (c) | Allocate | A (−€23.40 vs €8.00); keep T; trip programme | M-06 copy | — | Exact |

### 6.4 Allocation integrity (T-ALLOC)

| ID | Req | Scenario | Pri | Input | Action | Expected result | Message | Recovery | Pass/fail |
|---|---|---|---|---|---|---|---|---|---|
| T-ALLOC-001 | REQ-REC-INV-01 | INV-1 | P0 | One expense, two cards | Allocate | Exactly one allocation per expense-month | — | — | Unique |
| T-ALLOC-002 | REQ-REC-INV-01 | INV-2 | P0 | Same offer in two plans | Compute both | Bonus counted once per user | — | — | Once |
| T-ALLOC-003 | REQ-REC-INV-01 | INV-3 | P0 | Fee in horizon; two strategies | Compute | Fee once | — | — | Once |
| T-ALLOC-004 | REQ-REC-INV-01 | INV-4 | P0 | 40,000 points; two trips need 30,000 each | Compute | Priority prompt; committed once | "Which trip should use these points first?" | Set priority | Sum committed ≤ 40,000 |
| T-ALLOC-005 | REQ-REC-INV-01 | INV-5 | P1 | Transfer bonus | Compute twice | Applied once per transfer | — | — | Once |
| T-ALLOC-006 | REQ-REC-INV-01 | INV-6; negative balance | P0 | Refund after posting | Event | Negative entry; replan; usable = max(0, balance) | — | — | Entry exists |
| T-ALLOC-007 | REQ-OWN-03 | INV-7; duplicates | P0 | Groceries entered daily and monthly | Save | Prompt; one used | "Is this the same expense?" | Merge | One category value |
| T-ALLOC-008 | REQ-REC-INV-01 | Payment preferences; non-card expenses; credit limit | P0 | "Never Card X for rent"; rent by transfer; limit €1,000 | Allocate | Constraints respected | "This exceeds the limit you entered." | — | No violation |
| T-ALLOC-102 (corrected) | REQ-REC-CARD-02 | S-04 | P0 | S-04 (baseline {T €280, A €20}) | Allocate | A → T move of the €20 recorded; A gives up 6 points (€0.06); **ΔB_change = €50.14** | S-04 copy | — | Exact; one allocation; baseline named |
| T-ALLOC-111 | REQ-REC-CARD-08 | S-06; competing bonuses | P0 / P1 | S-06; T and T2 both need €300, planned €400 | Allocate | €44.00; T chosen (€50 > €30); T2 reason recorded | "€400 planned can't meet both €300 thresholds." | — | Exactly one bonus |
| T-ALLOC-116 | REQ-REC-MARG-03 | M-03 | P0 | M-03 (+ buffer variant) | Allocate | €500 → B; variant T €340 / B €460 | M-03 copy | — | Exact |

### 6.5 Timeline and book now vs wait (T-TIME)

| ID | Req | Scenario | Pri | Input | Action | Expected result | Message | Recovery | Pass/fail |
|---|---|---|---|---|---|---|---|---|---|
| T-TIME-001 | REQ-OWN-05 | V1 | P0 | FX-WIN-02, v = €0.012 | Compute | `CASH_BETTER_THAN_AWARD`; v* €0.0092 | §3.1 copy | — | Outcome |
| T-TIME-002 | REQ-OWN-05 | V2, V8; tight deadline | P0 | V2; V8 | Compute | `INSUFFICIENT_BY_DEADLINE` | §3.1 copy | Book cash | Outcome |
| T-TIME-003 | REQ-OWN-05 | V3, V5 | P0 | V3; V5 | Compute | V3 `WAIT_ACCUMULATE` + revisits; V5 `BOOK_CASH_NOW` | §3.1 copy | — | Outcomes |
| T-TIME-004 | REQ-OWN-05 | V4 cheaper cash in month 3 | P0 | V3 + €690 on day 90 | Event | `BOOK_CASH_NOW` | "Cash dropped to €690 – book cash now." | Book | Outcome |
| T-TIME-005 | REQ-OWN-05 | V7a cached availability | P0 | V7a | Compute | `MONITOR_NO_TRANSFER` | §3.1 copy | Live check | Outcome |
| T-TIME-006 | REQ-OWN-05, REQ-OWN-06 | V6 near tie, low confidence | P0 | V6 | Compute | `TOO_UNCERTAIN`; scenario labelled "assumption, not a forecast" | §3.1 copy | Refresh | Outcome and label |
| T-TIME-007 | REQ-OWN-05 | V7b verified | P0 | V7b | Compute | `BOOK_AWARD_NOW` with re-check step | §3.1 copy | — | Outcome |
| T-TIME-008 | REQ-RES-09 | Expiry before trip; unregistered card Avios | P0 | Avios inactive 34 months, departure +4 months | Compute | Warning; surplus after expiry | "Your Avios may expire on [date]." | Activity | Correct |
| T-TIME-009 | REQ-NFR-10 | Time zones / DST | P0 | Departure 00:30 local, DST change week | Compute | Dates stored airport-local; LSBD day count correct | — | — | Exact dates |
| T-TIME-010 | REQ-OWN-01 | 12-month trip; release date | P0 | V9 | Compute | Release ≈ day 5 (estimated) + reminder 7 days before | "Estimated" | .ics | Correct |
| T-TIME-011 | REQ-BRF-11 | Revisit reminders deduplicated (.ics / in-app) | P0 | Two recomputes, same revisit | Event | One reminder per dedupe key | — | — | One |
| T-TIME-012 | REQ-RES-21, REQ-OWN-01 | V10: 500-day trip, nothing searchable | P0 | V10 | Compute | `TOO_UNCERTAIN`; estimated release reminder; no `BOOK_*`; no `WAIT_ACCUMULATE` (no cash quote) | "Too early to compare prices…" | Reminder | Outcome and states |
| T-TIME-105 (corrected) | REQ-REC-CARD-05 | S-09 | P0 | S-09 | Compute | Bonus adds 0 usable points; ΔB = €2.00; ΔResidual shown separately and not in ΔB | S-09 copy | — | Exact |
| T-TIME-112 | REQ-REC-TIME-01 | Missed bonus deadline | P0 | §3.2 missed-bonus case | Event | WAIT → `BOOK_CASH_NOW` | "You missed the bonus deadline…" | Book cash | Outcome change |

### 6.6 Replanning and regression (T-REG)

| ID | Req | Scenario | Pri | Input | Action | Expected result | Message | Recovery | Pass/fail |
|---|---|---|---|---|---|---|---|---|---|
| T-REG-001 | REQ-OWN-08 | R-EV-01 generic purchase | P0 | Approved plan + €300 necessary purchase | Event | Draft; What-changed card | doc 01 §6 | Accept / keep | Approved plan unchanged until accepted |
| T-REG-002 | REQ-OWN-08 | R-EV-02 refund (S-10) | P0 | S-10 | Event | Negative entry; bonus at risk | S-10 copy | Review | Correct |
| T-REG-003 | REQ-OWN-08 | R-EV-03 spending change | P0 | Groceries −€100/month | Event | AFD later | doc 01 §6 | — | Correct |
| T-REG-004 | REQ-OWN-08 | R-EV-04 balance update to goal met | P0 | Balance → 56,000 | Event | Goal-met routing; verdict change | "We've stopped chasing points" | — | Correct |
| T-REG-005 | REQ-OWN-08 | R-EV-05 remove card with bonus in progress; MR forfeiture | P0 | Remove T | Event | −€50 warning; MR loss warning | doc 01 §6 | Cancel | Warning shown |
| T-REG-006 | REQ-OWN-08 | R-EV-06 reject card | P0 | Reject | Event | Recompute without product | — | Undo | Correct |
| T-REG-007 | REQ-OWN-08 | R-EV-07 terms change / reused URL | P1 | New snapshot | Event | Affected options recomputed; history kept | — | — | Correct |
| T-REG-008 | REQ-OWN-08, REQ-BRF-02 | R-EV-08 destination/cabin change; leg edit preserves others | P0 | Change leg 2 | Event | Legs 1/3 and approvals preserved | — | — | Preserved |
| T-REG-009 | REQ-OWN-08 | R-EV-09 move dates | P0 | +14 days | Event | LSBD/AFD recomputed | — | — | Correct |
| T-REG-010 | REQ-OWN-08 | R-EV-10 reserve change | P0 | Reserve €2,000 | Event | Pull-forward strategies removed | — | — | Correct |
| T-REG-011 | REQ-OWN-08 | R-EV-11 booking | P0 | Leg 1 booked (test) | Event | Leg protected; rest replanned | "Leg 1 booked – planning the rest" | — | Protected |
| T-REG-012 | REQ-OWN-08 | R-EV-12 award lost after transfer | P0 | Award unavailable | Event | Alternatives in destination programme + cash | EC-OPT-03 copy | — | Correct |
| T-REG-013 | REQ-OWN-08 | R-EV-13 offer expired | P0 | Offer expiry | Event | Strategy removed | S-13 copy | — | Correct |
| T-REG-014 | REQ-OWN-08 | R-EV-14 slow transfer | P0 | No arrival after 5 working days | Event | Timeline update; LSBD margin shown | doc 01 §6 | Contact programme | Correct |
| T-REG-015 | REQ-NFR-07 | Determinism; approved versions immutable | P0 | Same inputs twice | Compute | Identical results; approved version unchanged | — | — | Byte-equal results |
| T-REG-016 | REQ-OWN-08 | Concurrent edits; duplicate jobs | P0 | Two tabs; same job twice | Events | One draft re-based; job no-op | "This plan changed in another tab" | Reload | One draft; no duplicate |
| T-REG-017 | REQ-REC-FCST-01 | Actual posted rewards replace estimates | P0 (manual) / P1 (variance prompt) | T-CALC-021 forecast (233 for month 1); user records 260 actual | Event R-EV-04 | Month 1 = 260 (actual); months 2+ re-projected from the actual balance; What changed shows "+27 vs estimate" | "Card posted 260 points (we estimated 233)." | — | Estimate replaced; no double count |
| T-REG-107 | REQ-REC-REPLAN-01 | iPhone €1,200 (day 40) on V3 | P0 | V3; reserve €1,500; cash day 40 €2,400 | Add purchase | Draft: reserve dips to €1,200 (breach €300) → approval required; usable +1,200; AFD day 149 → ~day 141; verdict still WAIT but flagged | "With the iPhone, your cash dips to €1,200 in [month], below your €1,500 reserve." | Move date if movable / change reserve / accept | All deltas shown; approved plan kept |
| T-REG-120 | REQ-OWN-000 (INV-8) | Objective-neutrality property | P0 | Generated allocations (all M-cases + random) | Score | Adding zero-MV spend never raises the score. Chosen allocation scores ≥ all-on-one-card and ≥ highest-nominal-rate. Heuristic results labelled. | — | — | Property holds on every input |

### 6.7 User flows (T-FLOW): end-to-end browser tests

| ID | Flow / Req | Scenario | Pri | Expected path | Pass/fail |
|---|---|---|---|---|---|
| T-FLOW-001 | F01, REQ-OWN-09 | First-time cash flight (guest) | P0 | Landing → essentials → hero → detail → test checkout (mock) | Completes; values match CS-01 |
| T-FLOW-002 | F02 | Existing points | P0 | Results → wallet → personalised → award steps | CS-04 behaviour |
| T-FLOW-003 | F03 | Multiple currencies | P0 | Wallet with MR and Avios → award | Never summed; path labelled |
| T-FLOW-004 | F04 | New-card exploration | P1 | Opt in → comparison → decline | S-02b shown; decline stored |
| T-FLOW-005 | F05, REQ-OWN-09 | Refuse all new cards | P0 | Settings → never suggest | No card suggestions anywhere |
| T-FLOW-006 | F06 | No spending info | P0 | Plan ahead → skip spending | No forecast; verdict from current points |
| T-FLOW-007 | F07 | 12-month trip | P0 | Plan ahead +365 days | Timeline with estimated release |
| T-FLOW-008 | F08 | Flex dates and airports | P0 | ±2 days, BCN + train | MAD recommended; BCN "+€15" |
| T-FLOW-009 | F09 | Multi-city | P0 | 3 legs with balance 30,000 | CS-05 result |
| T-FLOW-010 | F10 | Plan depends on accumulation | P0 | V3 | `WAIT_ACCUMULATE` with revisits |
| T-FLOW-011 | F11 | iPhone added | P0 | Add purchase → What changed → accept | T-REG-107 values |
| T-FLOW-012 | F12 | Expiry / deadline change | P0 | Expiry warning | Warning + replan |
| T-FLOW-013 | F13 | Better fare / award lost | P0 | V4; R-EV-12 | `BOOK_CASH_NOW` / alternatives |
| T-FLOW-014 | F14 | Cash after rejecting award | P0 | Reject award → cash checkout | Re-priced offer; award not recommended |
| T-FLOW-015 | F15 | External award booking | P0 | Steps 1–6 incl. infant and beneficiary branches | Guards enforced; outcome recorded |
| T-FLOW-016 | F16 | Return to trip | P0 | Saved trip opened after 10 days | Ages and stale labels shown |
| T-FLOW-017 | REQ-OWN-12 | Guest → account migration | P0 | Guest trip → sign in (twice from two browsers) | Single copy; merge prompt |
| T-FLOW-018 | EC-ONB-06, EC-TECH-14 | Resume after leaving / lost session | P0 | Close mid-flow → return | Draft restored |
| T-FLOW-109 | REQ-REC-CARD-07 | Decline all new cards | P0 | Decline "all trips" | No reappearance; identical to M4-off run |
| T-FLOW-121 | REQ-REC-BONUS-01 | S-02c goal met | P0 | Balance ≥ need; welcome offer exists | "Not needed for this trip" |

### 6.8 Integration and failure (T-INT)

| ID | Req | Scenario | Pri | Input | Expected result | Message | Pass/fail |
|---|---|---|---|---|---|---|---|
| T-INT-001 | REQ-BRF-06 | Provider timeout | P0 | Mock adapter delays 11 s | Partial results + retry | "Some prices took too long. Retry" | ≤ 12 s to partial |
| T-INT-002 | REQ-NFR-08 | HTTP 429 | P0 | Mock 429 | Backoff; cached labelled | "Too many searches…" | No crash; labelled |
| T-INT-003 | REQ-RES-02 | Expired offer | P0 | `offer_expired` | New search | "This price expired." | No retry of same offer |
| T-INT-004 | REQ-RES-02 | `price_changed` | P0 | FX-CASH-06 | Re-confirm at €719 | "Price changed from €702 to €719." | Confirmation required |
| T-INT-005 | REQ-BRF-05 | `offer_no_longer_available` | P0 | Mock error | Back to results | "This flight is no longer available." | Handled |
| T-INT-006 | REQ-NFR-10 | FX source failure | P0 | No rate | Original currency shown; last snapshot ≤ 7 days old used, labelled | "Can't convert right now" | Never a guessed rate |
| T-INT-007 | REQ-BRF-06 | Partial providers | P0 | Award adapter fails | Cash shown; award missing flagged | "Award prices unavailable right now" | Flagged |
| T-INT-008 | REQ-RES-01 | Contradictory or differing data | P0 | total ≠ base + tax; two sources differ | Provider total used; breakdown "not available"; lowest bookable chosen | "Price breakdown not available." | Correct |
| T-INT-009 | REQ-NFR-06 | No Duffel token | P0 | Env missing | Mock mode automatically, labelled | "Demo data – illustrative." | Full journey works |
| T-INT-010 | REQ-RES-06 | Null conditions **[INT-capable]** | P0 | FX-CASH-07 | "Unknown" state | "Refund rules unknown" | Three-state shown |

### 6.9 Security and authorisation (T-SEC)

| ID | Req | Scenario | Pri | Expected result | Pass/fail |
|---|---|---|---|---|---|
| T-SEC-001 | REQ-NFR-04 | User A requests User B's trip, wallet or plan by ID | P0 | Not found; no data leak | Zero rows returned |
| T-SEC-002 | REQ-OWN-11 | Card number (Luhn-valid 16 digits) or CVV-like input in any field | P0 | Rejected: "Please don't enter card numbers." | Never stored |
| T-SEC-003 | REQ-NFR-04 | Client bundle scanned for secrets | P0 | No provider or LLM keys in client assets | None found |
| T-SEC-004 | REQ-NFR-08 | Search rate limit (about 10/min/user or IP, AS-21) | P0 | 11th request limited | Limited with message |
| T-SEC-005 | REQ-NFR-04 | Server-side validation bypass | P0 | Malformed payloads rejected | All rejected |
| T-SEC-006 | REQ-NFR-05 | Delete account with pending reminders | P0 | Reminders cancelled; data gone | None remain |
| T-SEC-007 | REQ-NFR-09 | Logs | P0 | No balances, spending, emails or passenger data in logs | None found |
| T-SEC-008 | REQ-REC-EXPL-01, REQ-RES-14 | LLM output introduces a number or entity not in the explanation object | P0 | Rejected; template used | Validator blocks |
| T-SEC-009 | REQ-BRF-05 | Double-submit booking; DB write retry | P0 | One order; idempotent | Exactly one |

### 6.10 Accessibility, responsive, demo

| ID | Req | Scenario | Pri | Pass/fail |
|---|---|---|---|---|
| T-A11Y-001 | REQ-NFR-02 | axe scan on every P0 page | P0 | No serious or critical violations |
| T-A11Y-002 | REQ-NFR-02 | Keyboard-only Quick Flight to checkout | P0 | Completes with visible focus |
| T-A11Y-003 | REQ-BRF-03 | Savings and badges are not colour-only | P0 | Text and icons convey meaning |
| T-A11Y-004 | REQ-NFR-02 | `prefers-reduced-motion` | P0 | No non-essential animation |
| T-RESP-001 | REQ-BRF-06 | 360 px | P0 | No horizontal scroll; hero visible above the fold |
| T-RESP-002 | REQ-BRF-06 | 768 px | P0 | Layout intact |
| T-RESP-003 | REQ-BRF-06 | 1280 px | P0 | Layout intact |
| T-RESP-004 | REQ-BRF-06 | Long airport names, 7-digit points, €10,000+ | P0 | No overflow or truncation of numbers |
| T-DEMO-001 | REQ-RES-17 | Demo mode deterministic and labelled | P0 | Same output on every run; ILLUSTRATIVE badges |
| T-DEMO-002 | REQ-BRF-05 | Duffel test booking in demo **[INT]** | P0 | Test order shown with "no real ticket" |
| T-DEMO-003 | REQ-NFR-06 | No live data at all | P0 | All 3 demo journeys complete |
| T-DEMO-004 | Brief B-8 | 3-minute script path: Quick Flight saving → Full Trip Plan → why → plan ahead | P0 | Each step renders in under 3 s in mock mode |
| T-DEMO-005 | REQ-RES-19 | Demo copy and script claim check | P0 | No "real price", "real saving", "you will save" or "guaranteed" anywhere in UI copy or the demo script; every saving labelled illustrative |

---

## 7. Fixtures vs authorised integration

| Area | Deterministic fixtures (CI) | Needs authorised integration later | Status today |
|---|---|---|---|
| Savings engine, valuation, rounding, FX maths | ✓ all T-CALC | — | Fixtures only |
| Allocation, gates, invariants, P-01 | ✓ all T-ALLOC, T-REG-120 | — | Fixtures only |
| Timeline / book now vs wait | ✓ T-TIME | Live price history (P2) | Fixtures only |
| Cash search | ✓ mock adapter | Duffel test (available now); real market prices (none authorised) | Duffel test token: owner to create |
| Cash booking | ✓ mock | Duffel test orders (T-FUN-005, T-DEMO-002); live booking needs Duffel KYC (not planned) | Test only |
| Award availability | ✓ fixtures | Seats.aero (non-commercial), AwardTool / point.me (approval needed) | **Not authorised; mock only** |
| Balances | ✓ user-entered | AwardWallet business API (P2) | Manual only |
| Card terms | ✓ catalogue snapshots (re-verified 26 Oct 2026 audit: Iberia Aire, Zenit, Revolut, Amex Business Platinum, Vueling) | Periodic re-verification (manual); GAP-15 to GAP-19 | Snapshots 26 Oct 2026 |
| Price provenance | ✓ all prices are LIVE-TEST or ILLUSTRATIVE; savings labelled "Example" | Real market data (P2 agreements) | No real prices in the hackathon (REQ-RES-19) |
| FX rates | ✓ FX-RATE-01 | ECB via Frankfurter (no key) | Optional |
| Auth and isolation | Local test project | Hosted free-tier auth project | Owner to create |
| LLM explanations | ✓ validator with stub | Provider key (optional) | Off by default |

---

## 8. Requirements-to-tests traceability

| Requirement | Edge cases | Tests | Flows |
|---|---|---|---|
| REQ-OWN-000 (P-01) | EC-SPD-10, EC-MARG-01–06, EC-ALLOC-11 | T-REG-120, T-CALC-103, T-CALC-114–119, T-ALLOC-116 | F10, F11 |
| REQ-BRF-01 | EC-TRIP-01, 02, 13, 14 | T-FUN-001, T-FLOW-001, T-VAL-001, 002, 004, 007 | F01 |
| REQ-BRF-02 | EC-TRIP-03, 05, 07, 20; EC-OPT-09, 18 | T-FUN-002, T-FLOW-009, T-CALC-007, T-VAL-008, T-REG-008 | F09 |
| REQ-BRF-03 | EC-OPT-01, 12, 22 | T-FUN-003, T-FUN-031, T-CALC-006, T-CALC-106, T-A11Y-003, T-RESP-001–004 | F01, F02 |
| REQ-BRF-04 | — | T-CALC-001, 002, 004, 022, T-FUN-027 | F01 |
| REQ-BRF-05 | EC-OPT-03, 10; EC-TECH-03, 16, 17; EC-TRIP-16, 17 | T-FUN-004, 005, T-FLOW-015, T-INT-003–005, T-SEC-009, T-DEMO-002 | F14, F15 |
| REQ-BRF-06 | EC-TECH-01, 04, 05 | T-RESP-*, T-A11Y-*, T-FUN-012, T-INT-001, 007 | All |
| REQ-BRF-07 | EC-TRIP-01, 08; EC-OPT-07, 08 | T-CALC-004, 013, T-FLOW-008, T-VAL-012 | F08 |
| REQ-BRF-08 | EC-CARD-04, 05 | T-FUN-007, T-FLOW-002, T-CALC-005, 110, T-VAL-009 | F02 |
| REQ-BRF-09 | EC-CARD-07, 10, 19, 20 | T-CALC-010, 011 | F03 |
| REQ-BRF-10 | EC-TECH-21; EC-ONB-05 | T-FUN-006, T-FLOW-016, 017 | F16 |
| REQ-BRF-11 | EC-TECH-09 | T-FUN-030, T-TIME-011 | — |
| REQ-BRF-12 | EC-TECH-18 | T-FUN-015 | — |
| REQ-OWN-01 | EC-TRIP-15, 21 | T-FLOW-007, T-TIME-010, T-TIME-012, T-VAL-003 | F07 |
| REQ-OWN-02 | EC-CARD-01, 03 | T-FLOW-003, T-FUN-007, 008 | F03 |
| REQ-OWN-03 | EC-SPD-01, 02, 03 | T-FUN-009, T-ALLOC-007, T-VAL-010 | §10 doc 01 |
| REQ-OWN-04 | EC-SPD-04, 05 | T-FUN-010, T-CALC-103 | F11 |
| REQ-OWN-05 | EC-OPT-11, 19, 20 | T-TIME-001–007, T-TIME-112 | F10, F13 |
| REQ-OWN-06 | — | T-FUN-022, T-TIME-006, T-FUN-012 | F10 |
| REQ-OWN-07 | EC-OPT-08 | T-CALC-013 | F08 |
| REQ-OWN-08 | EC-TECH-08; EC-SPD-06 | T-REG-001–016, T-REG-107 | F11, F16 |
| REQ-OWN-09 | EC-ONB-04 | T-FLOW-001, 005, 006, T-CALC-110 | F01, F06 |
| REQ-OWN-10 | EC-OPT-12 | T-CALC-012, T-FUN-013 | F02 |
| REQ-OWN-11 | — | T-SEC-002, T-FUN-008, 011 | §3 doc 01 |
| REQ-OWN-12 | EC-ONB-05, 08, 09 | T-FUN-006, T-FLOW-017, 018 | §1 doc 01 |
| REQ-OWN-13 | EC-SPD-09, 10, 13 | T-CALC-103, 108, 113, T-VAL-011 | F10, F11 |
| REQ-RES-01–18 | See section 2 | T-FUN-014, 016–026, T-INT-003, 004, 010, T-VAL-005, 006, T-CALC-010, 011, T-TIME-008, T-SEC-008, T-DEMO-001 | F01, F15 |
| REQ-RES-19 (audit) | EC-OPT-22, EC-TECH-13 | T-FUN-031, T-DEMO-005 | F01, all hero views |
| REQ-RES-20 (audit) | EC-CARD-19, 21, 22, 23 | T-FUN-032, T-CALC-024 | F15 |
| REQ-RES-21 (audit) | EC-TRIP-15, 21 | T-VAL-003, T-TIME-012 | F07 |
| REQ-REC-RULE-01 | EC-RWD-01–27 | T-CALC-015–020 | F10 |
| REQ-REC-CAT-01 (audit) | EC-CARD-01, 24, 25 | T-FUN-033, T-CALC-024 | F03 |
| REQ-REC-FCST-01 (audit) | EC-RWD-24, 25, 26 | T-CALC-021, T-REG-017 | F10 |
| REQ-REC-BUY-01 (audit) | EC-OPT-21 | T-CALC-023 | F02, F15 |
| REQ-REC-CARD-01–08 | EC-CARD-11, 15, 16, 17; EC-SPD-07, 08, 10; EC-ALLOC-01, 07, 10; EC-RWD-15, 20 | T-CALC-101, T-ALLOC-102, T-CALC-103, 104, T-TIME-105, T-CALC-108, T-FLOW-109, T-ALLOC-111, T-CALC-025 | F04, F05, F10 |
| REQ-REC-VAL-01 | EC-OPT-01, 02 | T-CALC-106, 003, 009 | F02 |
| REQ-REC-REPLAN-01 | EC-SPD-06 | T-REG-107 | F11 |
| REQ-REC-DATA-01 | EC-CARD-05, EC-ONB-01 | T-CALC-110 | F06 |
| REQ-REC-TIME-01 | EC-CARD-11, EC-OPT-11 | T-TIME-112 | F12 |
| REQ-REC-RES-01 | EC-SPD-09, EC-ALLOC-09 | T-CALC-113 | F11 |
| REQ-REC-MARG-01–06 | EC-MARG-01–06, EC-RWD-22 | T-CALC-114, 115, T-ALLOC-116, T-CALC-117, 118, 119, T-CALC-026 | F10 |
| REQ-REC-INV-01 | EC-ALLOC-01–06 | T-ALLOC-001–008, T-REG-120 | F10 |
| REQ-REC-EXPL-01 | EC-TECH-18 | T-FUN-027, T-SEC-008 | All recommendation flows |
| REQ-REC-REJ-01 | EC-CARD-16, 17 | T-FUN-028, T-FLOW-109 | F05 |
| REQ-REC-CONF-01 | EC-OPT-14, EC-CARD-02 | T-FUN-029, T-TIME-006 | F10 |
| REQ-REC-MULTI-01 | EC-OPT-09, 18 | T-CALC-007 | F09 |
| REQ-REC-BONUS-01 | EC-MARG-04 | T-FLOW-121 | F10 |
| REQ-NFR-01–11 | EC-TECH-* | T-INT-001, T-DEMO-*, T-A11Y-*, T-RESP-*, T-SEC-*, T-FUN-011, T-REG-015, T-TIME-009, manual Lighthouse | — |

---

## 9. Unresolved risks and missing test evidence

| ID | Risk / gap | Why it matters | How to resolve |
|---|---|---|---|
| GAP-01 | No authorised real-market cash or award data | Demo savings come from fixtures; real users would see different numbers | P2: commercial agreements (Seats.aero, AwardTool) or licensed fare data; keep badges |
| GAP-02 | Award release about 355–360 days is SECONDARY | Timeline reminder dates may be wrong | Verify per programme on official pages; label "estimated" until then |
| GAP-03 | Iberia partner-award refund rules CONFLICTING (FAQ vs general conditions) | Change/refund guidance in award steps | Treat as "not refundable" (restrictive) and link both sources |
| GAP-04 | Flying Blue Standard €70 fee is SECONDARY (official page 404) | Fare-condition display | Re-check flyingblue.com; label SECONDARY |
| GAP-05 | Amex welcome terms differ by landing page | S-cases rely on user selecting their offer | User selects offer version (EC-RWD-09) |
| GAP-06 | Rounding and posting delays not published (Iberia Cards; Amex ordinary earn) | Small numeric differences in forecasts | Conservative defaults + user override; label estimates |
| GAP-07 | Whether Art. 23 binds a comparison app / award prices (UNRESOLVED legal) | Display obligations | Comply anyway; lawyer before commercial launch |
| GAP-08 | CCD2 "advisory services" applicability to M4 (UNRESOLVED) | Possible regulated activity | Keep M4 in P1, neutral, opt-in; lawyer review |
| GAP-09 | Duffel test-mode rate limit unknown | CI flakiness for [INT] tests | Keep [INT] tests out of required CI; manual run |
| GAP-10 | Supabase Auth default email limits UNVERIFIED | Sign-in reliability during jury testing | Verify; configure custom SMTP if limits are low |
| GAP-11 | Valuation default (D-02) unapproved | Every Goal B ranking depends on it | Owner decision; break-even shown regardless |
| GAP-12 | Child award discounts (Iberia, Flying Blue) UNVERIFIED | Family award costs | Award child pricing user-entered / fixture only; label |
| GAP-13 | Whether Iberia "prerreserva" hold works with Avios UNVERIFIED | ST-11 fallback options | Don't offer award holds; only cash holds where provider supports |
| GAP-14 | Heuristic allocation may be needed for large inputs | Optimality claims | Exact search within limits; label heuristic beyond (EC-ALLOC-12) |
| GAP-15 | Iberia Aire cap scope ambiguous; FX allowance only in a 2025 PDF | Aire forecasts and FX costs | Ask Iberia Cards; restrictive reading + sensitivity until then (EC-RWD-27) |
| GAP-16 | Revolut credit-card availability: client guide vs issuer; Premium credit rate wording; Standard credit rate FAQ-only | Revolut forecasts | Issuer page prevails; re-check before launch |
| GAP-17 | Amex Business Platinum welcome offer and business-MR partner list not found; business-use restrictions UNVERIFIED | REF-01-type users | Template + user confirmation; EC-CARD-25 |
| GAP-18 | Vueling card booking-earn rates differ between CaixaBank and Vueling T&C (OFFICIAL-EXTRACT only) | Vueling card forecasts | Fetch both full documents before promoting to catalogue |
| GAP-19 | Iberia Zenit fee not found on the product page | Fee break-even | User-entered fee |
| GAP-20 | Route operators and award prices for MAD → JNB not verified | REF-01 is illustrative only | Verify before using as a demo claim |
| GAP-21 | Forecasts from category totals can't capture per-transaction rules | Forecast accuracy | Conservative band + actual-posting reconciliation (REQ-REC-FCST-01) |

---

## 10. Manual and exploratory checks (before submission)

1. Lighthouse on a real phone, aiming for 90+ (brief, Stage 11), recording the scores.
2. Try to break each P0 flow on purpose (brief, Stage 10, "Exploratory: You").
3. Rehearse the 3-minute demo on the deployed URL with mock mode, and once with Duffel test mode.
4. Check every page for copy: no banned words, all-in prices, badges visible, and the "How we calculate and rank" link.
5. Confirm deleting the account removes data and reminders (T-SEC-006) on the deployed environment.
