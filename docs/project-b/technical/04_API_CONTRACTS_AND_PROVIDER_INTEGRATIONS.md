# Technical 04: API Contracts and Provider Integrations

| Field | Value |
|---|---|
| Status | Contract design. **27 Oct correction:** the response envelope, HTTP status table, retry and cache rules, and the Duffel test-mode guard are superseded by [doc 12 §C–D](12_PRE_BUILD_CORRECTIONS_2026-10-27.md). |
| Location | `frontend/src/app/api/**` (Route Handlers), `frontend/src/server/actions/**` (Server Actions), `frontend/src/providers/**` |

**Conventions**
- **zod everywhere:** every request body and response is validated with zod 4 on the server. The same schema is reused in client forms.
- **Errors:** `{ error: { code, message, retryable, fieldErrors? } }`, with HTTP status codes.
- **Auth:**
  - `AUTH_MODE=guest`: endpoints are stateless and accept full inputs.
  - `AUTH_MODE=supabase`: endpoints that persist require a session (`getClaims()` per Supabase guidance, `[VERIFIED]`).
  - Every Action and Route re-checks auth and ownership in the DAL (Next 16 data-security guidance, `[VERIFIED]`).
- **Rate limits:** per IP (guest) or per user. Search is limited to 10/min (AS-21) via the `rate_limits` table in authenticated mode or an in-memory window in guest mode. **On Vercel, in-memory windows are per instance, so this is best effort only** (`[ASSUMPTION]`, P1: DB-backed for all).
- **Idempotency:** mutating endpoints that can be retried accept an `Idempotency-Key` header or `idempotencyKey` field.

---

## 1. Internal API contracts

