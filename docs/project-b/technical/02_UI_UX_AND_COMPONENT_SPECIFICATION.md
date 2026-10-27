# Technical 02: UI/UX and Component Specification

| Field | Value |
|---|---|
| Status | Specification only. No UI has been built. Colour contrast values are **targets**, to be measured with axe in TASK-016. |
| Source | Phase 1 doc 01 (flows F01–F16, IA, states), doc 00 §5 (questions Q-*), doc 02 (tests) |
| Stack | Next.js App Router, Tailwind 4, shadcn/ui (copied components), lucide-react, next-intl (`messages/en.json`) |

**Copy and identity**
- **Language:** English P0 copy (D-04, owner-confirmed). Every string lives in the catalogue so es-ES can be added in P1.
- **Identity:** the visual identity is *inspired by* A Una Milla's travel positioning (Spain, travel hacking, "fly better for less"). **No A Una Milla, airline, bank or card logos are used unless the owner or client provides and approves them.** Card products appear as text names.

---

## 1. Design tokens (CSS variables via Tailwind 4 `@theme`)

| Token | Value (proposed) | Use |
|---|---|---|
| `--color-ink` | `#0F1B2D` | Primary text, headings |
| `--color-sky` | `#1F6FEB` | Primary actions, links |
| `--color-sky-soft` | `#E8F1FE` | Selected states, info surfaces |
| `--color-saving` | `#0E7C4A` | Positive saving (always paired with text and an icon, never colour alone) |
| `--color-warn` | `#B45309` | Stale, estimate, conflicting-terms notices |
| `--color-danger` | `#B42318` | Errors, irreversible-action warnings |
| `--color-sun` | `#F59E0B` | Accent (illustrations, highlights; not for text on white) |
| `--color-surface` / `--color-muted` | `#FFFFFF` / `#F5F7FA` | Backgrounds |
| `--color-border` | `#D8DEE8` | Dividers |
| Radius | `--radius: 0.75rem` (cards), `0.5rem` (inputs) | |
| Spacing | 4 px scale (Tailwind default); section gap 24/32 px | |
| Type | Headings "Plus Jakarta Sans" 600/700; body "Inter" 400/500 via `next/font` (self-hosted, no third-party request) | |
| Type scale | 12 / 14 / 16 (body) / 18 / 20 / 24 / 30 / 36 (hero number) | |
| Motion | 150–200 ms ease-out; disabled under `prefers-reduced-motion` (T-A11Y-004) | |

Contrast targets: body text ≥ 4.5:1, large text ≥ 3:1 (WCAG 2.1 AA). Ink-on-white, sky-on-white and saving-on-white are expected to pass; this is verified in TASK-016.

## 2. Layout and navigation

- **Breakpoints:** 360 (base), 768 (`md`), 1280 (`xl`). Tested by T-RESP-001–004.
- **Mobile:** bottom navigation with *Search · Trips · Wallet · Plan · Settings*. **Desktop (≥ 1280):** left rail with the same items.
- **Global elements:**
  - skip link "Skip to content";
  - `<main id="content">`;
  - DisclaimerFooter (CMP-27) with links to SCR-15 and the privacy page;
  - GuestModeBanner (CMP-10) whenever `AUTH_MODE=guest` or the user is signed out.
- **Results regions** use `aria-live="polite"` for status updates ("Checking prices…", "3 options found").

## 3. Component inventory (CMP-*)

shadcn primitives (copied): Button, Input, Label, Select, Combobox (Command + Popover), Dialog, AlertDialog, Sheet, Tabs, Card, Badge, Tooltip, Toast (Sonner), Skeleton, Table, Form (react-hook-form + zod resolver), Checkbox, RadioGroup, Switch, Progress, Separator.

