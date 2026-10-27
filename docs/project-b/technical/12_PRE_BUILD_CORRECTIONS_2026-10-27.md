# 12. Pre-build corrections (27 Oct 2026)

These corrections **override** the matching sections of docs 04, 05, 08, 09 and 11. The implementation follows this file wherever they disagree. Phase 1 worked-example values are unchanged; the corrected formulas below reproduce them exactly (see the A.6 checks).

## A. Savings and money correctness (overrides doc 05 §1 and §3)

**A.1 One cost model, no overlapping fields.** `cashOut` and `attributableFees` are replaced by a list of cost lines. Every cost belongs to exactly one line:

```ts
type CostLine = {
  code: 'fare' | 'taxes' | 'carrier_surcharge' | 'booking_fee' | 'bag' | 'seat' | 'positioning' | 'award_taxes' | 'card_fx_fee' | 'other';
  key: string;              // unique per option, e.g. "bag:pax1:leg1"; a duplicate key is rejected (DUPLICATE_COST_LINE)
  amount: Money;            // EUR minor units after conversion
  timing: 'today' | 'later';// 'today' = paid in this booking; 'later' = paid separately because of this option (airport bag fee, train to an alternate airport)
  original?: Money;         // pre-conversion amount, kept for display
  provenance: Provenance;
};
```

- If a provider's total already includes taxes and fees, the adapter emits **one** `fare` line holding that total (with a breakdown for display only). It never emits taxes or fees again on top.
- Bags, seats and positioning are emitted only when the provider total excludes them **and** the request requires them.

**A.2 Definitions**

| Quantity | Formula |
|---|---|
| `cashToday(o)` | Σ lines with `timing='today'` |
| `cashTotal(o)` | Σ all lines (today + later) |
| `pointsValue(o)` | Σ_p round_half_away(points_p × v_p) in cents, one rounding per programme |
| `EC(o)` (Goal B) | `cashTotal(o) + pointsValue(o) − countedRewards(o)` |
| `countedRewards(o)` | Value of rewards earned by this booking. **Counted only** if the source is VERIFIED_OFFICIAL_RULE or USER_ENTERED **and** the points post with certainty. **Never counted:** unearned or future points, residual bonuses, illustrative or fixture reward rules. These are shown separately as "Not counted in your saving". In the hackathon MVP this term is **always 0** (rewards earned are P1). |
| Economic saving | `EC(N) − EC(H)`; % = saving / EC(N), computed from unrounded cents and shown to 1 decimal |
| Cash saving today | `cashToday(N) − cashToday(H)`; can be negative (award paid with points today) |
| Break-even v* | `(EC_cash(C) − cashTotal(A)) / points(A)` for a single-programme award A versus the best cash option C, where `EC_cash(C) = cashTotal(C) − countedRewards(C)` |

**A.3 Goals stay separate**
- **Goal A** (minimum necessary cash today) ranks by `cashToday`, then `EC`, then the tie-break.
- **Goal B** (minimum estimated economic cost) ranks by `EC`, then `cashToday`, then the tie-break.
- The UI always shows both numbers, and labels which goal ordered the list.

**A.4 Missing valuation.** If a programme has no user or reference value (`break_even_only`):
- the award gets no EC;
- under Goal B it is listed separately with its v*, not ranked;
- under Goal A it is ranked by `cashToday`, and its EC shows "Needs a points value".

**A.5 Other guards**
- **Stale FX:** an FX snapshot older than 7 days marks the option `FX_STALE`. It is excluded from ranking and shown as "Price in USD; exchange rate out of date". It is never converted silently.
- **No positive saving:** if `EC(N) − EC(H) ≤ 0`, the headline is "Paying cash is better" (or "No saving found"), never a negative or zero "saving".

**A.6 Regression checks** (unit tests, `tests/unit/engine/*.test.ts`)
- **Phase 1 values:** CS-01 €78 / 10.0%; CS-03 EC €1,226, saving €1,674 / 57.7%, cash today −€2,520; CS-04 EC €718 with v* €0.0091; FX-CASH-08 v* €0.0079; CS-02b €466.50.
- **Edge cases:**
  - zero and negative saving;
  - half-away rounding at ±0.5 cent;
  - missing valuation;
  - stale FX;
  - a duplicate bag line (rejected);
  - a fee included in the fare and not re-added;
  - mixed cash + award.