| API | Kind | Method / name | Auth | Request (zod summary) | Response | Errors | Idempotent / cache | Requirements |
|---|---|---|---|---|---|---|---|---|
| API-01 | Route | `POST /api/search/quick` | guest or user | `{origin[1..3], destination[1..3], tripType, depart:{date,flex}, return?, travellers[], cabin, cabinMode, prefs?, objective, valuations?, balances?}` | `{searchId, normal, hacked, options[], explanation, provenanceSummary, availability[], confidence, partial:boolean, limitHit:boolean}` | 400 VALIDATION, 429 RATE_LIMITED, 504 PARTIAL (returned as 200 with `partial=true`), 503 PROVIDERS_DOWN (fixture fallback) | Quote cache key = normalised request hash, TTL 10 min ≤ offer `expires_at` | REQ-BRF-01, 03, 04, 07, REQ-RES-01, 19, 21 |
| API-02 | Route | `POST /api/search/plan` | guest or user | `{legs[2..6], travellers, objective, balances?, valuations?, flags:{openJaw, selfTransfer}}` | `{perLeg[], combination, rejected[], normal, hacked, explanation, limitHit}` | 400, 422 LEGS_OVERLAP, 429 | As API-01 | REQ-BRF-02, REQ-REC-MULTI-01 |
| API-03 | Route | `GET /api/catalogue/airports?q=` | public | `q` (2–40 chars) | `[{iata,name,city,country,tz}]` (≤ 10) | 400 | `Cache-Control: public, max-age=86400` | Q-TRIP-01/02 |
| API-04 | Route | `GET /api/catalogue/cards?q=` | public | `q` | `[{id, canonicalName, aliasMatched, status, unverifiedFields, sourceUrl, verifiedAt}]` | 400 | public cache 1 day | REQ-REC-CAT-01 |
| API-05 | Route | `GET /api/catalogue/programs` | public | — | programmes + transfer routes (VERIFIED/CONFLICTING flags) | — | public cache 1 day | REQ-RES-07, 20 |
| API-10 | Action | `saveTrip` | user | trip + legs + travellers (client IDs) | `{tripId, dedupeWarning?}` | 401, 403, 409 DUPLICATE | `client_id` upsert | REQ-BRF-10 |
| API-11 | Action | `updateTrip` | user | trip patch + `basedOnVersion` | `{tripId, replanEventId?}` | 401, 403, 409 STALE_VERSION | — | REQ-OWN-08 |
| API-12 | Action | `archiveTrip` | user | `{tripId}` | `{ok}` | 401, 403 | — | — |
| API-13 | Action | `upsertBalance` | user | `{clientId, programId, kind, points?, range?, asOf, expiry?, accountOpened?, linkedViaBa?, detailsMatch?}` | `{balanceId, replanEventIds[]}` | 400 (Luhn guard, bounds), 401 | `client_id` | REQ-BRF-08, REQ-RES-20 |
| API-14 | Action | `deleteBalance` | user | `{balanceId}` | `{ok}` | 401, 403 | — | — |
| API-15 | Action | `upsertCard` | user | `{clientId, cardProductId? \| customTerms, issuingCountry, planTier?, cardType?, openedMonth?, statementDay?, creditLimit?, paymentPrefs?, isBusiness}` | `{cardId}` | 400 (no card numbers: Luhn guard), 401 | `client_id` | REQ-OWN-11, REQ-REC-CAT-01 |
| API-16 | Action | `deleteCard` | user | `{cardId}` | `{ok, warnings[]}` (MR forfeiture, bonus in progress) | 401, 403 | — | T-REG-005 |
| API-17 | Action | `upsertSpending` | user | `{category, amount, frequency, fixedVariable, currentCardId?, merchantEligibility, cardPayable}` | `{itemId, monthly}` | 400, 409 DUPLICATE_CATEGORY | — | REQ-OWN-03 |
| API-18 | Action | `upsertPurchase` | user | `{clientId, description, amount, currency, category, dateFrom, dateTo?, movable, necessity, refundable}` | `{expenseId, replanEventId}` | 400, 401 | `client_id` | REQ-OWN-04 |
| API-19 | Action | `setPurchaseStatus` | user | `{expenseId, status, refundAmount?, idempotencyKey}` | `{replanEventId}` | 400, 401, 409 | key → RPC `record_refund` | T-REG-002 |
| API-20 | Route | `POST /api/plans/compute` | guest or user | guest: full inputs `{trip, balances, cards, spending, purchases, gates, reserve, valuations}`; user: `{tripId, basedOnVersion}` | `{draftVersion (user) \| result (guest), verdict, allocation, forecast, explanation, whatChanged?, requiresApproval}` | 400, 401, 409 STALE_VERSION, 422 RESERVE_REQUIRED | — (pure compute; user mode persists through RPC) | REQ-OWN-05, 13, REQ-REC-* |
| API-21 | Action | `approvePlan` | user | `{planVersionId}` | `{ok}` | 401, 403, 409 | unique per version | REQ-OWN-08 |
| API-22 | Action | `rejectRecommendation` | guest (local) or user | `{subjectKind, subjectId, scope, tripId?}` | `{ok, recomputeHint}` | 400 | unique | REQ-REC-REJ-01 |
| API-23 | Action | `recordReplanEvent` | user | `{eventType, payload, idempotencyKey, basedOnVersion}` | `{eventId}` | 400, 409 | key | REQ-OWN-08 |
| API-24 | Action | `recordPostedRewards` | user | `{cardId, month, points}` | `{replanEventId}` | 400 | unique `(card, month)` | REQ-REC-FCST-01 |
| API-25 | Route | `POST /api/guest/migrate` | user | `{migrationId, payload (versioned guest schema)}` | `{status:'done', counts, duplicates[]}` | 400 SCHEMA_VERSION, 401, 409 ALREADY_DONE (returns first result) | `migration_id` | REQ-OWN-12, T-FLOW-017 |
| API-26 | Route | `POST /api/booking/test-offer/refresh` | guest or user | `{offerId}` | `{offer, priceChanged:boolean, expiresAt}` | 404 OFFER_GONE, 410 OFFER_EXPIRED | no cache | REQ-RES-02 |
| API-27 | Route | `POST /api/booking/test-order` | guest or user | `{offerId, passengers[] (passed through, not stored), confirmPrice, idempotencyKey}` | `{reference, status, isTest:true, label:'CONFIRMED BOOKING (TEST)'}` | 409 PRICE_CHANGED, 410 EXPIRED, 422 PASSENGER, 503 PROVIDER (simulated fallback label) | key (in-memory for guest, DB unique for user) | REQ-BRF-05 |
| API-28 | Route | `GET /api/plans/:id/ics` (user) or `POST /api/ics` (guest, body = actions) | either | — | `text/calendar` | 401, 404 | dedupe UIDs | T-TIME-011 |
| API-29 | Route | `GET /api/me/export` | user | — | JSON of all user rows | 401 | no cache | REQ-NFR-05 |
| API-30 | Route | `DELETE /api/me` | user (re-auth within 5 min) | `{confirm:'DELETE'}` | `204` | 401, 403 REAUTH_REQUIRED | — | REQ-NFR-05, T-SEC-006 |
| API-31 | Route | `GET /api/health` | public | — | `{ok, mode:{auth, provider}, version}` (no secrets) | — | no cache | Smoke tests |