| CMP | Component | Purpose | Key props / rules | Tests |
|---|---|---|---|---|
| CMP-01 | SavingsHero | Normal vs Hacked vs Saving (€ and %) + cash today | Headline "Example saving (illustrative data)" when any input is LIVE-TEST/FIXTURE; "Cash is better by €X" when saving ≤ 0 | T-FUN-001, 003, 031, T-CALC-106, T-A11Y-003 |
| CMP-02 | ProvenanceBadge | One badge per value (doc 04 §3) | Exactly one per price; icon + text | T-FUN-012 |
| CMP-03 | AvailabilityStateChip | Six availability states | Text label + tooltip | T-TIME-012, T-VAL-003 |
| CMP-04 | ConfidenceChip | High / Illustrative / Medium / Low / Insufficient + reason | Never High in the hackathon | T-FUN-029 |
| CMP-05 | OptionCard | One ranked option | All-in price, points, provenance, conditions (three-state) | T-FUN-016, T-INT-010 |
| CMP-06 | BreakdownTable | Fare, taxes, surcharges, points × value, fees, rewards earned | "Breakdown not available" state | T-INT-008 |
| CMP-07 | AwardStepList | Ordered steps 1, 2, 3, 3a, 4, 5, 6 with guards | Step 4 disabled until 1–3a done; infant/beneficiary branches | T-FUN-004, 017–019, 032 |
| CMP-08 | WhatChangedCard | Replan deltas + Accept / Keep / Edit | Approval required flag | T-REG-107, T-FLOW-011 |
| CMP-09 | PointsGoalMeter | Usable / needed + surplus shown separately | `role="meter"` with `aria-valuenow` | T-CALC-117 |
| CMP-10 | GuestModeBanner | "Saved only in this browser on this device. Not synced or backed up." + "Clear local data" | Dismissible per session, reappears on Saved trips | T-FLOW-001, 017 |
| CMP-11 | AirportCombobox | Search TBL-01/bundled airports | Keyboard: ↑↓ Enter Esc; disambiguation | T-VAL-001 |
| CMP-12 | DateFlexPicker | Date + flex (exact/±N/range/month/anytime) + firmness | Caps per Q-FLEX | T-VAL-012 |
| CMP-13 | TravellerPicker | Adults, children (age), infants (age, lap), responsible adult | Blocks infants > adults | T-VAL-005, 006, 007 |
| CMP-14 | LegEditor | Full Trip Plan legs (2–6), reorder, per-leg cabin | Overlap validation | T-VAL-008 |
| CMP-15 | BalanceInput | Exact / range bucket / unknown + as-of + expiry + account age + linked-via-BA + details-match | Never sums programmes | T-FUN-007, T-VAL-009 |
| CMP-16 | CardPicker | Catalogue/alias search, template, custom; plan + debit/credit for Revolut | Status badge + unverified fields | T-FUN-033, T-FUN-008 |
| CMP-17 | MoneyInput | EUR input, ≤ 2 decimals, locale-aware display | Cents internally | T-VAL-013 |
| CMP-18 | VerdictPanel | 7 outcomes + revisit dates + invalidating events | Outcome text from the catalogue | T-TIME-001–012 |
| CMP-19 | TimelineList | Dated actions + `.ics` button | Dedupe | T-TIME-011 |
| CMP-20 | EmptyState | Reason + two ways forward | — | — |
| CMP-21 | ErrorState | Human message + way out + error ref | — | T-INT-* |
| CMP-22 | PartialResultsNotice | Missing providers + Retry | — | T-INT-001, 007 |
| CMP-23 | StaleDataNotice | Age + Refresh; booking blocked while stale | — | T-FLOW-016 |
| CMP-24 | ConfirmIrreversibleDialog | Transfer confirmation (AlertDialog, focus trapped) | Checkbox required | T-FUN-019 |
| CMP-25 | ExplanationPanel | Explanation contract (9 fields) in plain English; AI label if the LLM is on | Template fallback | T-FUN-027, 023 |
| CMP-26 | AllocationTable | Card per expense + "next €1 here earns X usable points (€Y)" + "maxed for this trip" | Baseline label | T-CALC-114, 025 |
| CMP-27 | DisclaimerFooter | Estimates, illustrative data, no advice, links | — | T-FUN-022 |

## 4. Definitive screen table and specifications

Priority tiers:
- **VS** = hackathon vertical slice.
- **P0r** = remaining P0.
- **P1** = deferred but fully documented.

