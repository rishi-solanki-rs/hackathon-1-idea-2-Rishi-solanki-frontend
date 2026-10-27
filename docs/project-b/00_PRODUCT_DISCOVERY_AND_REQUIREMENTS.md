# Project B: A Una Milla. 00: Product Discovery and Requirements

| Field | Value |
|---|---|
| Phase | Phase 1: Discovery and specification (no implementation) |
| Status | Draft for owner review. **Revised by the audit and correction pass, 26 Oct 2026** (see [DISCOVERY_AUDIT_REPORT_2026-10-26.md](DISCOVERY_AUDIT_REPORT_2026-10-26.md); pre-audit backup in `_backup/2026-10-26_pre-audit/`). |
| Date | 26 Oct 2026 |
| Companion docs | [01 End-to-end user flows](01_END_TO_END_USER_FLOWS.md) · [02 Edge cases and acceptance tests](02_EDGE_CASES_AND_ACCEPTANCE_TESTS.md) · [03 Product decisions and open questions](03_PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md) |
| Baseline | Hackathon brief: *Becoming 10X Developers: Full Documentation*, sections 6B.1, 6B.2 and 6C. Earlier planning draft `project_b_planning_package_32a6e260.plan.md`. That draft is left unmodified; proposed changes to it are listed in doc 03, section 9. |

## How to read this document

Every statement is tagged with where it comes from. A recommendation or assumption is not an approved requirement until the owner approves it in doc 03.

| Tag | Meaning |
|---|---|
| `[BRIEF]` | Stated in the original deck, slides 51–57 (section 6B.1 and 6C of the brief). Slide 55 "feature ideas" are tagged `[BRIEF-IDEA]`, because the deck calls them "a starting point, not the specification". |
| `[DOC-SUGGESTION]` | From section 6B.2, "Added detail (not in the deck)". These are the document author's suggestions, not client requirements. |
| `[OWNER]` | From the product owner's vision and the Phase 1 prompt and addenda. |
| `[CLIENT-GUIDE]` | From A Una Milla's own post-consultation guide (client Eriz, dated 06/09/2026, English summary supplied by the owner on 26 Oct 2026). This is the community's own method. It is a reference, not a universal user profile. |
| `[RESEARCH]` | Supported by external evidence (sources in doc 03, section 6). |
| `[RECOMMENDATION]` | My proposed solution. |
| `[ASSUMPTION]` | A provisional value used so the specification can continue. It must be validated. |
| `[OPEN QUESTION]` | Needs an owner decision (doc 03). |

**ID scheme**

| Prefix | What it identifies |
|---|---|
| `REQ-*` | Requirements |
| `Q-*` | Questions |
| `M1–M4` | Planning modes |
| `ST-*` | Strategies |
| `RT-*` | Reward-rule types |
| `G1–G8` | Safety gates |
| `INV-*` | Invariants |
| `EC-*` | Edge cases (doc 02) |
| `T-*` | Tests (doc 02) |
| `F01–F16` | Flows (doc 01) |
| `R1–R8` | Refusal paths (doc 01) |
| `R-EV-*` | Replanning events (doc 01) |
| `D-*`, `AS-*`, `UNR-*`, `QA-*` | Decisions (open questions are D-items marked "PROPOSED (OQ)"), assumptions, unresolved legal questions and pre-architecture questions (doc 03) |

The plan labelled strategies "S1–S12". This document renames them `ST-01`–`ST-12` so they can't be confused with the incremental-spend cases `S-01`–`S-13`.

---

## 1. Plain-language product definition

**What it is.** A mobile-first web app for the *A Una Milla de Tu Destino* travel-hacking community. You describe a trip, either a single flight or a multi-stop plan. The app shows what you would pay normally, what you could pay by travel hacking, and how much you save, in euros and as a percentage. It explains why the saving works and tells you exactly how to book. `[BRIEF]`

**What it becomes when you want more.** It becomes a personal planner. It uses the points you already have, the cards you already hold and the spending you already plan. From those it works out whether to book now or wait, which card to use for which planned expense, and what to do when your plans change. `[OWNER]`

**What it never does** `[OWNER]` `[RECOMMENDATION]`:
- push you to spend more;
- push you to open cards you don't want;
- encourage you to carry debt;
- pretend future prices or award seats are certain;
- treat different points currencies as interchangeable.

### 1.1 Product principle P-01 (the first requirement)

> **REQ-OWN-000 / P-01** `[OWNER]`: *Minimise the user's necessary out-of-pocket spending and realistic total trip cost while earning only the rewards that provide genuine value for the user's travel goal and timeline.* The system optimises the user's actual goal, never spending volume, gross points, welcome bonuses for their own sake, or a card provider's interests.

Every `REQ-REC-*` requirement in this document references P-01. INV-8 (section 7.6) makes P-01 testable.

### 1.2 Central objective

`[OWNER]` Minimise realistic total trip cost while respecting the user's:
- travel requirements and preferences;
- budget;
- existing assets;
- financial safety;
- booking deadline.

### 1.3 The product must never assume `[OWNER]`

| # | Forbidden assumption | Where it is enforced |
|---|---|---|
| NA-1 | Every user has a credit card | R1, REQ-OWN-09 |
| NA-2 | Every user wants another card | M4 opt-in, G5, REQ-REC-CARD-07 |
| NA-3 | Every programme transfers to every other | Verified transfer graph only (REQ-RES-07) |
| NA-4 | Awards are always cheaper than cash | Economic cost comparison (REQ-REC-VAL-01) |
| NA-5 | Spending more is beneficial | P-01, G1, INV-8 |
| NA-6 | Future prices are predictable | Labelled scenarios only (REQ-OWN-06) |
| NA-7 | An available award seat survives a transfer | No transfer before a live check (REQ-RES-08) |
| NA-8 | The user will change cabin, date or route | Hard constraints and permissions (Q-FLEX, Q-PRIO) |

---

## 2. Target users and primary goals

### 2.1 Market `[RESEARCH]` `[RECOMMENDATION]`

- The community is Spanish-language and Spain-focused. Its "about" page says the goal is to help "más personas en España" (more people in Spain). The blog covers Iberia Club, Amex Spain, Revolut, Iberia Cards and Flying Blue.
- **MVP market:** Spain only. Prices in EUR (primary currency).
- **UI language: English for P0** (D-04). Evidence and limits of this decision:
  - **What was decided:** on 26 Oct 2026 the owner (the hackathon builder) chose the option "English only (jury-friendly), Spanish later" in a structured question. That is a genuine owner selection for the hackathon build.
  - **What was not decided:** neither the client (A Una Milla / Eriz) nor the community has confirmed it. The website and the consultation guide are Spanish-language, so client confirmation is still open (QA-11).
  - **Localisation implications** `[RECOMMENDATION]`:
    - All copy goes in a string catalogue so Spanish (es-ES) can be added in P1 without code changes.
    - Number, currency and date formats follow the active locale (en: "€1,234.56"; es-ES: "1.234,56 €").
    - Programme and product names keep their official Spanish forms (e.g. "Iberia Club", "Cuenta Familiar", "Prerreserva"), with an English gloss.
    - Whether consumer-facing legal and price information must also be available in Spanish for Spanish consumers is **UNRESOLVED** (UNR-09). It is a commercial-launch blocker, not a hackathon blocker.
- Country-keyed rules (for example, Amex transfer ratios differ by issuing country) keep other markets possible later.

### 2.2 Primary user goals

| Goal ID | Goal | Source |
|---|---|---|
| UG-1 | "How much could I save on this trip?" Answered in seconds. | `[BRIEF]` |
| UG-2 | Book the flight, or get clear steps to book it. | `[BRIEF]` |
| UG-3 | Plan a trip 3, 6, 12 months ahead **or longer**, and know when to book. There is no universal planning horizon limit (section 5.2). | `[OWNER]` |
| UG-4 | Use existing points and cards sensibly. | `[OWNER]` |
| UG-5 | Route already-planned spending to the right card, without spending more. | `[OWNER]` |
| UG-6 | Understand why, with assumptions and risks visible. | `[OWNER]` |
| UG-7 | Adapt the plan when life changes (a new purchase, new dates, a new balance). | `[OWNER]` |

### 2.3 Representative personas

These personas are illustrative, not research participants.

| Persona | Situation | Mode | Main need | Key risks the product must handle |
|---|---|---|---|---|
| **P-A Lucía** (Madrid, 27) | No reward cards, debit only. A weekend trip to Lisbon. | M1 | "Is there a cheaper way?" | Must stay useful with no points (R1, R7). Savings come from flexible dates and nearby airports. |
| **P-B Javier** (Barcelona, 38) | Amex Gold Spain, 45,000 MR (Membership Rewards points), 12,000 Iberia Avios. | M2 | Best use of existing points. | Non-1:1 transfers; irreversible transfers; award looks cheaper but is worse (CS-04). |
| **P-C Marta** (Valencia, 34) | Two adults plus an infant on lap. Return to Tenerife. Iberia Club Family Account. | M2 | Family trip with points. | Infant award tickets can't be booked online (REQ-RES-04); beneficiary rules (REQ-RES-05). |
| **P-D Diego** (Bilbao, 41) | Spain to China in about 12 months. Business class preferred. Several cards, monthly spending, an iPhone purchase planned. Open to a new card. | M3 + M4 | Book now or wait? Which card for what? | Book-now-vs-wait; bonus deadlines; replanning after the iPhone; visa-free policy ends 31/12/2026. |
| **P-E Ana** (Sevilla, 30) | Carries a revolving card balance. Wants a trip to Rome. | M1/M2 | Cheap trip. | G2/G3 block all card optimisation (S-12). Never push credit. |
| **P-F Pablo** (Málaga, 45) | Privacy-conscious. Won't share balances or spending. | M1 | Comparison only. | R3, R4, R5: useful without data; no assumed balances. |
| **P-G Reference consultation client** `[CLIENT-GUIDE]` | Wants Business Class Madrid → Johannesburg, booked within 90 days. Programmes Iberia / British Airways / Qatar. Earns with Revolut and Amex Business Platinum. | M2 + M3-lite | Find seats first, then move Avios via BA as the bridge, then book. | Short horizon; Qatar needs a BA link first; account details must match; gap-fill purchase only after the seat is found. **Reference scenario REF-01 (doc 02 §4.4). Its cards and preferences are not assumed for any other user.** |

---

## 3. Original brief vs owner requirements vs research vs recommendations

### 3.1 Original brief `[BRIEF]` (slides 51–57)

| Ref | Brief statement |
|---|---|
| B-1 | "Build an app where anyone checks a trip, sees how much they can save by travel hacking it, and books the flight." |
| B-2 | "The user enters a trip: a full plan or a quick short flight." There are two ways in: **Quick Flight** ("One route, one answer… Fast and simple") and **Full Trip Plan** ("Several stops, dates and travellers… Complete and detailed"). |
| B-3 | "The app shows the normal price, the hacked price and the savings." |
| B-4 | "The user books the flight, or gets clear steps to book it." |
| B-5 | "The savings are the product. Make them impossible to miss." |
| B-6 | Feature ideas (slide 55, `[BRIEF-IDEA]`): flexible dates and nearby airports; several stops and travellers; paste a booking link or screenshot; miles and points the user already has; savings in euros and percentage; miles, points and transfer partners; smarter routes and stopovers; why each saving works, explained simply; book the flight inside the app; step-by-step guide for award bookings; price alerts for saved trips; saved trips and total saved; fully responsive, mobile first. |
| B-7 | APIs to research (presenter notes): Duffel, Amadeus, Kiwi Tequila, Seats.aero. |
| B-8 | Jury criteria (slide 57): completeness, product thinking, design and taste, technical quality, use of AI. Deliverables: live URL and repository by end of Wed 28 Oct 2026; 3-minute demo Thu 29 Oct. |
| B-9 | Good-taste rules (slide 15): empty states, loading states, human error messages with a way out, mobile first, consistency, real content. |

### 3.1b Client consultation guide `[CLIENT-GUIDE]`

The A Una Milla post-consultation guide (06/09/2026) gives the community's own method. Its rules are consistent with P-01 and are adopted as product behaviour:

| Ref | Client rule | Where it lands in the spec |
|---|---|---|
| CG-1 | Collect mainly with spending you were already going to do | P-01, G1, INV-8 |
| CG-2 | Don't pay interest or take on debt to get points | G2, G3, S-12 |
| CG-3 | Use award search tools to save time (Seats.aero, SeatSpy) | Award steps step 1; P2 integrations |
| CG-4 | Always compare miles + taxes/fees against the cash price | Economic cost (section 7.2) |
| CG-5 | Transfer points only when the redemption and availability are clear | NB-6, REQ-RES-08 |
| CG-6 | Buy points only to fill a small gap after finding the flight | REQ-REC-BUY-01 (section 7.14) |
| CG-7 | Use promotions and multipliers only when the purchase makes sense anyway | RT-05 (P1), P-01 |
| CG-8 | BA is usually the bridge account; Qatar must be linked to BA; details must match; accounts ≥ 30 days | REQ-RES-20 |

The guide's specific card claims are checked against official terms in section 5.11. Where the guide differs from the issuer (Revolut credit-card availability), the issuer prevails and the difference is recorded.

### 3.2 Document author's suggestions `[DOC-SUGGESTION]` (section 6B.2, not client requirements)

These are reused where they help: a suggested data model, a provider-adapter architecture, mock mode, the savings hero card, the "Total saved" counter, a 3-minute demo script, and a reminder that award bookings usually cannot be done through public APIs.

### 3.3 Owner requirements `[OWNER]`