## 2. Provider interfaces (PRV-*)

```ts
interface CashFareProvider {           // PRV-01
  search(req: CashSearch, signal: AbortSignal): Promise<ProviderResult<Option[]>>;
  refresh(offerId: string, signal: AbortSignal): Promise<ProviderResult<Option>>;
}
interface AwardAvailabilityProvider {  // PRV-02
  search(req: AwardSearch, signal: AbortSignal): Promise<ProviderResult<Option[]>>; // never books
}
interface BookingProvider {            // PRV-03 (cash only)
  createOrder(input: OrderInput, signal: AbortSignal): Promise<ProviderResult<TestOrder>>;
}
interface FxProvider { latest(base: 'EUR', quote: string): Promise<ProviderResult<FxSnapshot>>; } // PRV-04
interface CatalogueSource { cards(q?: string); programs(); routes(); rules(cardId); airports(q) }   // PRV-05
type ProviderResult<T> = { ok: true; value: T; provenance: Provenance; fetchedAt: string }
                       | { ok: false; code: 'TIMEOUT'|'RATE_LIMITED'|'UNAVAILABLE'|'EXPIRED'|'PRICE_CHANGED'|'INVALID'; retryAfterMs?: number };
```

| Adapter | Implements | Provenance | Credentials | Limits / behaviour | Upgrade path |
|---|---|---|---|---|---|
| PRV-01a `DuffelTestCash` | PRV-01 | `LIVE_TEST_DUFFEL` | `DUFFEL_ACCESS_TOKEN` (test, server-only, Vercel env) | `POST /air/offer_requests` with `slices`, `passengers` (age for under-18s), `cabin_class`, `supplier_timeout: 8000`, `return_offers: true` (`[VERIFIED]` Context7 duffel-api-javascript). Offers expire in about 30 min. Test prices are unrealistic. Live search limit 10/60 s; test limit `[UNVERIFIED]`, so `ratelimit-*` headers are read. | Live token after KYC (not planned) |
| PRV-01b `FixtureCash` | PRV-01 | `FIXTURE_FLIGHT` | none | Deterministic FX-CASH-* fixtures | — |
| PRV-02a `FixtureAward` | PRV-02 | `FIXTURE_AWARD` | none | FX-AWARD-*, FX-MULTI-01, FX-REF-01 | PRV-02b future authorised award source (Seats.aero commercial / AwardTool), P2. **No award booking.** |
| PRV-03a `DuffelTestBooking` | PRV-03 | `LIVE_TEST_DUFFEL` | as PRV-01a | Re-fetch the offer, then `orders.create({type:'instant', selected_offers:[id], passengers, payments:[{type:'balance', amount, currency}]})` against the **test** environment only. Confirm the exact v2 field shape in TASK-030; the Context7 SDK snippet shows `offer_id`/`type:'balance'` in an older form, so the docs must be re-checked. Produces **no real ticket**. | — |
| PRV-03b `SimulatedBooking` | PRV-03 | `FIXTURE_FLIGHT` | none | Used when no token is set or Duffel is down; labelled "Simulated test booking" | — |
| PRV-04a `FrankfurterFx` | PRV-04 | `EXTERNAL_FX_SNAPSHOT` | none | `GET https://api.frankfurter.dev/v2/providers/ecb/rates?base=EUR` (`[VERIFIED]` frankfurter.dev); a daily snapshot is cached with `rate_date`; stale after 7 days → blocked | — |
| PRV-04b `FixtureFx` | PRV-04 | `FIXTURE` (labelled) | none | FX-RATE-01 (1.1193, 23 Oct 2026) | — |
| PRV-05a `DbCatalogue` | PRV-05 | `VERIFIED_OFFICIAL_RULE` (per row status) | publishable key | Supabase catalogue tables | — |
| PRV-05b `BundledCatalogue` | PRV-05 | same, from `catalogue.json` | none | Generated from backend `seed.sql` (doc 01 §6) | — |

