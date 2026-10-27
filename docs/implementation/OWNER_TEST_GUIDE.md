# Owner test guide — A Una Milla

This guide uses variable **names only**. It never contains keys, tokens or passwords.
For a plain-language tour of how the plan is made, read `HOW_IT_WORKS.md` next to this file.

## 1. What the app does

**Plan my trip** (`/plan`) is the main flow, a 5-step wizard:
1. **Trip:** from/to, a departure date range (up to 60 days), stay length, travellers, cabin, goal; "More options" has direct-only and a "book by" date.
2. **Cards:** pick a Spanish card from the catalogue (official-source badges) or "My card is not listed". Each card shows as one summary row; **Edit** opens rates, posting delay, and "More details" (fee, sign-up bonus).
3. **Points:** balances per programme (exact, range, or "I don't know"), and whether you found an award price. If you hold points and found none, a labelled rough estimate is used.
4. **Spending:** "Do you pay your full card bill every month?" as three big buttons, quick-add monthly presets (Groceries, Bills, Transport, Fuel, Restaurants, Other) and planned purchases.
5. **Your plan:**
   - a recommendation card with one main button: book the test fare, or check seats on the programme;
   - the next 3 steps (all steps folded);
   - **When to book**: rule-of-thumb window, Spanish peak periods, a price for each date checked, and a price watch versus your last check;
   - **Your cards**: the best card you hold for each monthly spend, and whether a new card helps (welcome offer only from official terms, fee pro-rated, latest apply date);
   - **Your points**;
   - an optional AI explanation and a folded "How this was calculated".

Every step checks its own fields: errors appear **under the field**, the first wrong field gets focus, and **Next** stays blocked ("Fix 2 fields to continue.").

Other screens:
- **Compare flights** (`/compare`): two tabs. "One trip" is the old Quick Flight (cash versus points for one trip); "Multi-city" covers up to 6 flights (separate, open-jaw or multi-city tickets). Both use Duffel test fares. `/trips/multi` redirects to the Multi-city tab.
- **Log in** (`/login`, button at the top right): email and password. **My plans** (`/my-plans`) lists plans saved to your account.
- **How it works** and **Privacy and data** (`/settings`, which has "Clear my data") are in the footer.

## 2. Environment variables

| Name | Where | Purpose |
|---|---|---|
| `PROVIDER_MODE` | Local + Vercel | `duffel_test` = real Duffel sandbox; `fixture` = labelled examples only |
| `DUFFEL_ACCESS_TOKEN` | Local + Vercel (Sensitive) | Server-only; must start with `duffel_test_` |
| `GEMINI_API_KEY` | Local + Vercel (Sensitive) | Server-only; AI explanations |
| `NEXT_PUBLIC_SUPABASE_URL` | Local + Vercel | Browser-safe project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Local + Vercel | Browser-safe publishable key (never a secret key) |
| `AUTH_MODE` | Local + Vercel | `supabase` = accounts on; anything else = browser-only |
| `FX_LIVE` | Local + Vercel | `on` = ECB rates via Frankfurter; `off` = bundled snapshot |
| `RATE_LIMIT_PER_MIN` | Local + Vercel | Per-IP request limit (default 20; AI explanations get half) |
| `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` | **Local only** | For `supabase db push` / `migration list`. Never in Vercel. |
| `SUPABASE_ACCESS_TOKEN` | **Local only** | Personal access token for the Management API scripts in `scripts/live/` (auth settings, test-user cleanup). Never in Vercel. |

Local values live in `frontend/.env.local` (gitignored); `.env.example` lists the names.

**Supabase auth settings** (applied by `node --env-file=.env.local scripts/live/configure-auth.mjs`): email sign-up on, email auto-confirm on (no inbox needed for the demo), anonymous sign-ins off, minimum password length 8, site URL and redirect list set to the Vercel URLs and localhost.