| Ref | Owner requirement |
|---|---|
| O-1 | Personalised, long-term planning for trips about 3, 6 or 12 months away, or other dates. |
| O-2 | Use existing points, cards, transfer partners, planned spending and planned purchases. |
| O-3 | Book-now-vs-wait decisions under uncertainty, with labelled assumptions. |
| O-4 | Dynamic replanning with history; approved decisions are protected. |
| O-5 | Useful without points or cards; a sensible cash alternative. |
| O-6 | Financial safety: no unnecessary spending, no debt, no guarantees. |
| O-7 | Card recommendations: existing cards first; new cards optional, explained and rejectable. |
| O-8 | Complete incremental-spend and threshold analysis (the €280 vs €300 example). |
| O-9 | P-01: optimise the user's best outcome, not maximum spending (final addendum). |
| O-10 | Explain what, why, assumptions, risks, savings and the next action. |
| O-11 | Distinguish Goal A (lowest cash now) from Goal B (lowest overall economic cost). |
| O-12 | Production-minded, using free tiers (auth via Supabase free tier, owner answer 26 Oct). |

### 3.4 Research findings that change behaviour `[RESEARCH]`

These are summarised here. Each has full citations in doc 03, section 6.

| Ref | Finding | Effect on behaviour |
|---|---|---|
| RF-1 | Amadeus Self-Service was decommissioned on 17 Jul 2026. Kiwi Tequila is invitation-only. | Not usable. Duffel test mode is the only live source (owner choice). Everything else is a labelled mock. |
| RF-2 | Duffel: multi-city works through several slices. Offers expire in 15–30 minutes. `price_changed` exists. Age is required under 18, and each infant needs a responsible adult. `null` fare conditions mean "unknown". Test airline ZZ prices are not realistic. Hold orders exist. | Quote expiry, re-pricing, passenger ages, three-state conditions, and "LIVE-TEST" labelling. |
| RF-3 | No public API books award tickets. Seats.aero has no Iberia or BA coverage and is non-commercial. | Awards are booked through step-by-step instructions. Award data is mocked. |
| RF-4 | EU Reg 1008/2008 Art. 23 and CJEU C-573/13: the all-in final price must be shown at all times, including the first display. Extras must be opt-in. | Every cash number is an all-in price, including date grids. |
| RF-5 | Iberia: infant award tickets can't be booked online. Avios tickets can be issued only to the member, a beneficiary, or a companion on the same booking. Flying Blue: rewards can be booked for anyone, but infants need a phone call. | Who-is-travelling branch in award instructions. |
| RF-6 | Avios expire after 36 months without activity, and transfers don't count as activity. Amex Spain MR transfers 1:1 to Iberia, BA and Flying Blue. Emirates transfers are suspended. Ratios depend on the issuing country. | Verified transfer graph; expiry logic. |
| RF-7 | Card terms (re-verified 26 Oct 2026 audit). **Iberia Aire has three earn rates:** 1 Avios per €1 at Iberia/IAG, 1 per €2 at Iberia Club partners, and 1 per €3 elsewhere. A stated monthly limit reads "1 Avios cada 3 € de gasto hasta un máximo de 1.000 € mensuales. A partir de este importe el resto de operaciones no acumularán Avios". Whether the €1,000 limit also covers IAG and partner spend is **ambiguous** (section 7.4). The earlier wording "Aire stops earning above €1,000 a month" was an over-simplification and is withdrawn. Iberia Icon drops to 1 Avios per €10 above €18,000 a year. Amex bonuses post in 10 business days, up to 180, can be clawed back on refund, and exclude anyone who held a card in the last 12 months. MR points are lost if the card is cancelled. Revolut balances can go negative. | Reward-rule taxonomy RT-01–06; conservative defaults. |
| RF-8 | EU Consumer Credit Directive 2 (CCD2) applies from 20 Nov 2026: a credit warning is required, and "advisory services" are reserved to creditors and intermediaries. Spain's transposition is a draft. Referral commissions may make the app a credit intermediary under Ley 16/2011 and Ley 2/2009. | New-card content is neutral and opt-in. No commissions in P0. A lawyer is needed before any monetisation. |
| RF-9 | Spanish consumer law TRLGDCU Art. 20.3 requires a link to the main ranking parameters. The unfair-competition law LCD and the EU UCPD say savings claims must be provable, and "free" is banned where taxes apply. AI Act Art. 50 requires labelling AI text (from 2 Aug 2026). Analytics cookies need consent. The Spanish data protection authority's (AEPD) list makes a DPIA (data protection impact assessment) likely. | Transparency page, quote log, AI labels, consent, DPIA. |
| RF-10 | Iberia doesn't operate its own flights to mainland China (it codeshares via China Southern). Spain's visa-free entry to China ends 31/12/2026. | Spain–China persona flows flag both facts. |
| RF-11 | UX evidence: Nielsen Norman Group (progressive disclosure; tutorials get skipped), the GOV.UK question pattern, Baymard (field count; extra costs drive abandonment), Google Flights (low/typical/high only with reliable data; "no guarantee" caveat). | Value-first onboarding; forecast labelling. |
| RF-12 | Revolut Spain: the official credit-card page says the credit card is available to Revolut customers resident in Spain, subject to credit approval. It lists credit earn rates **by plan**: Plus 1.5 per €10, Premium 1.5 per €4, Metal 1 per €1, Ultra 1.5 per €1. The Spanish FAQ lists debit rates (Standard/Plus 1 per €10, Premium 1 per €4, Metal 1 per €2, Ultra 1 per €1) and states Premium's credit rate only as "4 €". The client guide says the credit card is Ultra-only. That conflicts with the official page, so the official page prevails and the conflict is recorded (CONFLICTING). | Catalogue per plan and card type; conflict shown |
| RF-13 | Amex **Business** Platinum (Spain, for SMEs and the self-employed): €65 a month (€780 a year cap), 1 MR per €1, "1 punto Membership Rewards equivale a 1 Iberia Avios o 1 AirEuropa Millas suma", points without limit or expiry. No current Spanish welcome offer was found. It is a business product, so consumer-credit protections may not apply in the same way. | User-confirmed catalogue template; welcome UNVERIFIED |
| RF-14 | Avios moves (client guide + BA/avios.com pages cited in the guide): BA Club acts as the usual **bridge account**. Qatar Privilege Club must first be **linked to BA**. Name, surname, date of birth and email must match across accounts (passport details). Accounts must be at least 30 days old. Moves are instant and "as often as you like". | Transfer preconditions (REQ-RES-20) |
| RF-15 | Client method `[CLIENT-GUIDE]`: earn "organically" from spending you'd do anyway; never pay interest; search award availability **before** transferring or buying points; buy points only to fill a small gap after finding the flight; use multipliers only for purchases that make sense anyway; always compare miles + taxes/fees against cash. | Matches P-01, NB-3, NB-6. Adds the gap-fill rule (REQ-REC-BUY-01). |
### 3.5 My recommendations `[RECOMMENDATION]` (pending approval in doc 03)

- Value-first onboarding with modes M1–M4.
- Goal B as the default objective.
- Points valuation that is conservative and editable.
- Usable vs surplus points.
- Gates G1–G8 and invariants INV-1–8.
- An explanation contract.
- Rejection memory.
- A seven-outcome book-now-vs-wait engine.
- Provenance badges.
- No affiliate links in P0.

---

## 4. Planning modes (progressive personalisation)

`[RECOMMENDATION]`: Show value before asking for anything personal (doc 01, section 1). Modes are opt-in gates. A user never sees questions belonging to a mode they haven't chosen.

| Mode | Name | Unlocks | Required extra inputs | Never asked otherwise |
|---|---|---|---|---|
| **M1** | Compare | Normal vs hacked vs saving for a Quick Flight or Full Trip Plan. Flexible dates and airports. Generic award options with points needed and break-even value. | None beyond trip essentials | Cards, balances, spending, income |
| **M2** | Use my points | Personalised affordability, transfer paths, mixed cash and award by leg | Balances: exact, range or "unknown" (Q-BAL) | Spending, purchases |
| **M3** | Plan ahead | Accumulation forecast, card allocation of planned spend, welcome-bonus checks for cards already held, book-now-vs-wait timeline, replanning | Target date, minimum cash reserve, existing cards, monthly spending, planned purchases, gate questions G2/G3 | New-card offers |
| **M4** | Explore new cards | Neutral, opt-in rewards-value comparison of new cards | Explicit opt-in; issuing country; prior-holder answers for eligibility | Never shown without opt-in |

**Priority:**
- M1 and M2 are P0.
- M3 is P0 in a "lite" form: existing cards only, monthly spend, one welcome threshold, caps and plateaus, P-01 rules.
- M4 is P1.

---

## 5. Questionnaire and progressive onboarding strategy

### 5.1 Principles `[RESEARCH]` `[RECOMMENDATION]`

1. **Ask only what the chosen result needs.** Each question has a "why we ask" line, following the GOV.UK question protocol.
2. **One topic per screen on mobile.** Optional questions sit behind a single "More options" disclosure, never more than 2 levels deep (NN/g).
3. **Allow "I don't know" wherever it is meaningful.** Optional fields are labelled "(optional)", not marked with asterisks.
4. **Pre-fill sensible defaults** (NN/g "power of defaults"). A default is never a hidden assumption about money; financial values are never defaulted.
5. **Back links everywhere, and autosave drafts** so leaving and resuming loses nothing (EC-ONB-06).
6. **Never request card numbers, last-4 digits, CVV, bank logins or income** (REQ-OWN-11).

### 5.2 Essential trip questions (Q-TRIP): asked in M1, first screen

| ID | Question | Why we ask | Default | Validation | Dependencies |
|---|---|---|---|---|---|
| Q-TRIP-01 | Where from? | To search fares from your airport or city | Last used, or the profile's home airport | Airport (IATA), city or metro code. 1–3 entries. Must not equal the destination set. | — |
| Q-TRIP-02 | Where to? | Destination | none | Same as above | — |
| Q-TRIP-03 | Trip type | One-way and return price differently | Return | One of `one_way`, `return`, `open_jaw`, `multi_city` | `multi_city` opens the Full Trip Plan builder (up to 6 legs, `[ASSUMPTION]` AS-07) |
| Q-TRIP-04 | Departure date | Fares depend on the date | none | Not in the past (airport-local date). **No universal maximum planning horizon.** Trips beyond any search horizon can still be planned; results are labelled with the availability states in section 5.2a. | Flex options in Q-FLEX |
| Q-TRIP-05 | Return date | For return trips | none | Must be after the departure (same-day allowed if the times work) | Hidden for one-way |
| Q-TRIP-06 | Who is travelling? | Child and infant fares, and award rules | 1 adult | Adults ≥1. Age is required for each child (2–17) and each infant (0–1 on the date of the last flight, as Duffel defines it). Infants ≤ adults, and each infant is linked to a unique adult. Total ≤ 9 (`[ASSUMPTION]` AS-08). | Infant flag changes award instructions (REQ-RES-04) |
| Q-TRIP-07 | Cabin | Points and cash differ by cabin | Economy | `economy`, `premium_economy`, `business`, `first`, plus a "minimum" or "preferred" flag | A "minimum" cabin is a hard constraint |
| Q-TRIP-08 | Budget | To flag options above your budget | none (optional) | €, at least 0, 2 decimals at most | Used as a filter and a warning only; never inferred |

**Full Trip Plan additions (F09):**
- Each leg has its own origin, destination, date and flex, and its own cabin (optional; defaults to the trip cabin).
- Legs are ordered.
- An open-jaw gap is allowed when `open_jaw_allowed` is on.
- An overlap is flagged if a leg departs before the previous leg arrives (EC-TRIP-07).

### 5.2a Planning horizon and availability states (REQ-RES-21) `[RECOMMENDATION]`

The earlier universal "360 days" limit is **removed**. Planning (forecast, timeline, reminders) works for any future date. What changes with distance is what can be known. Each leg and option carries exactly one availability state:

| State | Meaning | Typical cause | What the UI shows |
|---|---|---|---|
| `VERIFIED_RESULT` | A real, authorised, live result for these dates | Not achievable in the hackathon (section 7.12) | Price + LIVE badge (P2) |
| `TEST_OR_ILLUSTRATIVE` | Duffel test-environment or fixture data. Never presented as a real price (section 7.12). | Hackathon | LIVE-TEST or ILLUSTRATIVE badge |
| `CACHED` | A previously fetched result | Saved trip | Age badge; refresh before booking |
| `NOT_YET_SEARCHABLE` | Dates are beyond the provider's or programme's bookable horizon | Long-range plan | "Not bookable yet – planning with estimates" |
| `ESTIMATED_RELEASE_WINDOW` | When award seats are *expected* to open, per programme | AS-03 (about 355–360 days for Iberia/BA, SECONDARY) | "Award seats usually open around [date] (estimate, not confirmed)" |
| `UNKNOWN_AVAILABILITY` | No data, no estimate, or the programme's horizon is unknown | Unsupported programme/route | "Availability unknown – check the programme site" |

**Rules:**
- No verdict may treat `NOT_YET_SEARCHABLE`, `ESTIMATED_RELEASE_WINDOW` or `UNKNOWN_AVAILABILITY` as bookable.
- The release-window estimate is per programme and never universal. If a programme has no estimate, the state is `UNKNOWN_AVAILABILITY`.
- While the award leg isn't searchable but a cash quote exists, the verdict can be `MONITOR_NO_TRANSFER`, `WAIT_ACCUMULATE` or `TOO_UNCERTAIN` (doc 02 §3.2 V9).
- When the cash leg isn't searchable either, there is nothing to compare against, so the verdict is limited to `MONITOR_NO_TRANSFER` or `TOO_UNCERTAIN`, plus dated reminders (doc 02 §3.2 V10).

### 5.3 Date flexibility (Q-FLEX)

Flexibility is set separately for departure and for return.