The registry (`src/providers/registry.ts`) selects adapters from `PROVIDER_MODE` and the token's presence: `fixture` (default, CI, preview) or `duffel_test` (demo URL only). **Award search always uses PRV-02a in the hackathon.**

## 3. Data-provenance categories (mandatory on every value)

| Category | Meaning | UI badge (CMP-02) | Never claim |
|---|---|---|---|
| `LIVE_TEST_DUFFEL` | Duffel test environment | "Test environment price – not a real fare" | A real price or a real ticket |
| `FIXTURE_FLIGHT` / `FIXTURE_AWARD` | Deterministic demo data | "Demo data – illustrative" | Availability |
| `USER_ENTERED` | Balances, cards, purchases, prices typed by the user | "You entered" | Verified |
| `VERIFIED_OFFICIAL_RULE` | Catalogue rule with source URL and date (plus status CONFLICTING/UNVERIFIED fields) | "Issuer terms, checked [date]" | Current beyond `verified_at` + 30 days (stale badge) |
| `EXTERNAL_FX_SNAPSHOT` | Frankfurter/ECB rate with `rate_date` | "ECB reference rate of [date]" | A transaction rate |
| `CACHED` | Previously fetched, with age | "Seen X min ago" | Fresh |
| `ESTIMATE` | Future scenario or forecast | "Estimate – not a forecast" | Certainty |
| `VERIFIED_REAL_WORLD` | Future authorised live provider | (unused in the hackathon) | — |

**A LIVE-TEST cash price shown next to an ILLUSTRATIVE award price** is labelled "illustrative pairing – not the same real flight" (REQ-RES-19).

## 4. Resilience rules

| Concern | Rule |
|---|---|
| Time budget | Search request budget **10 s**. Duffel `supplier_timeout` 8 s; `AbortController` deadline 9.5 s per provider call. |
| Cancellation | A new search or navigation aborts in-flight calls (client `AbortController` + server `request.signal`). |
| Partial results | Providers that finished are returned; missing ones get state `UNKNOWN_AVAILABILITY` with code `TIMEOUT`/`UNAVAILABLE` and the message "Some prices took too long. Retry" (T-INT-001, T-INT-007). **No fabricated values.** |
| Retries | Only idempotent searches; at most **1 retry** with 300–800 ms jitter on 429/5xx, honouring `ratelimit-reset`/`Retry-After`. Never retry order creation (idempotency key instead). |
| Rate limits | App: 10 searches/min per user or IP. Provider 429 → `RATE_LIMITED` + cached result if present (labelled `CACHED`) (T-INT-002). |
| Cache | Quote cache 10 min, never beyond `expires_at`. Booking always re-prices first (API-26). |
| Price change | `price_changed` → 409 with old/new price; explicit re-confirmation required (T-INT-004). Expired → 410, new search (T-INT-003). |
| Contradictory data | Provider `total_amount` is authoritative; breakdown shown as "not available" if inconsistent (T-INT-008). |
| No token | Registry falls back to fixtures, labelled (T-INT-009). |
| Null conditions | Three-state "Unknown" (T-INT-010). |
| FX failure | Original currency shown; a snapshot ≤ 7 days old is used and labelled, otherwise conversion is blocked (T-INT-006). |