| SCR | Screen | Route | Tier | Requirements |
|---|---|---|---|---|
| SCR-01 | Landing | `/` | VS | REQ-BRF-01, 03 |
| SCR-02 | Quick Flight search | `/search` | VS | REQ-BRF-01, 07 |
| SCR-03 | Full Trip Plan builder | `/plan/new` | VS | REQ-BRF-02, REQ-REC-MULTI-01 |
| SCR-04 | Results | `/results/[searchId]` | VS | REQ-BRF-03, 04, REQ-RES-19, 21 |
| SCR-05 | Option detail | `/results/[searchId]/[optionId]` | VS | REQ-BRF-04, REQ-REC-VAL-01, REQ-RES-01, 06, 10 |
| SCR-06 | Award booking steps | `/results/[searchId]/[optionId]/award-steps` | VS | REQ-BRF-05, REQ-RES-04, 05, 08, 20, REQ-REC-BUY-01 |
| SCR-07 | Test checkout | `/checkout/[offerId]` | P0r | REQ-BRF-05, REQ-RES-02 |
| SCR-08 | Wallet (balances + cards held summary) | `/wallet` | VS (guest) | REQ-BRF-08, 09, REQ-OWN-02 |
| SCR-09 | Card add/edit | `/wallet/cards/[id]` | P0r | REQ-REC-CAT-01, REQ-OWN-11 |
| SCR-10 | Plan ahead: spending and purchases (basic; detailed tab P1) | `/plan/[tripId]/inputs` | P0r | REQ-OWN-03, 04, 13 |
| SCR-11 | Strategy and verdict | `/plan/[tripId]` | P0r | REQ-OWN-05, REQ-OWN-000, REQ-REC-* |
| SCR-12 | What changed / revisions (latest diff P0; history P1) | `/plan/[tripId]/changes` | P0r | REQ-OWN-08, REQ-REC-REPLAN-01 |
| SCR-13 | Saved trips | `/trips` | P0r | REQ-BRF-10, REQ-OWN-12 |
| SCR-14 | Settings and privacy | `/settings` | P0r | REQ-NFR-05, REQ-RES-15, REQ-REC-REJ-01 |
| SCR-15 | How we calculate and rank | `/how-it-works` | VS | REQ-RES-11, 12 |
| SCR-16 | New-card exploration (M4) | `/plan/[tripId]/new-cards` | P1 | REQ-REC-CARD-04, 06, 07, REQ-RES-16 |
| SCR-17 | Sign-in, errors, 404, offline | `/sign-in`, error boundaries | VS (errors) / conditional (sign-in, D-29) | REQ-OWN-12, REQ-BRF-06 |

**States legend:** L = loading, Su = success, E = empty, P = partial, St = stale, Er = error.

### SCR-01 Landing `/`

| Aspect | Specification |
|---|---|
| Purpose | Promise and entry: "Same trip. Much less money." (`[BRIEF]` tagline), plus a search box and a "Try a demo trip" chip |
| Data | Static copy; demo trips from fixtures |
| Actions | Start Quick Flight (→ SCR-02 prefilled) · Full Trip Plan (→ SCR-03) · How it works (→ SCR-15) |
| Layout | **360:** single column; hero copy, compact search (from/to/date), chips. **768:** search in a card, 2 columns of value points. **1280:** hero left, search card right. |
| States | Su only. Demo chips show a "Demo data" badge. |
| A11y | One `h1`; search form labelled; chips are buttons |
| Ops | none |
| Tests | T-FLOW-001, T-DEMO-004, T-RESP-001–003 |

### SCR-02 Quick Flight search `/search`

| Aspect | Specification |
|---|---|
| Purpose | Collect essentials Q-TRIP-01..08, flex chip, More options (Q-PREF) |
| Data | Airports (API-03 / bundled); profile home airport (user) or last used (guest store) |
| Form | from/to: CMP-11, 1–3 each, from ≠ to · trip type · depart and return dates: CMP-12, not past in airport-local time, return > depart, **no universal max horizon** · travellers: CMP-13 · cabin + minimum/preferred · budget: CMP-17 (optional). Zod schema `QuickSearchSchema` is shared with API-01. |
| Actions | Search → API-01 → SCR-04; Full Trip Plan toggle → SCR-03 |
| Layout | **360:** stacked fields, sticky Search button. **768:** 2-column grid. **1280:** single-row search bar + More options drawer. |
| States | L (button spinner, form disabled) · Er (inline field errors, summary at top with links to fields) |
| A11y | Labels and `aria-describedby` for errors; errors announced; Enter submits |
| Tests | T-VAL-001–007, 012, T-FUN-001, T-A11Y-002 |

