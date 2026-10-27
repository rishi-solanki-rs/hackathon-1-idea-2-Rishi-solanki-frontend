# Owner test guide — A Una Milla

This guide uses variable **names only**. It never contains keys, tokens or passwords.

## 1. What the app does (main flow)

**Plan my trip** (`/plan`) is a 5-step wizard:
1. **Trip:** a date range for departures (up to 60 days), stay length, travellers, cabin, a goal and an optional "book by" date.
2. **Cards:** pick from the official-source catalogue or add a custom card. Each term carries a source badge.
3. **Points:** balances (exact, a range, or "I don't know") plus an award price you found on the programme's site.
4. **Spending:** the payment answer, monthly spending and planned purchases.
5. **Your plan:**
   - a verdict and an ordered action list;
   - Duffel test fares for up to 7 sampled departure dates;
   - points available now versus needed;
   - which card to use for each purchase, and when the points post;
   - "What changed" after any edit;
   - an AI explanation checked against the numbers, and a test booking.

Quick Flight (`/`), Multi-city (`/trips/multi`) and How it works (`/how-it-works`) are secondary tools.

## 2. Environment variables

| Name | Where | Purpose |
|---|---|---|
| `PROVIDER_MODE` | Local + Vercel | `duffel_test` = real Duffel sandbox; `fixture` = labelled examples only |
| `DUFFEL_ACCESS_TOKEN` | Local + Vercel (Sensitive) | Server-only; must start with `duffel_test_` |
| `GEMINI_API_KEY` | Local + Vercel (Sensitive) | Server-only; AI explanations |
| `NEXT_PUBLIC_SUPABASE_URL` | Local + Vercel | Browser-safe project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Local + Vercel | Browser-safe publishable key (never a secret key) |
| `AUTH_MODE` | Local + Vercel | `supabase` = try a private anonymous session; otherwise browser-only |
| `FX_LIVE` | Local + Vercel | `on` = ECB rates via Frankfurter; `off` = bundled snapshot |
| `RATE_LIMIT_PER_MIN` | Local + Vercel | Per-IP request limit (default 20) |
| `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` | **Local only** | For `supabase db push` / `migration list`. Never in Vercel. |

Local values live in `frontend/.env.local` (gitignored); `.env.example` lists the names.

## 3. Run locally