## 5. Explicit non-capabilities

- No adapter books **award** tickets. Award steps (SCR-06) only link out with instructions.
- Duffel test mode issues **no real tickets** and takes no real payment.
- An award-search service, even if added later, does not grant booking permission.
- There are no bank or account-aggregation integrations (PSD2 AIS registration risk, Phase 1 doc 03 §7).

## 6. Error code catalogue

`VALIDATION`, `RATE_LIMITED`, `PARTIAL`, `PROVIDERS_DOWN`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `DUPLICATE`, `STALE_VERSION`, `RESERVE_REQUIRED`, `LEGS_OVERLAP`, `OFFER_EXPIRED`, `OFFER_GONE`, `PRICE_CHANGED`, `PASSENGER_INVALID`, `REAUTH_REQUIRED`, `SCHEMA_VERSION`, `ALREADY_DONE`, `FX_STALE`, `OVER_COMMITMENT`, `SEARCH_LIMIT` (returned as `limitHit=true`, not an error). Each maps to a human message in `messages/en.json` (doc 02 §6).

## 7. UI-to-database / provider data flows (14 flows)

**Format:**
- Each flow follows the path *Screen → validation → service → provider/DB → constraint/transaction → engine → response*.
- **Guest mode** replaces DB writes with guest-store writes (`src/lib/guest-store`, versioned schema `v1`).
- **Paths:** N = normal, E = empty, P = partial, S = stale, F = failure.

| # | Flow | Screen → service | Provider / DB | Constraint / transaction | Engine | Response and states |
|---|---|---|---|---|---|---|
| DF-01 | Quick Flight search | SCR-02 → API-01 | PRV-01 (fixture/Duffel test), PRV-02a, PRV-04; user: insert `quotes` + `quote_log` | Rate limit; cache | ENG-03..07, 17, 21, 24, 25 | N: hero + options. E: no quotes → widen-search suggestions. P: missing provider labelled. S: cached badge. F: 503 → fixtures labelled. |
| DF-02 | Full Trip Plan | SCR-03 → API-02 | as DF-01 per leg + whole-trip fares | Legs 1..6 (zod + DB check) | ENG-19 bounded search | N: combination + rejected list. P: incomplete leg flagged. F: limit hit → "Approximate". |
| DF-03 | Guest search and personalisation | SCR-04 → local guest store | none server-side | Guest schema version | as DF-01 | GuestModeBanner always visible |
| DF-04 | Wallet entry | SCR-08 → API-13 (user) / guest store | `loyalty_balances` | unique `(user_id, program_id)`; Luhn guard | ENG-08 usable paths | E: "Add your first programme". F: validation messages. |
| DF-05 | Card and spending input | SCR-09/SCR-10 → API-15, API-17 | `user_cards`, `spending_items` | unique category (INV-7) | ENG-23 normalise | Duplicate prompt (EC-SPD-02) |
| DF-06 | Planned-purchase create/modify | SCR-10 → API-18/19 | `planned_expenses`; `record_refund` RPC | Idempotency key; negative ledger | — | Emits R-EV-01/02 |
| DF-07 | Recommendation generation | SCR-11 → API-20 | reads all inputs; RPC `create_plan_version` | Transaction; based_on check | ENG-09..16, 18, 21 | `requiresApproval`; confidence |
| DF-08 | Card allocation + forecast | SCR-11 → API-20 | `allocation_ledger`, `points_commitments` (RPC) | INV-1 unique; `commit_points` row lock | ENG-10, 14 | Band shown; "approximate" if the heuristic ran |
| DF-09 | Book-now-vs-wait | SCR-11 → API-20 | `timeline_actions` | dedupe key | ENG-17, 18 | Outcome + revisit dates + `.ics` |
| DF-10 | Award instructions + test checkout | SCR-06 / SCR-07 → API-26, API-27 | PRV-03a/b; `test_bookings` | Idempotency; re-price | ENG-16 gap-fill | 409 price change, 410 expired, simulated fallback label |
| DF-11 | Saved trips + guest migration | SCR-13 / SCR-17 → API-10, API-25 | `trips…`; RPC `migrate_guest_data` | `(user_id, migration_id)` unique; all-or-nothing | — | Duplicates reported; local data kept on failure |
| DF-12 | Replanning (iPhone, budget, balance, rejected card, expiring offer, lost award) | SCR-08/10/11/12 → API-18, 13, 22, 23 → API-20 | `replan_events` + new `plan_versions` | Re-base on stale (409); events within 2 min merge (AS-18) | ENG-20 diff | WhatChangedCard; approval if approved/booked items change |
| DF-13 | Export | SCR-14 → API-29 (user) / local export | all user tables via RLS | — | — | JSON download |
| DF-14 | Delete | SCR-14 → API-30 (user) / local clear | `delete_account()` server-only | Re-auth; cascade | — | Signed out, data gone (T-SEC-006) |