### SCR-03 Full Trip Plan builder `/plan/new`

| Aspect | Specification |
|---|---|
| Purpose | Legs 2–6 (CMP-14), travellers, objective, open-jaw and self-transfer flags |
| Data | As SCR-02; guest store draft autosave (EC-ONB-06) |
| Validation | ≤ 6 legs; no overlap (leg n+1 departs after leg n arrives date-wise); per-leg cabin |
| Actions | Add/remove/reorder legs (buttons, keyboard-accessible; no drag-only) · Search → API-02 → SCR-04 |
| Layout | **360:** accordion per leg. **768:** leg cards in 2 columns. **1280:** table-like leg rows. |
| States | L · Er (LEGS_OVERLAP highlighted on the leg) · restored-draft prompt |
| Tests | T-VAL-008, T-FUN-002, T-FLOW-009, T-CALC-007 |

### SCR-04 Results `/results/[searchId]`

| Aspect | Specification |
|---|---|
| Purpose | Hero comparison (CMP-01) + ranked options (CMP-05) + objective toggle (Goal B/A) + filters |
| Data | API-01/02 response (server); provenance and availability per value; for guests the result is held in the guest store by `searchId` |
| Actions | Open option → SCR-05 · Toggle objective (re-rank client-side with the domain `rank` on the returned options, server values authoritative) · Personalise: "Use my points" → SCR-08, "Plan ahead" → SCR-10 (needs a saved or local trip) · Save trip (user → API-10; guest → local) |
| Layout | **360:** hero card on top (visible without scrolling), options list below, filters in a Sheet. **768:** hero + list. **1280:** hero spans; list left, filters right. |
| States | L (skeleton hero + 3 cards; "Checking cash fares and award prices…") · E ("No flights found for these dates. Try ±3 days or nearby airports.") · P (CMP-22) · St (CMP-23) · Er (CMP-21; fixtures fallback labelled) · `limitHit` → "Approximate – search limit reached" |
| A11y | `aria-live` for result count; hero numbers have text equivalents ("Example saving: 78 euros, 10.0 percent") |
| Tests | T-FUN-001, 003, 012, 013, 016, 031, T-INT-001, 007, T-RESP-001–004, T-A11Y-001, 003 |

### SCR-05 Option detail

| Aspect | Specification |
|---|---|
| Purpose | Breakdown (CMP-06), conditions (three-state), break-even v\*, explanation (CMP-25), rejected alternatives, separate-ticket warning |
| Actions | Book cash (test) → SCR-07 · How to book with points → SCR-06 · Not this award (reject, API-22) · Add reminder (`.ics`) |
| Layout | **360:** sections stacked with an anchored summary. **768/1280:** 2 columns (breakdown, explanation). |
| States | St (blocks booking until refreshed) · Er |
| Tests | T-CALC-003, 022, T-INT-008, 010, T-FUN-020, 027, T-FLOW-014 |

### SCR-06 Award booking steps

| Aspect | Specification |
|---|---|
| Purpose | CMP-07 ordered steps 1–6 incl. 3a preconditions (BA bridge, Qatar link, details match, account age) and optional gap-fill (CMP-17 price input) |
| Data | Option + programme rules (PRV-05) + user balances; links out to programme sites; Seats.aero/SeatSpy as "search help" links (CG-3) |
| Actions | Mark step done; open external link (new tab, `rel="noopener noreferrer"`); enter top-up price; confirm transfer (CMP-24); record outcome (booked with ref / not available / price differed) → R-EV-11/12 |
| Guards | Step 4 is locked until steps 1–3a are done; infant → phone step; non-beneficiary (Iberia) → beneficiary step |
| Layout | Vertical stepper at all widths; 1280 adds a side summary |
| States | Er (precondition failed shows the reason and a fix) |
| Tests | T-FUN-004, 017, 018, 019, 032, T-CALC-023, 024, T-FLOW-015 |