## 3. Run locally

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev                       # http://localhost:3000, uses .env.local
```

**Database** (Docker Desktop must be running)

```bash
cd backend
pnpm install
pnpm db:start
pnpm exec supabase db reset --local
pnpm exec supabase test db --local   # pgTAP: expect "Files=4, Tests=57, Result: PASS"
```

Hosted project: all 5 migrations are applied. Never run `db reset` against it.

## 4. Mocked tests versus live tests

| Command | Network | What it proves |
|---|---|---|
| `pnpm verify` | None (MSW blocks every request) | Format, lint, types, 136 unit and integration tests (validation, new cards, booking window, AI guard), secret, env and encoding checks |
| `pnpm build && pnpm check:bundle:local` | None | Production build; no server values in the browser bundle |
| `pnpm exec playwright test` | Local server in **fixture** mode | 53 journeys × 3 viewports (360, 768, 1280) plus 5 smoke checks, light and dark, axe, no horizontal overflow; screenshots in `test-results/screens/` |
| `pnpm test:live` | **Real** Duffel, Gemini, Supabase | Real test offers → reprice → **Duffel TEST order**; Gemini explanation passes the guard; two real email accounts: A saves a profile and a plan, B cannot read or overwrite them, A logs out and in and gets them back; test users deleted afterwards |
| `LIVE=1 BASE_URL=<url> pnpm exec playwright test tests/e2e/live-plan.spec.ts --project=desktop-1280` | **Real**, through the UI | Full wizard → Duffel fares → AI explanation → test booking |
| `BASE_URL=<url> EXPECT_PROVIDER=duffel_test pnpm test:smoke` | The deployed site | Health, demo disclosure, planner, login page, labelled search, security headers |

## 5. Manual end-to-end cases (deployed URL, private window)

| # | Steps | Expected |
|---|---|---|
| 1 | Plan my trip → leave **To** empty, set Latest before Earliest → Next | Red text under **To** and **Latest departure**, focus on To, "Fix 2 fields to continue.", still on step 1 |
| 2 | Cards → Next with nothing chosen | Under the card picker: "Add a card you hold, or tick …" |
| 3 | Add **Iberia Aire** → Edit → "Points appear after" 30; Points: Iberia Club 20,000, award found 20,500 + €40; Spending: Yes, always; Groceries €400/month; laptop €900 committed → Build | Your cards: Groceries → Iberia Aire; How this was calculated: laptop → Iberia Aire, 300 points |
| 4 | Edit → Points → 21,000 → Plan | "What changed since your last plan": points short 500 → 0 |
| 5 | Add **Amex Gold**, Bills €1,200/month, pay in full, a trip 6+ months away with a points gap | "Should you get a new card?" may show Amex Gold with welcome points, fee for N months and "Apply by"; with €600/month it explains the €1,000 minimum and never suggests spending more |
| 6 | Spending → "No, I carry a balance" → Build | "Card points are not planned"; "No new card helps this trip right now" |
| 7 | When to book | Headline (Book soon / Good time / Early), Spanish peak period if your dates hit one, price per date (Duffel test data), "General guidance … not a price forecast". Open the same plan again on another day: "Since your check on …" |
| 8 | "Explain this plan in plain words (AI)" | "Written by AI (gemini-…), checked against the plan" or "Rules-based explanation" with the reason |
| 9 | "Book this fare in test mode" → Confirm | **"TEST — no real ticket issued; no money charged"** with a Duffel test reference |
| 10 | Log in → Create account (any email, 8+ characters) → build a plan → My plans | The plan is listed. Log out, log in on another browser: answers and plans are back |
| 11 | Compare flights → One trip / Multi-city | Both search with Duffel test fares; `/trips/multi` lands on Multi-city |
| 12 | Privacy and data → Clear my data | Browser data, and account data if logged in, removed; you are logged out |

## 6. Verify the deployment

- `GET <url>/api/health` returns `{"mode":{"auth":"supabase","provider":"duffel_test"},…}`.
- Vercel → Project `a-una-milla-demo` → Deployments: the production deployment's commit SHA matches `git rev-parse HEAD` in `frontend` (recorded in `EVIDENCE.md`).
- The production URL opens in a private window without a Vercel login page.

## 7. Known limitations

- Duffel test mode is a sandbox: prices are not real, test orders issue no ticket.
- No price forecasting: "when to book" is general guidance plus your own price history.
- Award seats are never checked; award prices are your input or a labelled estimate.
- Card terms were checked on official pages on 27 Oct 2026; posting delays and some fees are unknown until you enter them. New-card ideas are not financial advice and approval is not guaranteed.
- Transfer routes are unverified or illustrative.
- Email auto-confirm is on for the demo (no verification email).

## 8. Final checklist

- [ ] `pnpm verify` green
- [ ] Playwright 3 viewports green
- [ ] `pnpm test:live` green
- [ ] Backend pgTAP green
- [ ] Production URL opens without login; health shows `duffel_test` and `supabase`
- [ ] A test booking shows the TEST label
- [ ] Rotate the DB password, the Supabase access token, and the Duffel and Gemini keys after the hackathon (they were shared in chat)