| Value | Meaning in the search | Cash cap | Award cap | Search budget shown to user |
|---|---|---|---|---|
| `exact` | Only the chosen date | — | — | 1 date |
| `plus_minus` | From date − N to date + N | N ∈ {1, 2, 3} | N ∈ {1, 3, 7, 14} | Return trip at ±3 days = 49 date pairs |
| `range` | Earliest departure to latest return, plus a trip-length range in nights | ≤ 31 days | ≤ 60 days | Shown as "about X searches" |
| `month` | One or more calendar months, plus a trip length | ≤ 3 months | ≤ 12 months | Indicative/cached results, labelled |
| `anytime` | Next 6 months, plus a trip-length preset | — | — | Indicative only |

**Trip-length presets** `[RECOMMENDATION]` (Google doesn't publish definitions for its own presets):
- `weekend`: depart Thursday–Saturday, return Sunday–Monday, 2–3 nights.
- `1w`: 6–8 nights.
- `2w`: 13–15 nights.

**Q-FLEX-02, date firmness** (asked for each date): **Hard deadline** / **Preferred** / **Negotiable**.
- **Hard:** no option outside the date is shown as a recommendation. It may appear in an "If you could move your date" note only if the user enabled "show me what I'm missing" (default off).
- **Preferred:** options off this date are shown only if they beat the on-date option by at least the tolerance (Q-PRIO-03).
- **Negotiable:** these options are ranked normally.

A hard constraint always beats a saving (REQ-OWN-07).

**Airports (Q-FLEX-03):**
- Modes are `single`, `metro` (e.g. MAD, all London airports), `nearby` (a curated list; default off), and `custom_group`.
- At most 3 origins × 3 destinations.
- Flags `open_jaw_allowed` and `airport_change_on_layover_allowed` both default to false.
- If a nearby airport is used, the user may enter a ground transport cost and time. If none is entered, the option shows "transport cost not included" and cannot be the top recommendation under Goal B unless its saving exceeds a stated assumption (AS-09).

### 5.4 Travel preferences (Q-PREF)

- **Visible by default:** Q-PREF-01 stops (direct / ≤1 / any; default any).
- **Visible by default:** Q-PREF-02 bags. "Include a checked bag in the price" is off by default. When on, the label stays visible on every price.
- **Under "More options"**, two levels at most:

| ID | Preference | Default | Hard or soft |
|---|---|---|---|
| Q-PREF-03 | Maximum total journey time | none | User chooses |
| Q-PREF-04 | Maximum layover; overnight layover allowed | none; No | User chooses |
| Q-PREF-05 | Separate (self-transfer) tickets allowed | **No**. When on, a warning explains separate tickets, rechecking bags, possible visa, and no protection. | Hard if No |
| Q-PREF-06 | Airport change during a connection | No | Hard if No |
| Q-PREF-07 | Preferred and avoided airlines or alliances | none | Avoid = hard; prefer = soft |
| Q-PREF-08 | Departure and arrival time windows | none | Soft unless "must" is set |
| Q-PREF-09 | Refundable or changeable fare needed | No | Hard if Yes. Unknown conditions do not satisfy it. |
| Q-PREF-10 | Accessibility needs | Never asked. A free-text note appears only if the user opens "Special assistance". It is passed to booking instructions and not stored in the profile (GDPR Art. 9). | — |

### 5.5 Priorities (Q-PRIO)

**Q-PRIO-01: objective**
- **Goal B, "Lowest true cost"** (default, `[OWNER]` objective). Ranks by economic cost (EC, section 7.2), with points valued in euros.
- **Goal A, "Pay least today".** Ranks by cash paid at booking, then by economic cost as a tie-breaker.
- Both numbers are always shown on every option, whichever goal is selected (REQ-OWN-10).

**Q-PRIO-02: up to 3 ranked preferences.** The choices are:
- best use of existing points;
- business or first;
- direct;
- short journey;
- preferred airline;
- flexible cancellation;
- avoiding risk;
- keeping points for another trip.

**Q-PRIO-03: tolerance.** Default: within 5% or €25 of the best option, whichever is larger (`[ASSUMPTION]` AS-10).

**How conflicts are resolved** (deterministic):
1. **Hard constraints filter options out**: hard dates, minimum cabin, avoid lists, self-transfer = No, refundable = Yes, budget if marked hard, and gates G1–G8.
2. **The selected objective ranks** what remains.
3. **Soft preferences break ties** within tolerance, in the user's ranked order.
4. **Every trade-off is explained explicitly**, in this form: "Business uses 62,000 more points and costs €410 more in economic terms than economy; you asked for business as a preference, not a requirement, so economy is recommended."
5. **"Keep points for another trip"** reserves a user-stated balance. Those points are excluded from usable points (INV-4).

### 5.6 Cards (Q-CARD), asked in M3 or when the user taps "Add a card"

| ID | Field | Source | Notes |
|---|---|---|---|
| Q-CARD-00 | "Do you have any reward-earning cards?" Yes / No / Not sure | User | No leads to R1 or R2 |
| Q-CARD-01 | Card product | Verified Spain catalogue (source URL and "verified on" date), a **user-confirmed template**, or **Custom** (section 5.11) | Catalogue entries carry rule records RT-01–06. The plan/card type is asked where it changes rates (e.g. Revolut plan + debit or credit). |
| Q-CARD-02 | Issuing country | User (default: profile country) | Transfer ratios are keyed by issuing country |
| Q-CARD-03 | Month opened (optional) | User | Needed for welcome windows and eligibility lookbacks |
| Q-CARD-04 | Rewards currency | Catalogue, or user for custom cards | e.g. MR, Avios, RevPoints, SUMA miles |
| Q-CARD-05 | Annual or monthly fee | Catalogue (editable), or user | Monthly fees are counted per month (RT-06) |
| Q-CARD-06 | Statement closing day (optional) | User | Posting timing. Unknown means the maximum delay is assumed. |
| Q-CARD-07 | Welcome offer in progress? Offer, window start, spend so far | User confirms; catalogue suggests | Spend so far is user-entered |
| Q-CARD-08 | Payment preferences, e.g. "never use for rent", "keep for travel only" | User | Hard allocation constraints |
| Q-CARD-09 | Credit limit (optional) | User | Gate G8 is applied only if given |

**Never asked:** card number, last 4 digits, expiry, CVV, PIN, or online-banking credentials (REQ-OWN-11, T-SEC-002).

**Stale or conflicting terms:**
- Catalogue rules more than 30 days past `verified_at` show **"Terms may have changed"** (`[ASSUMPTION]` AS-11).
- Conflicting sources use the most restrictive reading and show the conflict (REQ-REC-RULE-01).
- A user override is allowed. It is stored with a "user-confirmed" label and shown in the explanation.

### 5.7 Points and loyalty balances (Q-BAL), M2 and up

| ID | Field | Notes |
|---|---|---|
| Q-BAL-01 | Programme | From the catalogue (Iberia Club, BA Club, Vueling Club, Aer Lingus AerClub, Finnair Plus, Qatar Privilege Club, Flying Blue, Air Europa SUMA, Turkish Miles&Smiles, Miles & More, Emirates Skywards, Amex MR Spain, Revolut RevPoints) or Custom |
| Q-BAL-02 | Balance | **Exact number**, **range bucket** (0–5k, 5–20k, 20–50k, 50–100k, 100k+), or **"I don't know"** |
| Q-BAL-03 | As-of date | Default today. Older than 30 days shows "check your balance". |
| Q-BAL-04 | Expiry date, if known | Otherwise computed from the programme rule. Shown as "estimated". |
| Q-BAL-05 | Household or family pool (optional) | Iberia Family Account: up to 7 members. Pooled Avios can't be transferred. |
| Q-BAL-06 | Points already committed elsewhere (optional) | Excluded from usable points (INV-4) |

**What the user is told:**
- **"Points from different programmes are separate currencies. We never add them together."**
- Transfer paths come only from the verified transfer graph, using the issuing country's ratio, minimum and increment, and they are always labelled irreversible (REQ-RES-07, REQ-RES-08).
- Avios moves show their preconditions (REQ-RES-20):
  - BA Club is usually the bridge between programmes.
  - Qatar Privilege Club must be linked to BA first.
  - Names, date of birth and email must match.
  - Both accounts must be at least 30 days old. BA's own terms mention 90 days for Iberia, so this is CONFLICTING; the stricter reading is used until resolved.

**Effect of incomplete answers:**
- **Unknown balance (R3):** points needed and break-even are shown. Affordability is "Unknown".
- **Range (R4):** affordability is Yes, No or Maybe.
- **Expiry before the trip (EC-CARD-06):** a warning with an activity hint. For Avios, the hint is that linking Avios Wallet counts as activity but transfers don't.

### 5.8 Spending profile (Q-SPEND), M3 only

| ID | Question | Rules |
|---|---|---|
| Q-SPEND-01 | Typical spending by category: groceries, restaurants, fuel and transport, rent and household bills, travel, shopping, subscriptions, other | Amount plus frequency (daily, weekly or monthly). Normalised: **monthly = daily × 365/12; monthly = weekly × 52/12**. The original entry is kept (INV-7). Each category is entered once. A duplicate prompt appears if the same category and a similar amount (±10%) is entered twice (EC-SPD-02). |
| Q-SPEND-02 | Which card do you use for this today? (optional) | Gives the **status-quo allocation** used as the explicit baseline for "what changes for you" (section 7.5). If not answered, the baseline is the best feasible allocation without the strategy, and the UI says so. |
| Q-SPEND-02b | For categories whose earn rate depends on the merchant (partners, supermarkets, travel merchants, excluded sectors): "Do these purchases happen at [eligible merchants]?" Yes / No / Not sure | Not sure → conservative rate (section 7.13) |
| Q-SPEND-03 | Is this amount fixed or variable? | Variable amounts use the entered estimate. A conservative band is shown in the forecast (−20%, `[ASSUMPTION]` AS-12). |
| Q-SPEND-04 | Payment restrictions (e.g. "rent can only be paid by bank transfer") | Expenses that can't be paid by card are excluded from allocation |
| Q-SPEND-05 | **Gate:** "Do you pay your card statement in full every month?" | Required for any card optimisation (G2) |
| Q-SPEND-06 | **Gate:** "Do you currently carry a balance on any card?" | Required (G3) |
| Q-SPEND-07 | **Minimum cash reserve** you want to keep at all times | Required in M3. **No default** (D-05). |
| Q-SPEND-08 | Comfortable monthly card spend (optional range) | Replaces income questions. Income is never asked (REQ-OWN-11). |
| Q-SPEND-09 | Known changes ahead (e.g. "rent rises in March") | Dated adjustments |

If the answer to Q-SPEND-05 is No, or Q-SPEND-06 is Yes, card optimisation is disabled (S-12).

### 5.9 Planned purchases (Q-PURCH), M3

| ID | Field | Rules |
|---|---|---|
| Q-PURCH-01 | Description | Free text, ≤ 80 characters |
| Q-PURCH-02 | Amount and currency | EUR by default. Non-EUR flags possible FX fees (S-05). |
| Q-PURCH-03 | Category | From the category list |
| Q-PURCH-04 | Date, or earliest–latest window | Window allowed only if the user marks it "movable" |
| Q-PURCH-05 | Necessity | `necessary` / `optional` / `already_paid`. Only `necessary` items count toward thresholds (G1). `optional` items are described neutrally (P-01). `already_paid` items are excluded. |
| Q-PURCH-06 | Refundable? | Yes / No / Unknown. Unknown is treated as refund risk for threshold buffers (D-12). |
| Q-PURCH-07 | Status | planned / done / refunded / cancelled. Changes trigger R-EV-01 or R-EV-02. |

### 5.10 Recommended onboarding sequence (summary; full flow in doc 01, section 1)

1. Landing page: a one-line promise and the search box.
2. Essentials (Q-TRIP-01…07), with flexibility available as a one-tap chip.
3. **The first result appears as a guest:** Normal vs Hacked vs Saving, using a generic valuation and showing the break-even value, with provenance badges.
4. A choice:
   - *Done* (book or follow steps);
   - *Use my points* (M2);
   - *Plan ahead* (M3).
5. In M3, a new card appears only if the user explicitly asks (M4, P1).
6. Review: what, why, saving, assumptions, risks, next action and date.
7. Saving a trip requires sign-in; guest data migrates.

**Why this order, not "all details first":**
- NN/g: upfront tutorials get skipped, so contextual help is better.
- Baymard: field count drives abandonment.
- The brief demands an answer "in seconds" (B-1).
- People who only want a cash comparison (P-A, P-F) never meet questions about money.

### 5.11 Card and programme catalogue scope (REQ-REC-CAT-01) `[RESEARCH]` `[RECOMMENDATION]`

**Verification basis.** On 26 Oct 2026 I re-read the A Una Milla card page ([aunamilladetudestino.com/tarjetas-de-credito](https://aunamilladetudestino.com/tarjetas-de-credito/)) and the issuer pages cited in doc 03 §6.4.

**Naming rule.** The **canonical name** is the issuer's official product name. **Website aliases** are kept so community members can find their card under the name they know.

**Status meanings:**
- **P0 catalogue:** rules pre-filled from official terms (the user still confirms the offer they received).
- **P0 template:** a pre-filled, user-confirmed starting point with known gaps flagged.
- **P0 custom:** the user enters the terms.
- **P1:** promoted to a verified catalogue entry later.

| Canonical name (issuer) | Website alias | Currency | Key verified terms | Needs verification | P0 status |
|---|---|---|---|---|---|
| **Iberia Aire** (Iberia Cards) | "Iberia Icon Aire" | Avios (Iberia Club) | 1 Avios/€1 Iberia & IAG; 1/€2 Iberia Club partners; 1/€3 elsewhere; €1,000/month limit on the 1/€3 rate, then "el resto de operaciones no acumularán Avios"; €5/month; welcome 9,500 Avios at month 6 + 6,000 at month 18 | Whether IAG and partner spend count toward the €1,000 limit; the "partners" list; FX allowance (0% up to €500/month appears in a 2025 contract PDF but not on the current product page); rounding | **P0 catalogue** |
| **Iberia Icon** (Iberia Cards) | "Iberia Icon" | Avios | 1/€1 IAG and non-EUR; 1/€2 partners and travel; 1/€3 elsewhere; 1/€10 above €18,000 "anuales"; €9.90/month; welcome paid at statement 7 (≥ €100 each full month) | Period of "anuales"; wallet cap wording conflicts (€5,000 vs €1,000 per month) | **P0 catalogue** (the step rule RT-02 is applied in P1; in P0 the €18,000 step is flagged, not modelled) |
| **Iberia Zenit** (Iberia Cards) | "Iberia Zenit Gold" | Avios | 3/€1 on Iberia/IAG tickets (up to 10 with Iberia Club Oro); 1/€1 elsewhere; mobile wallets 1/€1 up to €5,000/month, then 0; 0% FX; Iberia Club Oro status | Fee (not on the page read); revolving terms present (TAE 10.46%), not relevant if paid in full | **P0 template** |
| **American Express Platinum** (personal, Amex Europe) | "Amex Platinum" | Membership Rewards (MR) | 1 MR/€1; €65/month; transfers to Iberia, BA and Flying Blue 1:1 (Spain-issued); Emirates suspended; welcome varies by landing page | Which welcome offer the user received | **P0 catalogue** |
| **American Express Gold** (personal) | "Amex Gold" | MR | 1 MR per €2 generally (1/€1 at selected travel merchants; 1 per €5 at Spanish supermarkets); €16/month | Category definitions per merchant code; offer version | **P0 catalogue** |
| **American Express Business Platinum** (business/self-employed) | — (named in the client guide) | MR | €65/month (€780/year cap); 1 MR/€1; "1 MR = 1 Iberia Avios or 1 SUMA mile"; no limit or expiry stated | Welcome offer (none found for Spain); full partner list for business MR; business-product consumer protections | **P0 template** |
| **Revolut** (Revolut Bank UAB), by plan: Standard, Plus, Premium, Metal, Ultra; debit or credit | "Revolut Ultra" | RevPoints | Debit (FAQ): Standard/Plus 1 per €10, Premium 1 per €4, Metal 1 per €2, Ultra 1 per €1. Credit (credit-card page): Plus 1.5 per €10, Premium 1.5 per €4, Metal 1 per €1, Ultra 1.5 per €1. Credit card available to Spain residents subject to approval. 3-year validity; exclusions list (utilities, rent, taxes and more); can go negative after refunds | Standard's credit rate (FAQ only); Premium's credit rate in the FAQ is ambiguous; earn rates sit in the non-contractual FAQ | **P0 catalogue** (the plan and card type are asked) |
| **Visa Air Europa SUMA** (Bankinter Consumer Finance) | "Air Europa Bankinter" | SUMA miles | 3 miles/€ on Air Europa; 0.5/€ elsewhere; maximum 1,390 miles per period; €48 fee in the representative example | Fee waiver tied to revolving use (SECONDARY; never counted); refund reversal | **P0 template** |
| **Vueling Visa / Vueling UP! Visa** (CaixaBank Payments & Consumer) | "Vueling UP" | Avios (Vueling Club) | Both 1 Avios per €2 on everyday purchases. UP!: welcome 9,000 Avios for ≥ €600 in the first 3 months; first year free, then €90 a year; Spain residents only; everyday Avios post after the monthly statement | Vueling-booking earn rates differ between the CaixaBank page and the Vueling T&C PDF (OFFICIAL-EXTRACT) | **P0 template** |
| **CaixaBank Visa Miles & More** (Oro / Classic) | "Miles & More Caixabank" | Miles & More miles | Welcome 7,000 miles (Oro) / 2,000 (Classic); fee €95 / €45 after year 1, waived above a spend threshold **or if purchases are financed** (never counted as a benefit) | Earn rates (SECONDARY only) | **P0 custom** (earn rate user-entered) |
| Plan Santander Iberia Club | — (blog topic, not on the card page) | Avios | €700 in one of the first 3 periods → 10,000 Avios; Avios taxed as investment income | — | **P1** (custom in P0) |

**Programmes in P0:**
- **Catalogue programmes (balances, expiry, transfer graph):** Iberia Club, British Airways Club, Vueling Club, Aer Lingus AerClub, Finnair Plus and Qatar Privilege Club as Avios nodes; Flying Blue; Air Europa SUMA; Amex MR (Spain); Revolut RevPoints.
- **Balance and expiry only:** Miles & More, Turkish Miles&Smiles, Emirates Skywards.
- **Everything else:** Custom.

**Tools mentioned by the client guide:**
- Seats.aero and SeatSpy are search aids, not data sources in P0. The award steps link to them as "check availability here" (CG-3).
- The guide's Seats.aero example (MAD→JFK, 18 Sept: "€636 or 30k points" vs "€656 or 45k points") is a **client-reported observation**. It is not verified and not used as a fixture.

---
## 6. Strategies the product compares (ST-01 to ST-12)

`[OWNER]` `[RECOMMENDATION]`: This section defines which decisions the product makes, not which algorithm makes them.

| ID | Strategy | When it is eligible | Key inputs |
|---|---|---|---|
| ST-01 | Buy a cash ticket now | Always, if a cash quote exists | Cash quote (all-in), conditions |
| ST-02 | Use existing points now | M2+, usable points ≥ need | Balances, verified transfer path, award quote |
| ST-03 | Keep accumulating, book later | M3, forecast available | Allocation ledger, award-feasible date (AFD), latest safe booking date (LSBD) |
| ST-04 | Use a different eligible transfer programme | M2+, verified path exists | Transfer graph, ratios by issuing country |
| ST-05 | New card (welcome bonus) | **M4 opt-in only**, gates pass | Offer rules RT-03, eligibility |
| ST-06 | Shift dates within flexibility | Q-FLEX is not `exact`, and the date is not hard | Flex window |
| ST-07 | Nearby airports | Q-FLEX-03 enabled | Transport cost and time |
| ST-08 | Different route or stopover | Allowed by preferences | Q-PREF |
| ST-09 | Different cabin | Only if the cabin is "preferred" (not "minimum"), or the user allows a downgrade | Q-TRIP-07 |
| ST-10 | Mix cash and award across legs | Full Trip Plan | Per-leg options, shared points pool |
| ST-11 | Keep a cash fallback (hold or refundable fare) | Waiting is under consideration | Hold or refundable premium |
| ST-12 | Recommend **against** redeeming (cash is better) | Always evaluated | EC comparison and break-even |

### 6.1 Rules that can never be broken `[OWNER]` `[RECOMMENDATION]`

- **NB-1:** Hard dates, deadlines, minimum cabin, avoid lists, and self-transfer = No.
- **NB-2:** The minimum cash reserve holds in every month (G4).
- **NB-3:** No unplanned or reward-only spending is ever counted or suggested (G1, P-01).
- **NB-4:** Statements are paid in full. Carried debt disables card optimisation (G2, G3).
- **NB-5:** No expense, point, fee or bonus is counted twice (INV-1 to INV-6).
- **NB-6:** No irreversible transfer is recommended before availability is confirmed live on the programme's own site (REQ-RES-08).
- **NB-7:** No guarantee language about prices, availability, approval or future points (REQ-OWN-06).
- **NB-8:** No recommendation is ranked by any commercial interest (INV-8, REQ-RES-16).

### 6.2 Evidence a recommendation must carry

Every recommendation carries:
- the source and freshness of each quote;
- the rule source and status for each card or programme rule;
- the valuation method and value used;
- the assumptions;
- a confidence level (section 7.10);
- the explanation contract fields (section 7.8).

A recommendation missing any of these is not displayed as a recommendation (T-FUN-027).

---

## 7. Calculations and decision rules (deterministic)

All of the logic in this section must be deterministic, versioned business logic. Every result stores its inputs and the engine version. No LLM may compute any value in this section (section 8).

### 7.1 Money, currency, rounding

- **Amounts.** Stored as integer minor units (cents) together with an ISO currency code. They are never floats.
- **Currency conversion.** Converted to EUR with a dated FX snapshot. The original amount and currency are kept, and the rate date is shown. If no snapshot is available, the comparison is blocked rather than guessed (EC-TECH-07).
- **Displayed euros.** Whole euros in headlines, 2 decimals in breakdowns. Rounding is half away from zero, applied only at display. Calculations keep minor units.
- **Percentages.** 1 decimal, half away from zero, computed from unrounded minor units.
- **Points.** Integers. Programme rounding rules apply (RT-01). If the rule is unknown, round down (`floor`).

### 7.2 Normal price, hacked price, economic cost, savings

**Normal price `N`** `[RECOMMENDATION]`
- `N` is the cheapest comparable **cash** itinerary for the user's **exact requested** airports, dates and cabin.
- Comparable means the same passengers and the same required bags.
- For multi-leg trips, it is the itinerary booked the way a normal traveller would book it: a multi-city or open-jaw fare where one exists, otherwise the sum of the per-leg cash fares.
- `N` is never inflated with fares the user would not realistically buy (the "retail-price fallacy", doc 03, section 6).

**Cost of an option `o`:**
- `cashOut(o)` = all-in fare or award taxes and carrier surcharges + booking, change or transfer fees + positioning transport (if entered) + opt-in bags.
- `pointsCost(o)` = Σ over programmes p of `points_p(o) × v_p`.
- `EC(o)` = `cashOut(o)` + `pointsCost(o)` + `attributableFees(o)` − `valueOfRewardsEarned(o)`. The rewards-earned term is used only when the earn is known and VERIFIED or user-entered (AS-13). Otherwise it is 0 and labelled.

**Hacked option `H`:**
- `H` is the option ranked first under the selected objective, within all constraints.
- Under Goal B it is the lowest `EC`. Under Goal A it is the lowest `cashOut`, with `EC` as the tie-breaker.

**Savings:**

| Quantity | Formula | When shown |
|---|---|---|
| Economic saving | `EC(N) − EC(H)` | Always shown |
| Economic saving % | Economic saving ÷ `EC(N)` | Always shown |
| Cash saving today | `cashOut(N) − cashOut(H)` | Always shown, labelled "cash you pay" |
| Break-even valuation (corrected in audit) | `v* = (EC_cash(C) − cashOut(A)) / points(A)`, where A is the award option, C is the best comparable cash option, and `EC_cash(C) = cashOut(C) + attributableFees(C) − valueOfRewardsEarned(C)` | For award options that use **one** programme. Both `cashOut` terms already include every extra (bags, fees, positioning), so no separate "extras" term is subtracted. The earlier formula subtracted extras twice. If the user's `v` is above `v*`, cash wins. For mixed-programme awards, v* is shown per programme, holding the others at the user's values. |

**Display and wording rules:**
- If the economic saving is ≤ 0, the product says plainly: "Paying cash is better" (ST-12).
- A low cash payment is never presented as a saving when the economic saving is negative (CS-04, T-CALC-106).

### 7.3 Points valuation `[RECOMMENDATION]` `[OPEN QUESTION]` (D-02)

There are three methods. The user can switch method in Settings or per trip:
1. **My value.** The user enters cents per point for each programme.
2. **Reference value (default, pending D-02).** A conservative, editable value per programme. It is always labelled `ASSUMPTION` and shown with a sensitivity line (±30%).
3. **Break-even only.** No value is assumed. Each award option shows `v*` ("worth it if you value Avios above €0.0091").

**Rules:**
- There is no universal value across programmes.
- Published valuations (TPG, NerdWallet, Upgraded Points) are USD-based and use different methods. They are cited only as context, never as a default (doc 03, section 6).
- Points in a programme with no realistic use for the trip are valued at `v_residual` (section 7.6), not at `v_p`.

### 7.4 Reward-rule taxonomy (RT-01 to RT-06) `[RESEARCH]` `[RECOMMENDATION]`

Every rule record has these fields:
- eligibility; qualification window and its anchor (approval date, statement, calendar month or 30-day period);
- exclusions; currency; cap and cap period; expiration;
- posting delay (typical and maximum) and the posting party;
- reversal behaviour;
- source URL, source type (contract, promo terms, FAQ, issuer blog, third party), retrieval date, snapshot hash, and status (VERIFIED, VERIFIED-FAQ, SECONDARY, CONFLICTING, UNVERIFIED).

| Type | What it models | Real Spanish example (VERIFIED 26 Oct 2026 unless marked) | Fixture |
|---|---|---|---|
| **RT-01** Ordinary earn (category rates) | Points per € by merchant category, with rounding and exclusions | **Amex MR Spain:** Platinum 1 per €1; other cards 1 per €2, and 1 per €5 at Spanish supermarkets; rounding per transaction, half-up; exclusions are interest, fees, cash advances and currency purchases; category bonuses don't apply on marketplaces or payment platforms. **Iberia Aire:** 1 per €1 at Iberia/IAG, 1 per €2 at Iberia Club partners, 1 per €3 elsewhere. Iberia Cards don't state rounding, so `floor` + AS-14. | Card A, B, D, T, FX-CARD-AIRE |
| **RT-02** Threshold step | The rate changes after spend reaches X | Iberia Icon: 1 Avios per €10 after €18,000 "anuales" (period undefined, so the user confirms it, EC-RWD-03). (Iberia Aire's €1,000 limit is a cap, RT-04, not a step.) | (P1) |
| **RT-03** Welcome milestone | A bonus for minimum eligible spend within a window | Amex Platinum (Spain): 5,000 MR in each 30-day period with ≥€1,500, for 10 months, up to 50,000. Posts in 10 business days, "up to 180". Clawback if purchases are refunded. Excluded if any Amex was held in the last 12 months. Terms vary by landing page (CONFLICTING). Iberia Icon: bonus at statement 7 if ≥€100 in each full month. Santander: 10,000 Avios for ≥€700 in **one** of the first 3 periods, which can't be summed. | Card T, Card M |
| **RT-04** Caps | Spend or points ceilings per period, with a `cap_scope` field (which categories count toward the cap and which stop earning) | **Iberia Aire:** "1 Avios cada 3 € de gasto hasta un máximo de 1.000 € mensuales. A partir de este importe el resto de operaciones no acumularán Avios" (VERIFIED text). `cap_scope` is **AMBIGUOUS**: either (a) only spend at the 1-per-€3 rate is capped (footnote placement), or (b) all Aire spend shares the €1,000 limit and nothing earns after it ("el resto de operaciones"). The engine applies **(b), the restrictive reading**, and shows (a) as a sensitivity. The period ("mensuales") is calendar month vs statement period, also unconfirmed (EC-RWD-04). **Bankinter SUMA:** 1,390 miles per statement period (points cap). **Iberia Zenit:** mobile wallets earn on up to €5,000 a month. | Card C (generic cap), FX-CARD-AIRE |
| **RT-05** Limited-time multipliers and transfer bonuses | A time-boxed rate or transfer bonus | Revolut +20% to Avios, 17–30 Aug 2026 UTC. Calculated per transaction, posts within 2 business days, Spanish residents have 19% withheld. The URL is reused across campaigns, so every version is stored as a snapshot. No Amex Spain transfer bonus found. | (P1) |
| **RT-06** Fee and benefit break-even | Fees, waivers, benefit values | Amex Platinum €65 a month. Icon €9.90 a month. CaixaBank Miles & More: free in year 1, then €95, waived above €10,000 spend **or if purchases are financed**. The financed-purchase waiver is never counted as a benefit. Issuer-estimated benefit values are labelled as such and count only if the user says they'll use the benefit. | Card U, T(new) |

**Conservative defaults** for unknown fields (REQ-REC-RULE-01):

| Unknown field | Default |
|---|---|
| Rounding | `floor` |
| Posting delay | The **maximum** documented delay; if none is documented, 1 full statement cycle + 10 business days (AS-15) |
| Refund behaviour | Reverses points and threshold spend |
| Undefined period | The more restrictive reading |
| Ambiguous cap scope | All eligible spend counts toward the cap; nothing earns after it. The alternative reading is shown as a sensitivity. |
| Conflicting sources | The more restrictive reading, with the conflict shown |
| Earn rate only in non-contractual FAQ | Used, labelled VERIFIED-FAQ; confidence capped at Medium |

### 7.5 Incremental net benefit and safety gates (REQ-REC-CARD-*)

**Corrected in the audit.** The earlier ΔB formula has been replaced, for three reasons:
1. It added `bonusValueResidual` into ΔB while also saying residual value is never part of the trip saving, which is contradictory.
2. It summed per-expense differences. That breaks for rules applied per period (e.g. `floor` on a monthly total).
3. It listed `lostOtherBonusValue` as a separate term, which double-counts when allocations are valued as a whole.

**Allocation value.** An allocation `A` assigns each necessary planned expense-month to one payment method (INV-1). It is valued **as a whole**, applying every card's period rules (rounding, caps, steps, bonuses, posting dates):

`TripValue(A) = v_trip × UsablePoints(A) + Cashback(A) − FX(A) − Surcharges(A) − AttributableFees(A)`

`ResidualValue(A) = v_residual × SurplusPoints(A)`

Every bonus's contribution to `UsablePoints(A)` is capped by the remaining need (section 7.6). It counts only if all of these hold:
- qualifying spend, net of expected refunds, clears the threshold inside the window;
- every counted expense is `necessary`, planned and eligible;
- the posting date, using the **maximum** delay, falls on or before LSBD minus the transfer lead time;
- gates G1–G8 pass.

Otherwise those bonus points go to `SurplusPoints`.

**Two explicit baselines.** Every displayed ΔB names its baseline:

| Baseline | Definition | Used for |
|---|---|---|
| `A_status_quo` | The user's current allocation (Q-SPEND-02, "which card do you use today?") | "What changes for you" (ΔB_change) |
| `A_without` | The best feasible allocation **without** the strategy's enabling action (without the new card, without moving the expense, without pulling a purchase forward) | The recommendation threshold (ΔB_strategy) |

`ΔB_change = TripValue(A_recommended) − TripValue(A_status_quo)`

`ΔB_strategy = TripValue(A_with) − TripValue(A_without)`

**Residual is never part of ΔB.** `ΔResidual = ResidualValue(A_with) − ResidualValue(A_without)` is shown separately as "longer-term value, not part of this trip's saving".

**Lost bonuses on other cards** are captured inside `TripValue` because allocations are valued as a whole, so there is no separate term.

**`AttributableFees`:**
- A card already held with its fee committed: 0.
- A new card or plan upgrade: pro-rated over the planning horizon (D-09), with a minimum of the first billing period. Monthly-billed fees are counted month by month.

**Unanswered Q-SPEND-02.** If the user didn't say which card they use today, `A_status_quo` is undefined. Only ΔB_strategy is shown, labelled "compared with the best use of your other cards".

A strategy is **recommended only if** `ΔB_strategy > minBenefit` (D-08, `[OPEN QUESTION]`; suggested max(€10, 5% of the trip saving)) **and** every gate passes:

| Gate | Rule | When it fails |
|---|---|---|
| G1 | No unplanned or reward-only spending | Those amounts are rejected, not costed (S-03) |
| G2 | Statement paid in full every month | No card optimisation (S-12) |
| G3 | No carried card debt | No card optimisation (S-12) |
| G4 | Cash reserve ≥ minimum in every month, including after any pull-forward | Reject the strategy (S-11) |
| G5 | The user wants the card; new cards need M4 | Not shown |
| G6 | Not known to be ineligible (residency, prior-holder lookback, income only if volunteered) | Removed, with the reason recorded (S-13) |
| G7 | The offer is valid through the whole window | Removed (S-13) |
| G8 | Credit limit sufficient (only if provided) | Warning; the allocation is capped |

### 7.6 Marginal value, usable points and objective neutrality (P-01)

- **`Need_p`.** The points required for the selected award in programme `p`.
  - **When forecasting**, a buffer is added (D-11, default +10%), because the price may differ by the time the user books.
  - **At booking time**, against a live-verified price, `Need_p` is the **exact** verified price with no buffer. In the hackathon, no price is live-verified, so the buffered value is always used.
  - **Gap-fill purchase** is covered separately (section 7.14).
- **Usable points.** Points in `p`, or points that can reach `p` through a verified transfer path at the issuing country's ratio, minimum and increment, that:
  - post by LSBD − transfer lead time (using the maximum delay);
  - do not expire before LSBD;
  - fit under the cap `Need_p` − points already usable.
- **Surplus points.** Everything else, valued at `v_residual_p`. The default is **0** unless the user states a realistic later use with a horizon before expiry (D-10). Surplus is always displayed separately.
- **Marginal value:** `MV_j(e | state) = v_trip·ΔUsable + v_residual·ΔSurplus + ΔCashback − ΔFX − ΔSurcharge − ΔAttributableFee − ΔLostValueElsewhere`. Plateaus, caps and milestones give `ΔUsable = 0` for the next euro once they are reached.
- **Allocation objective.** Over **necessary planned** expenses, maximise `TripValue(A)` first. `ResidualValue(A)` is used only to break ties or once the goal is met. This is subject to G1–G8, INV-1 to INV-8, the reserve, and the user's payment preferences (Q-CARD-08). MV is the per-euro view of the same allocation value, used for explanations ("next €1 here earns…"), and is computed by re-valuing the whole allocation.
- **Goal-met rule.** Once projected usable points are ≥ `Need_p` by LSBD, `v_trip` = 0 for further points in `p`. Remaining expenses are routed by their best verified net value (cashback, FX savings, or residual value). The user sees: "Your trip's points goal is met; we've stopped chasing points."
- **Minimal-overshoot rule.** For thresholds and milestones, choose the smallest set of necessary expenses that clears the threshold plus a refund buffer (D-12). The rest goes to the card with the highest MV.
- **Allocation only.** The engine never suggests a purchase, never increases optional spending, and never suggests cancelling or postponing a necessary expense to change totals. Optional purchases get a neutral impact note only.
- **Algorithm requirement** (not a design). Whatever method is chosen must:
  - find the optimum on every fixture;
  - never score worse than putting everything on one card, or than the "highest nominal rate" rule of thumb;
  - label results as heuristic when they are not from an exact search. Exact search is expected to be feasible for about 15 expenses per window and 5 cards.

**Invariants** (REQ-REC-INV-01):

| ID | Invariant |
|---|---|
| INV-1 | Each expense-month is allocated to exactly one payment method |
| INV-2 | Each offer's bonus is counted at most once per user |
| INV-3 | Each fee is counted once per horizon |
| INV-4 | Each point is committed to at most one trip; the user sets priority between trips |
| INV-5 | Each transfer bonus is applied once per transfer |
| INV-6 | Refunds create negative ledger entries and trigger replanning; they are never silently netted |
| INV-7 | Daily, weekly and monthly entries are normalised before allocation; the original entry is retained |
| INV-8 | **Objective neutrality:** no scoring term increases with gross spend, gross points or bonus count by themselves. Only usable value, residual value, cash and fees count. |

### 7.7 Book now vs wait (REQ-OWN-05; full decision table in doc 02, section 3)

**Inputs:**
- **LSBD** = min(hard deadline, the user's booking cut-off) − safety buffer (AS-16, default 3 days).
- **AFD** = the first date on which projected **usable** points ≥ `Need_p`, plus the maximum transfer lead time.
- **Cash scenarios:** the base case (the current quote) and a pessimistic case, base × (1 + X), with X = 15% (AS-17). X is labelled "assumption, not a forecast".
- Also: the per-programme **estimated** release window (AS-03; `UNKNOWN_AVAILABILITY` if none), expiries, offer deadlines, the reserve, and the fallback cost (refundable premium or hold).
- **Availability-state rule** (section 5.2a):
  - While the award leg is `NOT_YET_SEARCHABLE`, `ESTIMATED_RELEASE_WINDOW` or `UNKNOWN_AVAILABILITY`, the outcome can only be `MONITOR_NO_TRANSFER`, `TOO_UNCERTAIN`, or `WAIT_ACCUMULATE`. `WAIT_ACCUMULATE` is allowed **only if a cash quote exists** for the comparison.
  - If the cash leg isn't searchable either, `WAIT_ACCUMULATE` is not allowed.
  - `BOOK_*` outcomes need a searchable result.

**Outcomes:**

| Outcome | Short definition |
|---|---|
| `BOOK_CASH_NOW` | Cash wins now, or waiting fails a condition and the cash option is acceptable |
| `BOOK_AWARD_NOW` | Usable points ≥ need now, and the award wins on the objective. The instruction is to **re-check live availability before transferring**. |
| `MONITOR_NO_TRANSFER` | Points are sufficient, or will be, but availability is unverified or cached. Keep watching; do not transfer. |
| `WAIT_ACCUMULATE` | All of these hold: AFD ≤ LSBD; AFD ≤ the latest award date realistically bookable; the award still wins in the pessimistic cash scenario; a cash fallback remains bookable; the fallback cost is below the expected benefit; the reserve holds |
| `CASH_BETTER_THAN_AWARD` | `EC(award) ≥ EC(cash)` at the user's valuation |
| `INSUFFICIENT_BY_DEADLINE` | AFD > LSBD |
| `TOO_UNCERTAIN` | The leading options are within tolerance **and** a key input is unverified or low-confidence. Options are shown side by side with no recommendation. |

Every outcome carries a message, a **revisit date**, and **invalidating events** (doc 02, section 3).

### 7.8 Explanation contract (REQ-REC-EXPL-01)

Every recommendation object has these nine fields, and validation fails if any is missing:

| # | Field | Content |
|---|---|---|
| 1 | `selectedBecause` | Why it was selected |
| 2 | `inputsUsed` | The user's relevant inputs and preferences |
| 3 | `assumptions[]` | Assumptions used |
| 4 | `tradeoffs` | Cash, points and fees |
| 5 | `feesAndEligibility` | Fees and eligibility restrictions |
| 6 | `evidence[]` | Source, URL, `verifiedAt`, status |
| 7 | `uncertainty` | What is uncertain, plus missing information |
| 8 | `rejectedAlternatives[]` | Option and reason; must include "spend more on card X" when its MV = 0 |
| 9 | `nextAction` | What to do, and by when |

The optional LLM may **only rephrase** these fields. A validator rejects any output containing a number, date, programme or card that isn't in the object (T-SEC-008).

### 7.9 Rejection memory (REQ-REC-REJ-01)

- **Scope:** this trip / all trips / "until terms change materially". A material change means a new offer snapshot hash with a change in fee or bonus.
- **Opt-in notification:** the user is told about a material change only if they opted in to hear about it.
- **No repeated push:** a rejected product never reappears as a recommendation. It is listed under rejected alternatives as "you declined".
- **Recompute:** every rejection triggers a recompute (R-EV-06).

### 7.10 Confidence levels (REQ-REC-CONF-01)

| Level | Conditions |
|---|---|
| **High** | Prices are `VERIFIED_RESULT` (real, authorised, live); all rules used are VERIFIED; balances are exact; no CONFLICTING rule; dates are fixed or flex results are complete. **Not reachable in the hackathon.** |
| **Illustrative** (corrected in audit) | Any deciding input is `LIVE-TEST` or `ILLUSTRATIVE`. The calculation can be fully correct, but the result says nothing about real market prices (section 7.12). This replaces the earlier rule that a demo fixture could reach High. |
| **Medium** | Any of: a cached price < 24 h old; a VERIFIED-FAQ rule; range balances; an estimated posting date |
| **Low** | Any of: a SECONDARY or CONFLICTING rule used in a deciding term; cached > 24 h; transport cost not entered; a forecast-dependent outcome |
| **Insufficient** | A required input is missing. No verdict is given; the missing input is named. |

### 7.11 Provenance labels (REQ-RES-17)

`LIVE-TEST` (Duffel test environment, not a real price) · `CACHED` (seen X min ago) · `ILLUSTRATIVE` (mock) · `ESTIMATE` (future scenario) · `CONFIRMED BOOKING (TEST)` · `UNCONFIRMED OPTION`.

In the hackathon there are **no verified live real-world prices**.

### 7.12 Calculation correctness vs data provenance (REQ-RES-19) `[RECOMMENDATION]`

Every displayed result has two **independent** properties, and the UI must never merge them.

| Property | Question it answers | Values | Evidence |
|---|---|---|---|
| **Calculation status** | Was the arithmetic done right for these inputs? | `TESTED_ENGINE` (deterministic, version-recorded, covered by T-CALC/T-ALLOC) | Engine version + test suite |
| **Data status** | Do the inputs reflect the real world right now? | `VERIFIED_RESULT`, `CACHED`, `LIVE-TEST`, `ILLUSTRATIVE`, `USER_ENTERED`, `ESTIMATE` | Provenance badge + quote log |

**Rules for the hackathon (P0):**
1. **No real prices.** Duffel test prices (test airline ZZ) and mock award prices are **never** presented as real market prices, real availability or real savings.
2. **Hero wording.** With illustrative or test data, the hero says **"Example saving (illustrative data)"**, never "You save".
3. **"Total saved".** For test bookings it is labelled "illustrative total from test bookings".
4. **No real-flight claim.** When a LIVE-TEST cash price is shown next to an ILLUSTRATIVE award price, the pair is labelled "illustrative pairing – not the same real flight".
5. **Wording check.** The demo script and copy must pass a check that bans "real price", "real saving", "you will save" and "guaranteed" (T-DEMO-005).
6. **No High confidence.** Illustrative and test data cap confidence at **Illustrative** (section 7.10).

### 7.13 Forecast granularity and reconciliation (REQ-REC-FCST-01) `[RECOMMENDATION]`

**The mismatch.** Users give **category totals**, but some rules depend on **individual transactions or merchants**:
- per-transaction rounding (Amex);
- merchant eligibility (Iberia Club "partners", Amex "travel companies", Spanish-supermarket rates);
- merchant-code exclusions (Revolut: utilities, rent, taxes; Iberia Cards excluded sectors);
- wallet caps;
- marketplace and payment-platform exceptions.

**Rules:**
1. **Forecasts are estimates.** Every forecast built from category totals is an `ESTIMATE`, and its confidence is at most **Medium** (Illustrative in the hackathon).
2. **Rounding unknowable from totals.** The forecast applies `rate × total` with `floor` per period and labels the result "±; actual depends on individual purchases".
3. **Merchant eligibility.** This is asked per category (Q-SPEND-02b):
   - **Yes:** the category rate applies.
   - **No:** the base rate applies.
   - **Not sure:** the base rate applies. If the category is on the card's exclusion list, the expected earn is **0**.
4. **Uncertainty band.** The forecast shows a conservative-to-expected band. The **conservative** value drives verdicts (AFD, goal-met); the expected value is shown for information only.
5. **Actual posted rewards replace estimates.** When the user updates a balance (R-EV-04), or records the points actually posted for a card and month:
   - the actual figure replaces that month's estimate;
   - future months are re-projected from the actual balance;
   - the difference (actual − estimate) is shown in "What changed".
   - **P1:** if the difference exceeds 10% for 2 consecutive months, the app prompts the user to review that card's assumptions (rate, eligibility, exclusions).
6. **No transaction import in P0.** No bank or transaction-level data is collected or imported (REQ-OWN-11).

### 7.14 Points purchase as a gap-fill only (REQ-REC-BUY-01) `[CLIENT-GUIDE]` `[RECOMMENDATION]`

Buying points (Avios, RevPoints, etc.) is **never** a default strategy. It may be shown only when all of these hold:

| # | Condition |
|---|---|
| 1 | A **specific** award has been found (ideally checked live by the user, step 1 of the award steps) |
| 2 | The gap is small: at most 20% of the award's points (D-25, `[OPEN QUESTION]`) |
| 3 | The user has entered the current purchase price, so the app never assumes a price |
| 4 | Gates G2–G4 pass |

**Calculation.** Purchased points are a **cash** cost, not a valuation:

`EC(award with top-up) = cashOut(award) + gap × purchasePrice + (points_already_held × v)`

**Message.** "Topping up only makes sense once you've confirmed the seat." The purchase step comes after the live check and before the transfer step.

---

## 8. Where AI is used, and where it must not be

`[RECOMMENDATION]` The final AI architecture is out of scope for Phase 1.

| Use | Allowed? | Evidence needed |
|---|---|---|
| Rephrase explanation-contract fields into plain English | Yes (optional, behind a flag) | Output must pass the number and entity validator; labelled "AI-generated explanation of calculated results" (AI Act Art. 50) |
| Suggest a missing-information question ("Do you know your Iberia balance?") | Yes | Chosen from a fixed list keyed to missing fields |
| Pre-fill a trip from a pasted link or screenshot (P2) | Yes | The user must confirm every field; nothing is used until confirmed |
| Research, documentation, test-catalogue maintenance (build time) | Yes | Human review; sources cited |
| Any arithmetic, money, points or FX | **No** | Deterministic engine only |
| Booking status | **No** | Provider response only |
| Balances | **No** | User-entered or authorised source only |
| Award availability | **No** | Authorised source, or labelled mock |
| Future prices | **No** | Labelled scenarios only |
| Eligibility or approval | **No** | Rules plus user answers; never "approval odds" |
| Transfer instructions | **No** | Verified transfer graph only |

---

## 9. Functional requirements catalogue

Each block lists: Source, Priority, Goal, Behaviour, Preconditions, Inputs → Outputs, Rules, Alternatives, Errors, Acceptance criteria (Given/When/Then, AC-x), Edge cases, Tests.

Every `REQ-REC-*` requirement references P-01 / REQ-OWN-000.

### 9.0 Principle

#### REQ-OWN-000: Optimise for the user's best outcome, not maximum spending (P-01)
- **Source:** `[OWNER]` final addendum. **Priority:** P0.
- **Goal:** The user pays the least necessary and earns only rewards with genuine value for the trip.
- **Behaviour:**
  - All scoring uses usable value, residual value, cash and fees (INV-8).
  - Allocation-only rule; goal-met rule; minimal overshoot.
- **Preconditions:** Any recommendation that involves cards or points.
- **Inputs → Outputs:** necessary planned expenses, cards, balances, need → allocation and verdict with explanation.
- **Rules:** sections 7.5 and 7.6; NB-3.
- **Alternatives:** If no points use exists, the result is cash-optimal allocation and cash booking.
- **Errors:** If a forbidden scoring term is detected in a test, the build fails.
- **Acceptance criteria:**
  - **AC-1:** Given two allocations with equal usable value where one routes more spend to a card, when ranked, then the one with less spend on that card is never ranked below the other (T-REG-120).
  - **AC-2:** Given trip need is met, when more planned spend exists, then no recommendation increases points in the trip programme for its own sake, and the message "goal met" is shown (T-CALC-117).
  - **AC-3 (negative):** Given an optional purchase, when the plan is computed, then the system never suggests making it to earn rewards (T-CALC-103).
- **Edge cases:** EC-SPD-10, EC-MARG-01–06, EC-ALLOC-11.
- **Tests:** T-REG-120, T-CALC-114–119, T-ALLOC-116, T-CALC-103.

### 9.1 Brief requirements `[BRIEF]`

#### REQ-BRF-01: Quick Flight
- **Priority:** P0.
- **Goal:** One route, one answer, fast (B-2).
- **Behaviour:**
  - Essentials form (Q-TRIP-01–08, Q-FLEX chip).
  - Guest allowed.
  - Returns Normal / Hacked / Saving plus a ranked option list.
- **Preconditions:** none.
- **Inputs → Outputs:** trip essentials → comparison card, options, explanation, actions.
- **Rules:** section 7.2; final-price rule REQ-RES-01.
- **Alternatives:** no award options → cash comparison with flexibility (R7).
- **Errors:** validation errors inline (T-VAL-*); provider failure → mock or cached with a label (EC-TECH-01).
- **Acceptance criteria:**
  - **AC-1:** Given MAD→PEK return, exact dates, 1 adult, economy, when searched in demo mode, then Normal, Hacked and Saving (€ and %) render on first view at 360 px without scrolling the hero card (T-FUN-001, T-RESP-001).
  - **AC-2 (negative):** Given origin = destination, when submitted, then an inline error appears and no search runs (T-VAL-001).
- **Edge cases:** EC-TRIP-01, 02, 13, 14.
- **Tests:** T-FUN-001, T-FLOW-001, T-VAL-001, T-VAL-002.

#### REQ-BRF-02: Full Trip Plan
- **Priority:** P0.
- **Goal:** Several stops, dates and travellers (B-2).
- **Behaviour:**
  - Builder for 2–6 legs, with per-leg date, flex and cabin.
  - Evaluates per-leg options **and** whole-itinerary fares.
  - Enforces a shared points pool (INV-4) and connection feasibility.
  - Explains when per-leg optimisation conflicts with whole-trip optimisation.
- **Preconditions:** ≥ 2 legs.
- **Inputs → Outputs:** legs → per-leg table, trip total Normal / Hacked / Saving, chosen combination, explanation.
- **Rules:** sections 7.2 (N for multi-leg) and 7.6; REQ-REC-MULTI-01.
- **Alternatives:** a leg with no quote → partial result clearly marked (EC-TECH-04).
- **Errors:** overlapping legs → blocking error (EC-TRIP-07).
- **Acceptance criteria:**
  - **AC-1:** Given CS-05, when computed, then the result is the open-jaw cash fare plus the domestic leg (€970), the infeasible "both awards" combination (€920) is listed as rejected with the reason "needs 50,000 points; you have 30,000", and the saving is €0.00 (0.0%) (T-CALC-007).
  - **AC-2:** Given an edit to leg 2, when saved, then legs 1 and 3 and any approved decisions are preserved (T-REG-008).
- **Edge cases:** EC-TRIP-03, 05, 07, 20; EC-OPT-09, 18.
- **Tests:** T-FUN-002, T-FLOW-009, T-CALC-007, T-VAL-008.

#### REQ-BRF-03: Normal vs Hacked vs Saving, impossible to miss
- **Priority:** P0.
- **Goal:** "The savings are the product" (B-5).
- **Behaviour:**
  - Hero comparison shows Normal (all-in €), Hacked (cash you pay + points used), economic Saving (€ and %), and cash saving today.
  - The provenance badge is visible.
  - A negative economic saving is shown honestly as "Cash is better".
- **Rules:** section 7.2; REQ-RES-13 (no "free").
- **Acceptance criteria:**
  - **AC-1:** Given CS-03, then the hero shows "€2,900 → €380 + 70,500 Avios; economic saving €1,674 (57.7%); cash saving today €2,520" (T-FUN-003).
  - **AC-2:** Given CS-04, then the hero says "Cash is better by €98" and does not show "€310 saved" as a saving (T-CALC-106).
  - **AC-3:** Savings are not conveyed by colour alone (T-A11Y-003).
  - **AC-4 (audit):** Given any deciding input is LIVE-TEST or ILLUSTRATIVE, then the hero reads "Example saving (illustrative data)" and never "You save". Confidence shows "Illustrative" (T-FUN-031, REQ-RES-19).
- **Edge cases:** EC-OPT-01, 12; EC-OPT-22.
- **Tests:** T-FUN-003, T-FUN-031, T-CALC-106, T-A11Y-003, T-RESP-001–004.

#### REQ-BRF-04: Savings in € and %, explained simply
- **Priority:** P0.
- **Behaviour:**
  - Calculations follow sections 7.1 and 7.2.
  - A one-line reason plus an expandable breakdown (fare, taxes, surcharges, points × value, fees).
  - Explanation contract fields are always present.
- **Acceptance criteria:**
  - **AC-1:** Given CS-01, then the saving is €78 (10.0%) with the reason "Flying 2 days later is €78 cheaper" (T-CALC-004).
  - **AC-2:** Given a percentage of x.x5, then it rounds half away from zero (T-CALC-002).
- **Tests:** T-CALC-001, T-CALC-002, T-CALC-004, T-FUN-027.

#### REQ-BRF-05: Book, or get clear steps to book
- **Priority:** P0.
- **Behaviour:**
  - **Cash:** test checkout through Duffel test mode.
    - Re-fetch the offer, handle `price_changed`, `offer_expired` and `offer_no_longer_available`.
    - Collect passenger details, pass them through to the provider, and don't store them.
    - Show "CONFIRMED BOOKING (TEST), no real ticket".
  - **Award:** step-by-step guide.
    1. Check live availability on the programme site.
    2. Check taxes and surcharges.
    3. Check who can travel (REQ-RES-05) and infant rules (REQ-RES-04).
    3a. Check the transfer preconditions: bridge account, linked accounts, matching details, account age (REQ-RES-20). If the user is a little short, an optional gap-fill top-up is offered here (REQ-REC-BUY-01).
    4. Transfer, with the irreversible warning (REQ-RES-08).
    5. Book.
    6. Record the outcome.
- **Errors:** duplicate submission guarded by an idempotency key (EC-TECH-16).
- **Acceptance criteria:**
  - **AC-1:** Given a Duffel test offer, when the user confirms, then exactly one test order is created and the reference is shown (T-FUN-005, T-SEC-009).
  - **AC-2:** Given `price_changed`, then the new price is shown and explicit re-confirmation is required (T-INT-004).
  - **AC-3:** Given an award option, then the steps include a live-check step **before** the transfer step (T-FUN-019).
- **Edge cases:** EC-OPT-03, 10; EC-TECH-03, 16, 17; EC-TRIP-16, 17.
- **Tests:** T-FUN-004, T-FUN-005, T-FLOW-015, T-INT-003–005, T-SEC-009.

#### REQ-BRF-06: Mobile first, responsive, all states designed
- **Priority:** P0.
- **Behaviour:**
  - Works from 360 px.
  - Loading, empty, error, partial, stale and success states for every async view.
  - Human error messages with a way out (B-9).
- **Acceptance criteria:**
  - **AC-1:** Pages render without horizontal scroll at 360, 768 and 1280 px (T-RESP-001–003).
  - **AC-2:** A provider timeout shows partial results and a retry action (T-INT-001).
- **Tests:** T-RESP-001–004, T-A11Y-001–004, T-FUN-012, T-INT-001.

#### REQ-BRF-07 `[BRIEF-IDEA]`: Flexible dates and nearby airports
- **Priority:** P0.
- **Behaviour:** Q-FLEX semantics (section 5.3); transport cost handling.
- **Acceptance criteria:**
  - **AC-1:** Given ±3 days, then the cheapest in-window date is used for H, and N stays the exact date (T-CALC-004).
  - **AC-2:** Given a hard date, then off-date options are never recommended (T-CALC-013).
- **Edge cases:** EC-TRIP-01, 08; EC-OPT-07, 08.
- **Tests:** T-CALC-004, T-CALC-013, T-FLOW-008.

#### REQ-BRF-08 `[BRIEF-IDEA]`: Use the points the user already has
- **Priority:** P0 (M2).
- **Behaviour:** Q-BAL; affordability Yes / No / Maybe / Unknown.
- **Acceptance criteria:**
  - **AC-1:** Given range 20–50k and a need of 55,000, then affordability = No (T-FUN-007).
  - **AC-2:** Given "unknown", then no balance is assumed and break-even is shown (T-CALC-110).
- **Edge cases:** EC-CARD-04, 05.
- **Tests:** T-FUN-007, T-FLOW-002, T-CALC-110.

#### REQ-BRF-09 `[BRIEF-IDEA]`: Miles, points and transfer partners
- **Priority:** P0.
- **Behaviour:** Verified transfer graph with country-keyed ratio, minimum, increment, delay and status (REQ-RES-07).
- **Acceptance criteria:**
  - **AC-1:** Given Amex MR issued in Spain → Iberia, then 1:1. Given issued in the Netherlands, then 3:2 (T-CALC-010).
  - **AC-2:** Given Flying Blue minimum 500 and increment 5, then 12,503 points → 12,500 transferable (T-CALC-011).
  - **AC-3:** Given Emirates via Amex Spain, then it's unavailable and labelled "suspended" (EC-CARD-10).
- **Tests:** T-CALC-010, T-CALC-011.

#### REQ-BRF-10 `[BRIEF-IDEA]`: Saved trips and total saved
- **Priority:** P0.
- **Behaviour:**
  - Saving needs sign-in.
  - Guest trips migrate on sign-in (REQ-OWN-12).
  - "Total saved" sums economic savings of **booked** trips only, labelled "estimated".
- **Acceptance criteria:**
  - **AC-1:** Given 2 booked trips (test), then the total equals the sum of their stored savings results (T-FUN-006).
  - **AC-2:** Given a duplicate save, then the user is offered "already saved – open it" (EC-TECH-21).
- **Tests:** T-FUN-006, T-FLOW-016, T-FLOW-017.

#### REQ-BRF-11 `[BRIEF-IDEA]`: Price alerts for saved trips
- **Priority:** P1.
- **Behaviour:** A user-set threshold in € or points; at most one alert per dedupe key (EC-TECH-09). In P0 this is replaced by revisit-date reminders (in-app and .ics).
- **Tests:** T-FUN-030, T-TIME-011.

#### REQ-BRF-12 `[BRIEF-IDEA]`: Paste a booking link or screenshot
- **Priority:** P2.
- **Behaviour:** AI pre-fill, and every field must be confirmed (section 8).
- **Tests:** T-FUN-015.

### 9.2 Owner requirements `[OWNER]`

#### REQ-OWN-01: Long-term planning (3, 6, 12 months or longer)
- **Priority:** P0 lite / P1 full.
- **Behaviour:**
  - M3 target date; monthly forecast to LSBD; timeline of actions with dates.
  - **No universal horizon limit** (REQ-RES-21).
- **Acceptance criteria:**
  - **AC-1:** Given departure in 12 months, then the timeline includes the programme's **estimated** release window (AS-03, labelled "estimate, not confirmed"), the transfer deadline, LSBD and revisit dates (T-FLOW-007).
  - **AC-2 (audit):** Given departure in 500 days, then planning works and the award state is `ESTIMATED_RELEASE_WINDOW` (or `UNKNOWN_AVAILABILITY` if the programme has no estimate). No `BOOK_*` verdict is given (T-TIME-012).
- **Edge cases:** EC-TRIP-15, EC-TRIP-21.
- **Tests:** T-FLOW-007, T-TIME-010, T-TIME-012.

#### REQ-OWN-02: Multiple cards and loyalty currencies
- **Priority:** P0 (existing cards) / P1 (new).
- **Behaviour:** Wallet showing programmes separately; cards with rules; transfer graph.
- **Acceptance criteria:**
  - **AC-1:** Given MR 45,000 and Avios 12,000, then they are never shown summed. Usable Avios for an Iberia award is 57,000 only after a labelled 1:1 transfer path (T-FLOW-003).
- **Tests:** T-FLOW-003, T-FUN-007, T-FUN-008.

#### REQ-OWN-03: Spending profile without double counting
- **Priority:** P0 (monthly categories).
- **Behaviour:** Q-SPEND normalisation (INV-7); overlap prompt.
- **Acceptance criteria:**
  - **AC-1:** Given €10 a day on groceries, then monthly = €304.17 (10 × 365 / 12) (T-FUN-009).
  - **AC-2:** Given weekly €70 dining, then monthly = €303.33 (T-FUN-009).
  - **AC-3:** Given the same category entered twice, then the duplicate prompt appears and only one is used (T-ALLOC-007).
- **Edge cases:** EC-SPD-01, 02, 03.
- **Tests:** T-FUN-009, T-ALLOC-007.

#### REQ-OWN-04: Planned purchases
- **Priority:** P0.
- **Behaviour:** Q-PURCH, with necessity and refund status.
- **Acceptance criteria:**
  - **AC-1:** Given an `optional` item, then it never counts toward a threshold (T-CALC-103).
  - **AC-2:** Given `already_paid`, then it's excluded from allocation (T-FUN-010).
- **Edge cases:** EC-SPD-04, 05.
- **Tests:** T-FUN-010, T-CALC-103.

#### REQ-OWN-05: Book now vs wait
- **Priority:** P0 (outcomes with fixtures).
- **Behaviour:** Section 7.7; decision table in doc 02, section 3.
- **Acceptance criteria:** see T-TIME-001–007 (each outcome has a Given/When/Then in doc 02).
- **Edge cases:** EC-OPT-11, 19, 20.
- **Tests:** T-TIME-001–007, T-TIME-112.

#### REQ-OWN-06: No guaranteed predictions
- **Priority:** P0.
- **Behaviour:** Future values appear only as `ESTIMATE` scenarios with an assumption label; banned words list ("guaranteed", "will drop", "free").
- **Acceptance criteria:**
  - **AC-1:** No result contains banned words (T-FUN-022).
  - **AC-2:** The pessimistic scenario shows "assumption, not a forecast" (T-TIME-006).
- **Tests:** T-FUN-022, T-TIME-006, T-FUN-012.

#### REQ-OWN-07: Hard constraints beat savings
- **Priority:** P0.
- **Acceptance criteria:**
  - **AC-1:** Given a hard return date and a €200 cheaper option one day later, then it isn't recommended. It appears in "what you're missing" only if enabled (T-CALC-013).
- **Edge cases:** EC-OPT-08.
- **Tests:** T-CALC-013.

#### REQ-OWN-08: Replanning with versions and protected approvals
- **Priority:** P0 (recompute + diff) / P1 (full history UI).
- **Behaviour:** 14 events R-EV-01–14 (doc 01, section 6). Each produces a new draft plan version and a "What changed" card. Approval is required if any approved action changes. Concurrent changes merge into one draft.
- **Acceptance criteria:**
  - **AC-1:** Given an approved plan and an added €1,200 purchase, then a draft version shows deltas per dependency link and the approved version is kept until the user accepts (T-REG-107).
  - **AC-2:** Given two edits within the same session, then one draft is produced, re-based (T-REG-016).
- **Edge cases:** EC-TECH-08; EC-SPD-06.
- **Tests:** T-REG-001–016, T-REG-107.

#### REQ-OWN-09: Useful with no points or cards
- **Priority:** P0.
- **Behaviour:** Refusal paths R1–R8 (doc 01, section 4).
- **Acceptance criteria:**
  - **AC-1:** Given no cards and no balances, then the result shows the cash comparison, flexibility savings and award points needed with break-even, and no card suggestion (T-FLOW-001, T-FLOW-006).
- **Edge cases:** EC-ONB-04.
- **Tests:** T-FLOW-001, T-FLOW-005, T-FLOW-006, T-CALC-110.

#### REQ-OWN-10: Goal A vs Goal B
- **Priority:** P0.
- **Acceptance criteria:**
  - **AC-1:** Given CS-04 and Goal A, then the award ranks first (cash €310 < €620) with the note "economic cost is €98 higher". Under Goal B, cash ranks first (T-CALC-012).
- **Edge cases:** EC-OPT-12.
- **Tests:** T-CALC-012, T-FUN-013.

#### REQ-OWN-11: Data minimisation; no payment credentials
- **Priority:** P0.
- **Behaviour:**
  - No card number, last 4 digits, CVV or bank login fields.
  - Server rejects card-number-like strings, and nickname text is checked against a card-number pattern (Luhn).
  - Income is never asked.
- **Acceptance criteria:**
  - **AC-1:** Given a 16-digit Luhn-valid string in a nickname, then it's rejected with "Please don't enter card numbers" (T-SEC-002).
- **Tests:** T-SEC-002, T-FUN-008, T-FUN-011.

#### REQ-OWN-12: Accounts on a free tier, plus guest mode
- **Priority:** P0.
- **Behaviour:**
  - Guests can use Quick Flight, Full Trip Plan and results.
  - Email sign-in is needed to save.
  - Guest data in local storage migrates once, with conflict prompts (EC-ONB-08).
- **Acceptance criteria:**
  - **AC-1:** Given a guest trip, when the user signs in, then the trip appears in Saved trips exactly once (T-FLOW-017).
  - **AC-2:** Given the email isn't received, then a resend with cooldown is offered (EC-ONB-09).
- **Tests:** T-FUN-006, T-FLOW-017, T-FLOW-018.

#### REQ-OWN-13: Financial safety gates
- **Priority:** P0.
- **Behaviour:** G1–G8 (section 7.5).
- **Acceptance criteria:** S-03, S-11, S-12 and S-13 behave as specified (T-CALC-103, T-CALC-113, T-CALC-108).
- **Edge cases:** EC-SPD-09, 10, 13.
- **Tests:** T-CALC-103, T-CALC-108, T-CALC-113.

### 9.3 Research-driven requirements `[RESEARCH]`

| ID | Requirement | Priority | Acceptance criteria (summary; full Given/When/Then in doc 02) | Edge cases | Tests |
|---|---|---|---|---|---|
| REQ-RES-01 | All-in final price wherever any cash price appears (lists, grids, calendars, alerts). Breakdown one tap away. Extras opt-in. EUR. | P0 | Every rendered cash amount equals the all-in total. No base fare is used as a headline. | EC-TRIP-09 | T-FUN-016 |
| REQ-RES-02 | Quote expiry and re-pricing. Show a countdown for live offers; re-fetch before booking. | P0 | An expired offer prompts a new search, not a retry | EC-TECH-03, 17 | T-INT-003, T-INT-004 |
| REQ-RES-03 | Passenger ages under 18; each infant linked to a unique adult | P0 | 2 infants with 1 adult is blocked | EC-TRIP-04, 19 | T-VAL-005, T-VAL-006 |
| REQ-RES-04 | Infant plus award: instructions route to a phone booking (Iberia, Flying Blue) | P0 | Steps show "call the programme" and no online path | EC-TRIP-16 | T-FUN-017 |
| REQ-RES-05 | Award traveller relationship: member, beneficiary or companion (Iberia) | P0 | A non-beneficiary flying alone on Iberia Avios gets the "register as beneficiary first" step | EC-TRIP-17 | T-FUN-018 |
| REQ-RES-06 | Three-state fare conditions: allowed (penalty) / not allowed / unknown | P0 | `null` shows "Unknown" and doesn't satisfy "refundable needed" | EC-TRIP-10 | T-INT-010 |
| REQ-RES-07 | Verified transfer graph only, with country-keyed ratios, minimum, increment, delay and status | P0 | See REQ-BRF-09 acceptance criteria | EC-CARD-07, 10, 19, 20 | T-CALC-010, T-CALC-011 |
| REQ-RES-08 | No transfer before a live check. Irreversible confirmation. Transfer step placed after the availability step. | P0 | Steps are ordered; a confirmation checkbox is required | EC-CARD-09, EC-OPT-03 | T-FUN-019 |
| REQ-RES-09 | Expiry rules per programme (Avios 36 months of inactivity, with transfers not counting; Flying Blue 24 months; RevPoints 3 years; MR none while enrolled, but forfeited on cancel) | P0 | Expiry before the trip shows a warning with an activity hint | EC-CARD-06, EC-RWD-13 | T-TIME-008 |
| REQ-RES-10 | Separate-ticket warning and risk text | P0 | The badge and text appear whenever more than one ticket is involved | EC-OPT-06 | T-FUN-020 |
| REQ-RES-11 | "How we calculate and rank" page linked from results (TRLGDCU Art. 20.3) | P0 | The link is visible on the results page | — | T-FUN-014 |
| REQ-RES-12 | Savings-claim substantiation: a dated log of the quotes behind each displayed saving | P0 | Each savings result references stored quote IDs | — | T-FUN-021 |
| REQ-RES-13 | No "free" wording for taxed awards (LCD Art. 22.5) | P0 | Banned-word check passes | — | T-FUN-022 |
| REQ-RES-14 | AI-generated text is labelled (AI Act Art. 50) | P0 if the LLM is enabled | The label is present on every AI text | EC-TECH-18 | T-FUN-023, T-SEC-008 |
| REQ-RES-15 | Analytics cookies need consent, with reject shown at the same level as accept; or no analytics (D-14) | P0 | No non-essential cookie is set before consent | EC-ONB-10 | T-FUN-024 |
| REQ-RES-16 | Credit warning plus representative APR (TAE) wherever a card's cost appears. No "advice" or "approval odds" wording. **No affiliate links in P0.** | P0 | Text check on card views | — | T-FUN-025 |
| REQ-RES-17 | Provenance labels (section 7.11) | P0 | Every price has exactly one badge | EC-TECH-05, 13 | T-FUN-012, T-DEMO-001 |
| REQ-RES-18 | Destination entry notice (e.g. China visa-free ends 31/12/2026) with an official link, "check before travel" | P1 (P0 static for the China demo) | A notice shows for affected trips | EC-TRIP-18 | T-FUN-026 |
| REQ-RES-19 | Calculation correctness kept separate from data provenance. Test and illustrative data never presented as real prices or real savings (section 7.12). | P0 | Hero shows "Example saving (illustrative data)"; illustrative pairing labelled; no banned claims; confidence capped at Illustrative | EC-OPT-22, EC-TECH-13 | T-FUN-031, T-DEMO-005 |
| REQ-RES-20 | Avios move preconditions: BA as the usual bridge; Qatar linked to BA first; matching names, date of birth and email; account age ≥ 30 days (90-day BA reading for Iberia is CONFLICTING, so the stricter one applies) | P0 | Award steps show the preconditions before the transfer step; a failed precondition blocks the step with the reason | EC-CARD-19, 21, 22, 23 | T-FUN-032 |
| REQ-RES-21 | No universal planning-horizon limit; availability states per leg (section 5.2a) | P0 | A trip 500 days out can be planned. Award is `ESTIMATED_RELEASE_WINDOW` or `UNKNOWN_AVAILABILITY`; cash is `NOT_YET_SEARCHABLE` if beyond the provider horizon; no `BOOK_*` verdict | EC-TRIP-15, EC-TRIP-21 | T-VAL-003, T-TIME-012 |

### 9.4 Recommendation-system requirements `[RECOMMENDATION]` (all reference P-01)

| ID | Requirement | Priority | Key acceptance criteria | Edge cases | Tests |
|---|---|---|---|---|---|
| REQ-REC-RULE-01 | Reward-rule taxonomy RT-01–06 with conservative defaults and conflict handling | P0 (RT-01, 03, 04, 06) / P1 (RT-02, 05) | Unknown rounding uses `floor`; a hard-stop cap earns 0 above the cap; ambiguous cap scope uses the restrictive reading plus a sensitivity (Iberia Aire); maximum posting delay is used for deadlines; conflicting sources take the restrictive reading | EC-RWD-01–27 | T-CALC-015–020 |
| REQ-REC-CAT-01 | Catalogue scope, canonical names and website aliases, verification status per product (section 5.11) | P0 | Searching an alias (e.g. "Iberia Icon Aire") finds the canonical product (Iberia Aire). Each product shows its status (catalogue / template / custom) and unverified fields. | EC-CARD-01, EC-CARD-24 | T-FUN-033 |
| REQ-REC-FCST-01 | Forecast granularity labelling; actual posted rewards replace estimates (section 7.13) | P0 (labels, conservative band, manual reconciliation) / P1 (variance prompts) | Category-total forecasts are ESTIMATE with a band; the conservative value drives verdicts; recording an actual posting re-bases projections | EC-RWD-24, 25, 26 | T-CALC-021, T-REG-017 |
| REQ-REC-BUY-01 | Points purchase only as a gap-fill after the award is found (section 7.14) | P0 (calculation when the user enters a price) | CS-02b: 5,000-point top-up at a user-entered €0.0213 gives an economic cost of €466.50 vs €520 cash, shown only with the "confirm the seat first" step | EC-OPT-21 | T-CALC-023 |
| REQ-REC-CARD-01 | €280 planned vs €300 threshold | P0 | S-01: ΔB = €1.87; no bonus; no extra-spend suggestion | EC-CARD-11, EC-SPD-07 | T-CALC-101 |
| REQ-REC-CARD-02 | A planned expense moved to a better card | P0 | S-04 (corrected): explicit baseline `A_status_quo` = {T: €280, A: €20}; **ΔB_change = €50.14**; the ledger records the A → T move; no duplicate | EC-ALLOC-10, EC-ALLOC-01 | T-ALLOC-102 |
| REQ-REC-CARD-03 | Unnecessary purchase rejected | P0 | S-03: G1 fails; outcome = S-01 | EC-SPD-10 | T-CALC-103 |
| REQ-REC-CARD-04 | Higher rate or bonus outweighed by fees | **P0 engine / P1 UI.** New-card and plan-upgrade fees belong to M4, which is P1. The engine calculation is tested in P0. | S-02b: ΔB_strategy = −€8.00, not recommended; Card U variant (M-06a) | EC-RWD-15 | T-CALC-104 |
| REQ-REC-CARD-05 | Bonus arrives too late for the trip | P0 | S-09: the bonus adds nothing to `UsablePoints`; ΔResidual shown separately and never in ΔB | EC-RWD-20 | T-TIME-105 |
| REQ-REC-CARD-06 | Offer expired or user ineligible | P0 (offers on cards already held) / P1 (new-card offers, M4) | S-13: removed with a reason; recompute | EC-CARD-15 | T-CALC-108 |
| REQ-REC-CARD-07 | User declines all new cards | P0 (rejection memory and the Settings switch; new-card suggestions themselves are P1) | No declined product reappears; recompute | EC-CARD-16, 17 | T-FLOW-109 |
| REQ-REC-CARD-08 | Multiple cards compete for the same expense; overlapping bonuses | P0 (single) / P1 (multi-bonus) | S-06: €44.00; 2 bonuses × €300 with €400 planned: exactly one chosen, the other's reason recorded | EC-SPD-08, EC-ALLOC-07 | T-ALLOC-111 |
| REQ-REC-VAL-01 | Valuation can make cash the better option | P0 | CS-04: EC €718 vs €620; v* = €0.0091 | EC-OPT-01 | T-CALC-106 |
| REQ-REC-REPLAN-01 | A new purchase changes the trip plan | P0 | T-REG-107: reserve, allocation, threshold and verdict deltas shown | EC-SPD-06 | T-REG-107 |
| REQ-REC-DATA-01 | Incomplete spending plus unknown balances | P0 | R3 + R5: affordability "Unknown"; no forecast; break-even shown | EC-CARD-05, EC-ONB-01 | T-CALC-110 |
| REQ-REC-TIME-01 | Missed qualification deadline leads to the cash fallback | P0 | AFD > LSBD, so the outcome switches to `BOOK_CASH_NOW` | EC-CARD-11, EC-OPT-11 | T-TIME-112 |
| REQ-REC-RES-01 | Plan no longer meets the cash reserve | P0 | Flagged; alternatives; approval required | EC-SPD-09, EC-ALLOC-09 | T-CALC-113 |
| REQ-REC-MARG-01 | Equal rewards at €200 and €280 | P0 | M-01: X = €22.10 chosen over Y = €20.00 | EC-MARG-01 | T-CALC-114 |
| REQ-REC-MARG-02 | Cap after which extra spend earns nothing | P0 | M-02: split = €21.33 over all-on-C = €20.00 | EC-MARG-02, EC-RWD-22 | T-CALC-115 |
| REQ-REC-MARG-03 | Better alternative for remaining expenses | P0 | M-03: €500 → Card B (+€10.00); buffer variant €340 / €460 | EC-MARG-03 | T-ALLOC-116 |
| REQ-REC-MARG-04 | Enough points already | P0 | M-04: goal met; cashback K €3.00/month recommended | EC-MARG-04 | T-CALC-117 |
| REQ-REC-MARG-05 | Points with no realistic use before the target date | P0 | M-05: ΔUsable = 0; routed elsewhere | EC-MARG-05 | T-CALC-118 |
| REQ-REC-MARG-06 | Higher nominal rate loses after fees or opportunity cost | P0 for (b) and (c) (cards already held); **(a) is P0 engine / P1 UI**, because a fee only counts for a new card or plan upgrade (a fee already committed on a held card is 0 by the section 7.5 rule) | M-06: (a) −€23.40 vs €8.00; (b) bonus-break; (c) valuation | EC-MARG-06 | T-CALC-119 |
| REQ-REC-INV-01 | Invariants INV-1–8 hold for every plan | P0 | Property and unit tests | EC-ALLOC-01–06 | T-ALLOC-001–008, T-REG-120 |
| REQ-REC-EXPL-01 | Explanation contract (9 fields) and LLM validator | P0 | Missing field means not displayed; LLM numbers must match | EC-TECH-18 | T-FUN-027, T-SEC-008 |
| REQ-REC-REJ-01 | Rejection memory with scopes | P0 | Scope rules hold across trips; a terms-change notification only if opted in | EC-CARD-16, 17 | T-FUN-028, T-FLOW-109 |
| REQ-REC-CONF-01 | Confidence levels (section 7.10) | P0 | Each verdict shows its level and reason | EC-OPT-14 | T-FUN-029, T-TIME-006 |
| REQ-REC-MULTI-01 | Multi-leg combination with a shared pool, and whole-trip fares | P0 | CS-05 result | EC-OPT-09, 18 | T-CALC-007 |
| REQ-REC-BONUS-01 | Bonus value limited by need (S-02c) | P0 | Need already met: the bonus is shown as "not needed for this trip" | EC-MARG-04 | T-FLOW-121 |

---

## 10. Non-functional requirements

| ID | Requirement | Target | Priority | Test |
|---|---|---|---|---|
| REQ-NFR-01 | Time to first comparison | ≤ 3 s in mock mode. ≤ 12 s live, with a 10 s provider timeout and partial results. | P0 | T-INT-001, T-DEMO-001 |
| REQ-NFR-02 | Accessibility | WCAG 2.1 AA target. No serious axe violations. Keyboard operable. Reduced motion respected. | P0 | T-A11Y-001–004 |
| REQ-NFR-03 | Responsive | 360–1440 px; mobile first | P0 | T-RESP-001–004 |
| REQ-NFR-04 | Security | Server-side validation; row-level isolation; secrets server-only; rate limits on search | P0 | T-SEC-001–009 |
| REQ-NFR-05 | Privacy | Data minimisation; export and delete; retention (D-13); DPIA before commercial launch | P0 (export/delete) | T-FUN-011, T-SEC-006 |
| REQ-NFR-06 | Reliability | Full journey works with no live provider (mock mode) | P0 | T-DEMO-003 |
| REQ-NFR-07 | Determinism and auditability | Same inputs and engine version give an identical result; plan versions are immutable | P0 | T-REG-015, T-CALC-001 |
| REQ-NFR-08 | Cost control | Per-user search rate limit; quote cache; LLM optional and capped | P0 | T-SEC-004 |
| REQ-NFR-09 | Observability without leaking data | Logs exclude balances, spending and PII | P0 | T-SEC-007 |
| REQ-NFR-10 | Localisation | English UI for P0 (D-04) with every string in a catalogue ready for es-ES (P1); EUR; locale-aware number formats; airport-local dates; unambiguous date format (e.g. "Mon 26 Oct 2026"); official Spanish programme names kept | P0 | T-TIME-009, T-FUN-034 |
| REQ-NFR-11 | Performance on a phone | Lighthouse 90+ on a real phone (brief, Stage 11) | P0 target | Manual check (doc 02, section 6) |

---

## 11. Decisions and unresolved questions

The full list is in [doc 03](03_PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md). Doc 03 §2A lists the decisions needed for the hackathon MVP; §2B lists those that can wait for commercial launch. These owner decisions block final approval of this document:
- D-04: English UI is confirmed by the owner for P0; client confirmation (QA-11) is open.
- D-25: gap-fill top-up limit.
- D-01: default objective.
- D-02: default valuation.
- D-05: the reserve is required.
- D-08: minimum ΔB.
- D-09: fee horizon.
- D-10: `v_residual`.
- D-11: need buffer.
- D-12: refund buffer.
- D-13: retention.
- D-14: analytics.
- D-15: business model (no commissions).