### SCR-07 Test checkout `/checkout/[offerId]`

| Aspect | Specification |
|---|---|
| Purpose | Duffel **test** order (or simulated) with re-price first |
| Form | Passengers: given name, family name, date of birth (under-18 age), gender, email, phone, as Duffel requires. **Passed through to the provider, not stored** (TBL-29 stores reference only). |
| Actions | Refresh price (API-26) → confirm (API-27, idempotency key) |
| States | L · price changed (409 shows old/new, re-confirm) · expired (410, back to search) · Su "CONFIRMED BOOKING (TEST) – no real ticket · Ref …" · Er (503 → simulated label) |
| Tests | T-FUN-005, T-INT-003, 004, 005, T-SEC-009, T-DEMO-002 |

### SCR-08 Wallet `/wallet`

| Aspect | Specification |
|---|---|
| Purpose | **Single home for balances** (CMP-15) and a **summary of cards held** (list linking to SCR-09); transfer paths with country ratio and irreversible label |
| Data | Guest store or API-13/14; catalogue programmes/routes (API-05) |
| Rules | Programmes never summed; Emirates via Amex ES "suspended"; family pool not transferable |
| States | E ("Add your first programme") · St (as-of > 30 days: "check your balance") · Er |
| Tests | T-FUN-007, T-CALC-010, 011, T-FLOW-002, 003 |

### SCR-09 Card add/edit

| Aspect | Specification |
|---|---|
| Purpose | CMP-16 catalogue/alias search (e.g. "Iberia Icon Aire" → Iberia Aire), template or custom; issuing country; Revolut plan + debit/credit; opened month; statement day; credit limit; payment preferences; business flag |
| Rules | **No card number, last 4 digits, CVV, PIN or bank login fields.** Luhn guard on free text. Terms shown with source and date, plus stale and conflicting badges. |
| Tests | T-FUN-008, 033, T-SEC-002, T-CALC-019 |

### SCR-10 Plan ahead: spending and purchases

| Aspect | Specification |
|---|---|
| Purpose | Gates G2/G3 (Q-SPEND-05/06), reserve (required), basic monthly categories (Q-SPEND-01..04, 02b), planned purchases (Q-PURCH) |
| Validation | Amount bounds; one entry per category; reserve required; necessity required |
| Tabs | "Basic" (P0r) · "Detailed" (P1) |
| States | Gate fails → card optimisation off banner (S-12) · E · Er |
| Tests | T-FUN-009, 010, T-VAL-010, 011, T-ALLOC-007 |

### SCR-11 Strategy and verdict `/plan/[tripId]`

| Aspect | Specification |
|---|---|
| Purpose | VerdictPanel (CMP-18), PointsGoalMeter (CMP-09), AllocationTable (CMP-26), TimelineList (CMP-19), ExplanationPanel (CMP-25) |
| Data | API-20 compute (guest: full inputs; user: draft plan version) |
| Actions | Approve (API-21) · Reject recommendation (API-22, scope) · Download `.ics` (API-28) · Record posted points (API-24) |
| States | L · Insufficient ("Enter a minimum cash reserve to plan ahead") · approximate-allocation label · Illustrative confidence |
| Tests | T-TIME-001–012, 105, 112, T-CALC-101–119, T-FLOW-010, 121 |

### SCR-12 What changed / revisions

| Aspect | Specification |
|---|---|
| Purpose | WhatChangedCard (CMP-08) for the latest event: per-link deltas, approval if needed. History list is P1. |
| Tests | T-REG-001–017, 107, T-FLOW-011, 012, 013 |

### SCR-13 Saved trips `/trips`

| Aspect | Specification |
|---|---|
| Purpose | Trips list (status, illustrative total saved from **test** bookings only) |
| Guest | Local trips + GuestModeBanner; sign-in CTA only if `AUTH_MODE=supabase` |
| States | E · St (prices aged) · migration result toast (counts, duplicates) |
| Tests | T-FUN-006, T-FLOW-016, 017 |