## B. Search and allocation algorithms (overrides doc 05 §6.4 and §9)

**B.1 Objective-aware bounds.** Let `f` be the objective (`cashToday` for Goal A, `EC` for Goal B).
- **Lower bound** = partial f + Σ over remaining legs of min f.
- Goal B's EC bound is never applied to Goal A.
- Under Goal B, award options without a valuation are excluded from the search (see A.4).

**B.2 Candidate caps (deterministic)**
1. Apply dominance per leg on the tuple (f, cashToday, points per programme).
2. Keep up to 3 cash and up to 3 award options, each ordered by f and then the tie-break.
3. Merge and keep the best **K = 5** by f and then the tie-break.

**B.3 Whole-trip fares compete fairly.**
- The search runs once per "cover": none, plus each of up to **W = 5** whole-trip fares.
- Each cover fixes the legs it covers. Branch and bound searches only the uncovered legs.
- All covers are compared on the same objective with the same tie-break.

**B.4 Deterministic limits**
- The node limit is **50,000 evaluated nodes**, counted rather than timed, so results are reproducible.
- A wall-clock guard of **1,000 ms** exists only as a safety net. If either limit is hit, the result is labelled **"Approximate – search limit reached (N nodes)"**.

**B.5 Tie-break.** Compare in this order until one differs:
1. f;
2. EC (Goal A) or cashToday (Goal B);
3. total points;
4. number of tickets;
5. the lexicographic join of option IDs.

**B.6 Fallback baseline.**
- **Greedy:** walk the legs in input order; on each, take the best option by f that fits the remaining points pool, falling back to cash.
- **The returned result** is the best, by f and then the tie-break, of: the branch-and-bound best, the greedy result and N. It is therefore **never worse than the greedy result or N**.
- **Test:** UNIT-MULTI-LIMIT runs with the limit set to 10 nodes.

**B.7 Shared points pool.** Prune any partial combination whose points exceed the usable balance for a programme (INV-4). Rejected combinations keep a reason (e.g. "Needs 50,000 points; you have 30,000").

**B.8 Allocation limits (ENG-10, Phase 8 / P1)**
- **State limit:** 200,000 DP states. Cents are bucketed to €1 for the subset-sum.
- **Operation limit:** 2,000,000.
- **Memory:** about 16 MB of typed arrays at most.
- **Exact** only when there are ≤ 12 necessary expenses and ≤ 3 non-linear cards per window, **and** no limit is hit. Otherwise the result is "approximate".
- **Fallback:** the best of the linear greedy result and all-on-one-card.
- **No-unnecessary-spending:** zero-value spend never raises the score (P-01).

## C. APIs and provider failures (overrides doc 04 §1, §4 and §6)

**C.1 Envelope**
- Success: `{ ok: true, status, data, meta }`.
- Error: `{ ok: false, error: { code, message, details? } }`.

Every request **and** response is parsed with the zod schemas in `src/contracts/`. A response that fails the schema becomes a 500 `INTERNAL` error with no internals leaked.

**C.2 Status table**

| Situation | HTTP | `status` / `code` | UI |
|---|---|---|---|
| All providers answered | 200 | `ok` | Results |
| Some providers failed or timed out | 200 | `partial`, with `meta.providers[]` outcomes | Results + "Some sources didn't respond" |
| Duffel test unavailable, fixtures used | 200 | `fixture_fallback` | Results + "Live test search unavailable. Showing illustrative examples." **Never labelled live.** |
| Nothing found | 200 | `empty` | Empty state with widen-search tips |
| Invalid request | 400 | `VALIDATION_ERROR` (zod issues) | Field errors |
| Semantic error (overlapping legs, more than 6 legs) | 422 | `UNPROCESSABLE` | Message |
| Rate limited | 429 | `RATE_LIMITED` + `Retry-After` | Retry message |
| Offer expired | 410 | `OFFER_EXPIRED` | "Search again" |
| Price changed on reprice | 409 | `PRICE_CHANGED` (new price in details) | Confirm new price |
| Booking provider error | 502 | `PROVIDER_ERROR` (no retry) | Error; no booking made |
| Live-mode credential or resource detected | 503 | `TEST_MODE_REQUIRED` (fail closed) | "Test booking unavailable" |
| Unexpected | 500 | `INTERNAL` | Generic error |

