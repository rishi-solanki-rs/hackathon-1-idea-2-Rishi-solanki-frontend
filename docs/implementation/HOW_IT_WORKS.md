# How A Una Milla works (for the owner)

Plain-language tour of the screens, the data flow and what is real, test or estimated. No secrets here.

## Screens

| Screen | URL | Purpose |
|---|---|---|
| Home | `/` | One message, **Plan my trip** button, link to Compare flights |
| Plan my trip | `/plan` | 4 question steps + the plan (main product) |
| Compare flights | `/compare` | Quick check without a plan. Tab **One trip** (cash vs points for one trip) and tab **Multi-city** (up to 6 flights) |
| Test booking | `/plan/book`, `/checkout` | Re-checks the Duffel test price and creates a Duffel **test** order |
| Log in | `/login` (top-right button) | Email + password. Shows your email when logged in, with My plans and Log out |
| My plans | `/my-plans` | Plans saved to your account (route, dates, recommendation, fare) |
| How it works | `/how-it-works` | Public version of this page |
| Privacy and data | `/settings` | Where data is stored, export, **Clear my data** |

## Data flow

```
Browser (wizard)                       Server (Vercel, Next.js API)                 Outside services
───────────────                        ────────────────────────────                 ────────────────
answers → localStorage ──(logged in)──────────────────────────────────────────────► Supabase planner_profiles (RLS: only you)
Build my plan ──► POST /api/plan/compute
                   1. validate (zod)
                   2. price up to 7 dates ───────────────────────────────────────────► Duffel test mode
                   3. plan engine (src/domain, pure rules, no AI):
                      points now · card per spend · verdict · safe date
                      new-card ideas (newCards.ts) · when to book (bookingWindow.ts)
               ◄── plan JSON
plan shown; saved ──(logged in)───────────────────────────────────────────────────► Supabase plans (RLS: only you)
"Explain (AI)" ──► POST /api/plan/explain ── facts only ────────────────────────────► Google Gemini
                   guard: every number/date must be in the plan, no forecasts or guarantees
               ◄── AI text, or rules text with the reason
"Book (test)" ──► /api/booking/reprice → /api/booking/test-order ─────────────────► Duffel test order (no money)
```

**AI versus engine:** the engine decides everything (prices come from Duffel test mode, points and cards from your answers and the catalogue). Gemini only rewrites the finished plan in plain words, and its text is rejected if it states any number, date or claim the plan does not contain.

## How the recommendations are made

- **Points or cash:** award overall cost = taxes + points × value per point (€0.010 by default, editable). Lower than the cash fare → points win; with the "least cash" goal, lower taxes win.
- **Safe booking date:** book-by date (or 21 days before departure) − 3 days.
- **Card for daily spending:** for each monthly spend, the held card earning the most points in the trip's programme (after a 1:1 MR → Avios transfer where it exists).
- **New card:** for each catalogue card you don't hold: monthly spending you already entered moved to it for the months left before the safe date (14 days to get the card, 30 days for points to post), minus what your current cards earn. The Amex Gold welcome offer (2,000 MR per 30-day month with €1,000 spend, first 10 months, up to 20,000; new cardholders only) counts only if your existing spending meets €1,000. Fee pro-rated. "Good fit" only if it closes your points gap in time or the welcome offer applies with positive value; never if you carry a balance.
- **When to book:** rule of thumb: Europe 21–60 days before, long haul 60–180; peak periods (Christmas and Reyes, Semana Santa, puente de mayo, July and August, Pilar, Todos los Santos, puente de diciembre) 45–90 and 90–240. Shows the price for each date checked and, on a later visit, the change since your last check (stored in your browser). Labelled "not a price forecast".

## What is real, test or estimated

| Kind | Examples |
|---|---|
| Real (official pages, with link and check date) | Card earn rates and fees, Amex Gold welcome offer |
| Test (Duffel sandbox) | Flight prices, airlines, bookings |
| Your input | Balances, award prices, spending, custom card terms |
| Estimate (labelled) | Award price when not entered (only if you hold points), point value, booking-time guidance, approval/posting assumptions |

## Live URL, Supabase and environment

- Live URL: https://a-una-milla-demo.vercel.app (Vercel project `a-una-milla-demo`, region cdg1). Deployed from the `main` branch of the frontend repo.
- Supabase project (ap-southeast-2) stores the card catalogue, `planner_profiles` and `plans`. Row-level security means each user can only read and write their own rows. Email auto-confirm is on for the demo.
- Server-only values (Duffel token, Gemini key) are Sensitive environment variables on Vercel and never reach the browser (checked by `check:bundle`). The Supabase URL and publishable key are browser-safe by design. The DB password and Supabase access token stay on your machine only.