### SCR-14 Settings and privacy `/settings`

| Aspect | Specification |
|---|---|
| Purpose | Valuation method per programme · objective default · tolerance · "never suggest new cards" · consent (no analytics in P0) · export (API-29 / local JSON) · delete (API-30 / clear local) · links to SCR-15 and privacy notice |
| Tests | T-FUN-011, 024, 028, T-FLOW-005, T-SEC-006 |

### SCR-15 How we calculate and rank `/how-it-works`

| Aspect | Specification |
|---|---|
| Purpose | Plain-English N, H, EC, valuation, break-even, ranking parameters (TRLGDCU art. 20.3), provenance categories, business model ("free, no commissions"), quote-log note |
| Tests | T-FUN-014, 021, T-DEMO-005 |

### SCR-16 New-card exploration (P1, documented; not shown in P0)

| Aspect | Specification |
|---|---|
| Purpose | Neutral comparison by ΔB_strategy; credit warning "Borrowing money costs money" + representative APR (TAE); no "advice" or "approval odds"; no affiliate links; decline with scope |
| Tests | T-FLOW-004, T-FUN-025, T-CALC-104, 108 |

### SCR-17 Sign-in, errors, 404, offline

| Aspect | Specification |
|---|---|
| Purpose | Sign-in (only when `AUTH_MODE=supabase`: email OTP via custom SMTP or GitHub OAuth, D-29) · `error.tsx` / `not-found.tsx` · offline notice |
| Session expiry | Keep draft locally, prompt sign-in, resume (EC-TECH-14) |
| Tests | T-FLOW-017, 018 |

## 5. Forms and validation rules (summary)

Shared zod schemas live in `src/domain/schemas` (pure) and are used by both the forms and the API.

| Schema | Key rules |
|---|---|
| `QuickSearchSchema` | IATA codes; from ≠ to; dates ≥ today (airport tz); return > depart; travellers ≤ 9; infants ≤ adults; child/infant age required; flex caps |
| `PlanSearchSchema` | 2–6 legs; no overlap |
| `BalanceSchema` | int ≥ 0 ≤ 10,000,000; range lo < hi; as-of ≤ today |
| `CardSchema` | No digit runs ≥ 13 (Luhn guard); nickname ≤ 40 chars |
| `SpendingSchema` | amount ≥ 0 ≤ €100,000/month (confirm above); frequency enum |
| `PurchaseSchema` | ≤ 80 chars; amount > 0; necessity required; window from ≤ to |
| `ReserveSchema` | ≥ 0; required in M3 |
| `MoneySchema` | ≤ 2 decimals |

## 6. Copy and string catalogue

- `messages/en.json` namespaces: `common`, `search`, `results`, `award`, `checkout`, `wallet`, `cards`, `plan`, `verdict`, `changes`, `trips`, `settings`, `how`, `errors`, `badges`, `disclaimers`.
- **Banned words** (checked by T-FUN-022 and T-DEMO-005): "free" (for taxed awards), "guaranteed", "will drop", "real price", "real saving", "you will save", "advice", "approval odds".
- **Number and date formatting** uses `Intl` with the active locale (en: "€1,234.56"; es-ES in P1: "1.234,56 €"). Spanish programme names are kept ("Iberia Club", "Cuenta Familiar").
- **es-ES (P1):** add `messages/es-ES.json`; no code change. Whether legal text must also exist in Spanish is UNR-09.

## 7. Accessibility requirements

- WCAG 2.1 AA target.
- **Automated:** axe on every VS/P0r screen (T-A11Y-001).
- **Keyboard:** full Quick Flight → checkout by keyboard (T-A11Y-002).
- **Focus:** visible focus rings; focus is trapped in dialogs and returns to the trigger when they close.
- **Status:** never conveyed by colour alone (T-A11Y-003).
- **Motion:** reduced motion respected (T-A11Y-004).
- **Targets:** touch targets ≥ 44×44 px.
- **Forms:** errors are linked to their fields and summarised at the top.
- **Overflow:** long airport names and 7-digit numbers don't overflow (T-RESP-004).