**C.3 Resilience**
- **Search:** budget 8 s per supplier; abort with `AbortSignal`; **one retry only** for search calls on a network error or 5xx.
- **Orders:** **never retried.** An order uses an idempotency key, and a repeated key returns the first result.
- **Cache:** TTL = min(10 min, offer `expires_at` − 60 s).
- **Reprice:** always reprice before a test-order confirmation.

**C.4 Secrets**
- Server-only modules import `server-only`. `DUFFEL_ACCESS_TOKEN` is read only in `src/server/env.ts`.
- Secrets never appear in responses, logs, error messages, tests or Git.
- `productionBrowserSourceMaps` stays off.
- A build-output scan (`pnpm check:bundle`) fails if `duffel_` appears in `.next/static`.

## D. Safe public demo (adds to doc 06)

**Data and storage**
- All demo travellers, balances, cards and spending are fictional (e.g. "Lucía Demo", 42,000 demo Avios).
- A persistent banner says "Demo · test mode · data stays in this browser". It includes a **Clear demo data** button, and the same action is on Settings.

**What the app never asks for**
- card numbers, CVV, PIN or bank credentials;
- real passport data.

Inputs that look like card numbers (Luhn-valid 13–19 digits) are rejected.

**Checkout**
- Checkout uses prefilled synthetic passenger data and Duffel's test `balance` payment. No card form exists.
- Success shows **"TEST BOOKING – no ticket issued, no money charged"**.

**Duffel test-mode guard**
- The token must start with `duffel_test_`; any other prefix disables the adapter (fixture fallback).
- Every Duffel response must have `live_mode === false`, or the request fails closed with `TEST_MODE_REQUIRED`.
- Duffel test fares are labelled "Duffel test data – not a real market fare".

## E. Repository and launch safety (adds to docs 08 and 09)

**Repository**
- `.gitignore` ignores `.env*` with `!.env.example`. A check script confirms `.env.example` is tracked and no other `.env*` file is.
- A gitleaks (Docker) scan runs before every push. If Docker isn't running, a fallback regex scan (`pnpm check:secrets`) must pass.

**Hosting**
- Vercel Hobby is non-commercial only (rechecked 26 Oct 2026, doc 08 §10). This hackathon demo is unpaid, has no ads and makes no affiliate links, so it fits.
- Any paid or client work moves to Pro first. No paid resources are created.

**Catalogue rules**
- Card, transfer and award rules ship with `status`: `VERIFIED` (official source + retrieval date), `UNVERIFIED` or `ILLUSTRATIVE`.
- In the hackathon catalogue, everything not checked against an official page on the build date is `ILLUSTRATIVE` and shown as such.

**Dates.** Remaining time was re-measured on 27 Oct 2026 at 10:32 IST: about 37.5 h to the assumed 28 Oct 23:59 IST deadline (AS-27).

## F. Readiness categories (overrides doc 11 §2 labels)

| Category | Items |
|---|---|
| **Owner-approved** | D-00 (locked), D-04 (English P0), D-19 (Duffel test + fixtures), D-20 (templates; LLM off), D-21 (in principle), D-30 (Vercel on the owner's account, non-commercial demo), and the 27 Oct instruction to build both repos |
| **Safe implementation defaults** (used without asking; reversible) | D-29 guest-only, D-31 two-repo split, D-32 docs in the frontend repo, D-33 demo-project production URL, the D-02 reference value €0.010, D-24 tolerance, AS-25/26 limits (as corrected in B), and the C.2 status table |
| **Unresolved external / legal** | Duffel live (KYC), award data agreements, card-term verification against current official pages, the organiser's deadline timezone, the Netlify Free commercial-terms recheck, the DPIA and UNR-01..10 before any commercial launch |