**Frontend**

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev                       # http://localhost:3000, uses .env.local
```

**Database** (Docker Desktop must be running)

```bash
cd backend
pnpm install
pnpm db:start                  # Postgres only
pnpm exec supabase db reset --local
pnpm exec supabase test db --local   # pgTAP: expect "Files=4, Tests=57, Result: PASS"
```

**Hosted Supabase checks** (read-only)

```bash
pnpm exec supabase migration list --db-url "$SUPABASE_DB_URL"
```

`SUPABASE_DB_URL` is the session-pooler connection string from Supabase → Connect, host `aws-0-ap-southeast-2.pooler.supabase.com:5432`, with your DB password. Build it in your shell only, never in a file.

All 5 migrations show as both local and remote. Never run `db reset` against the hosted project.

**Private account saving** only works if **Authentication → Sign In / Providers → Allow anonymous sign-ins** is ON in the Supabase dashboard. While it is OFF, Settings says "Saved in this browser only".

## 4. Mocked tests versus live tests

| Command | Network | What it proves |
|---|---|---|
| `pnpm verify` | None (MSW blocks every request) | Format, lint, types, 114 unit and integration tests, secret, env and encoding checks |
| `pnpm build && pnpm check:bundle:local` | None | Production build; none of your server values are in the browser bundle |
| `pnpm exec playwright test --project=mobile-360 --project=tablet-768 --project=desktop-1280` | Local server in **fixture** mode | 43 journeys × 3 viewports, both themes, axe, no horizontal overflow |
| `pnpm test:live` | **Real** Duffel, Gemini, Supabase | Real test offers → reprice → **Duffel TEST order**; real Gemini call; hosted catalogue read + RLS denial (the round trip is skipped while anonymous sign-ins are off) |
| `LIVE=1 BASE_URL=<url> pnpm exec playwright test tests/e2e/live-plan.spec.ts --project=desktop-1280` | **Real**, through the UI | Full wizard → Duffel fares → AI explanation → test booking |
| `BASE_URL=<url> pnpm test:smoke` | The deployed site | Health, demo disclosure, labelled search, security headers |

**Failure reports:**
- `pnpm exec playwright show-report` opens the HTML report.
- `pnpm exec playwright show-trace test-results/<test>/trace.zip` opens a trace.
- Failure screenshots are saved in `test-results/`.

## 5. Manual end-to-end cases

Run each case on the deployed URL in a private window.

| # | Steps | Expected |
|---|---|---|
| 1 | Plan my trip → To: London → a date range → Next without choosing on Cards | Error: "Add the cards you hold, or tick …" |
| 2 | No cards, no points, "Yes, always in full" → Build my plan | Fares labelled **Duffel test data** across sampled dates; verdict **Book the cash fare**; actions include "Do not spend extra …" |
| 3 | Add card **Iberia Aire**; set "Days until points appear" to 30; points: Iberia Club exact 20,000; award found 20,500 + €40; planned purchase €900 committed → Build | Card table: purchase → Iberia Aire, 300 points, posts 30 days later; "Points short 500" or "Ready on <date>" |
| 4 | Edit answers → Points → change the balance to 21,000 → Your plan | **What changed** panel: shortfall 500 → 0, cause "Points balance changed" |
| 5 | Spending → "No, I sometimes carry a balance" → Build | "Card points are not planned"; action "Do not use cards to earn points while you carry a balance" |
| 6 | Mark a planned purchase optional and not committed | Listed under "Not counted" with the reason; never suggested |
| 7 | "In plain words" panel | Badge says "AI-written (gemini-…) checked against the numbers" or "Rules-based explanation" with the reason. The text uses only numbers shown on the page. |
| 8 | "Book the cheapest in test mode" → Confirm | Price re-checked. Result: **"TEST — no real ticket issued; no money charged"** with a Duffel test reference. |
| 9 | Reload the page during the wizard | Answers are still there. Settings → **Clear my data** empties everything. |
| 10 | Theme toggle (moon or sun) → navigate → reload | The theme is kept. |

**Sandbox versus real fares:** every Duffel fare is labelled "Duffel test data (sandbox, not real market prices)". Airline names come from the sandbox; prices and availability are not real.

## 6. Verify the deployment

- `GET <url>/api/health` returns `{"mode":{"provider":"duffel_test"},…}`.
- Vercel → Project `a-una-milla-demo` → Deployments: the production deployment's commit SHA matches `git rev-parse HEAD` in `frontend` (recorded in `EVIDENCE.md`).
- Open the production URL in a private window (not logged in to Vercel). It must load without a Vercel login page.

## 7. Known limitations

- Duffel test mode is a sandbox: prices are not real, and test orders issue no ticket.
- Award seats are never checked. Award prices are either your input or a labelled rough estimate.
- Card terms are checked against official pages (27 Oct 2026) where shown; posting delays and some fees are unknown until you enter them.
- Transfer routes are unverified or illustrative.
- Account saving needs anonymous sign-ins enabled in Supabase; otherwise data stays in the browser.
- No price prediction: "when to book" is based on your deadline, points timing and verdict, not forecasts.

## 8. Final checklist

- [ ] `pnpm verify` green
- [ ] Playwright 3 viewports green
- [ ] `pnpm test:live` green
- [ ] Backend pgTAP green
- [ ] Production URL opens without login
- [ ] Health shows `duffel_test`
- [ ] A test booking shows the TEST label
- [ ] Rotate the DB password and the Duffel and Gemini keys after the hackathon (they were shared in chat)