### 7.1 Screen-to-backend responsibilities (all 17 screens)

| Screen | Backend calls | Data read / written (guest = browser-local; user = Supabase with RLS) | Flow |
|---|---|---|---|
| SCR-01 Landing | none (static); demo chips prefill SCR-02 | Reads bundled demo trips (FIXTURE) | — |
| SCR-02 Quick Flight search | API-03 (airport autocomplete), API-01 | user: `quotes`, `quote_log` (insert); guest: none | DF-01 |
| SCR-03 Full Trip Plan builder | API-03, API-02 | As SCR-02, per leg | DF-02 |
| SCR-04 Results | none extra (renders the API-01/02 response) | Reads cached response; guest copy saved to the local store | DF-01, DF-03 |
| SCR-05 Option detail | API-22 (reject), API-28 (`.ics`), API-26 (re-price before booking) | Reads the option from the response; user: `recommendation_rejections` (insert) | DF-01, DF-10 |
| SCR-06 Award booking steps | API-05 (programmes and transfer routes), API-28 | Reads catalogue (`loyalty_programs`, `transfer_routes`, VERIFIED/CONFLICTING flags); no writes | DF-10 |
| SCR-07 Test checkout | API-26, API-27 | PRV-03a/b; user: `test_bookings` (insert); passenger data passed through, not stored | DF-10 |
| SCR-08 Wallet | API-13, API-14, API-05 | user: `loyalty_balances`; guest: local store | DF-04 |
| SCR-09 Card add/edit | API-04, API-15, API-16 | Reads `card_products`; user: `user_cards`; never card numbers | DF-05 |
| SCR-10 Plan ahead inputs | API-17, API-18, API-19, API-24 | user: `spending_items`, `planned_expenses`, `replan_events`; RPC `record_refund` | DF-05, DF-06 |
| SCR-11 Strategy and verdict | API-20, API-21, API-28 | user: RPCs `create_plan_version`, `commit_points`, `approve_plan`; `allocation_ledger`, `timeline_actions` | DF-07, DF-08, DF-09 |
| SCR-12 What changed | API-23, API-20 (recompute), API-21 (approve) | user: reads `replan_events`, `plan_versions` (SELECT only); guest: in-memory diff of the last two results | DF-12 |
| SCR-13 Saved trips | API-10, API-11, API-12, API-25 | user: `trips`, `trip_legs`, `trip_travellers`; RPC `migrate_guest_data` | DF-11 |
| SCR-14 Settings and privacy | API-29, API-30, API-22 (manage rejections) | user: all own rows via RLS; `delete_account()`; guest: local export/clear | DF-13, DF-14 |
| SCR-15 How we calculate and rank | API-05 (current parameter and source dates), API-31 (mode badge) | Reads catalogue `verified_at` and provisional parameters; no writes | — |
| SCR-16 New-card exploration (P1) | API-04, API-20 (with `exploreNewCards=true`) | Reads `card_products` (VERIFIED only); no affiliate data; no writes in P1 | DF-07 |
| SCR-17 Sign-in, errors, offline | Supabase Auth (only if `AUTH_MODE=supabase`), API-25 after sign-in, API-31 | Auth session cookies (server); guest store stays intact on failure | DF-11 |
