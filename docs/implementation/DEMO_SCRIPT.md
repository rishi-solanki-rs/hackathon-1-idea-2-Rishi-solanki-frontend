# 3-minute demo script (only verified features)

Every scenario below is covered by a passing Playwright test (`tests/e2e`). Say "illustrative" and "test mode" out loud; never call a price real.

| Time | Screen | Say / do |
|---|---|---|
| 0:00 | Landing | "A Una Milla answers one question: how much could I save on this trip? Everything here is demo data, and the banner says so." Point to **Clear demo data**. |
| 0:20 | Example trip **Madrid → Santiago de Chile, business** | Loads the fictional Lucía wallet (120,000 Avios at €0.012). Result: **Save €1,674 (57.7%)**, with €2,520 less cash today. "Points are valued, never free." |
| 0:50 | **See how this was calculated** | Breakdown: €380 taxes + 70,500 × €0.012 = €846, so €1,226 overall vs €2,900. "Each cost appears once; nothing is double-counted." |
| 1:10 | **How to book with points** | Ordered steps: check points → find the seat on the programme's site → book → e-ticket. "We never move points before you confirm the seat." |
| 1:30 | Example **Barcelona → New York** | "An award that looks cheaper but is not": **Paying cash is better by €98**; break-even €0.0091. "We say so when points don't pay." |
| 1:50 | Example **Madrid → Beijing, flexible** (no points) | **Save €78 (10.0%)** by flying 2 days later. **Book in test mode** → the price changes from €702 to €719 → accept → **TEST BOOKING – no ticket issued, no money charged**. |
| 2:25 | Example **Full trip MAD → PEK → PVG → MAD** (Marc, 30,000 Avios) | Best plan: one open-jaw cash ticket (€970). The cheapest-looking €920 plan is **rejected: needs 50,000 Avios; you have 30,000**. Points on one leg would cost €60–€70 more. |
| 2:50 | How it works | "Deterministic rules, provenance on every number, no commissions." End. |

**Limitations to state if asked**
- Prices are fixtures, or Duffel sandbox data if a test token is configured.
- Award availability is not checked.
- Transfer rules are unverified.
- Data stays in the browser (guest mode).
- The database layer is built and tested locally, but the demo does not use it.
