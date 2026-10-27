# Technical 06: Security, Privacy and Compliance

| Field | Value |
|---|---|
| Status | Design only; no control has been implemented or tested. **Research, not legal advice.** No legal compliance is claimed. |
| Sources | Phase 1 doc 03 §7 (CONFIRMED / UNRESOLVED / SAFEGUARD) and UNR-01..10; Next.js data-security guide; Supabase SSR/RLS docs (`[VERIFIED]` 26 Oct 2026) |

## 1. Scope: hackathon demo vs commercial service

| Aspect | Hackathon demo (now) | Commercial service (future) |
|---|---|---|
| Users | Jury and testers; no real personal data expected | Real consumers in Spain/EU |
| Data | Fixtures, Duffel **test**, user-entered sample values; guest-only by default | Personal, financial-habit and travel data |
| Hosting | Vercel Hobby (non-commercial), Supabase Free (optional) | Paid tiers with backups (doc 08) |
| Legal | Safeguards applied voluntarily | Lawyer review of UNR-01..10, DPIA, privacy notice and terms **before launch** |

## 2. Threat model (STRIDE-lite)

| Threat | Asset | Control | Test |
|---|---|---|---|
| Spoofing: forged session | User data | Supabase Auth; `getClaims()` server-side in the DAL; never trust `getSession()` on the server (`[VERIFIED]`) | TASK-003 spike |
| Tampering: direct POST to Server Actions | Trips, plans | Auth and ownership checks inside every action/DAL; Origin/Host check (Next built-in); zod re-validation | T-SEC-005 |
| Tampering: cross-user writes via child rows | Plans, ledger | Composite FK + RLS (doc 03 §2) | DB-003, DB-004 |
| Repudiation | Plan changes | Immutable `plan_versions` + `replan_events` + `plan_approvals` | DB-005, T-REG-015 |
| Information disclosure: user A reads B | Everything | RLS on every table; no anon grants; generic 404 | T-SEC-001, DB-002/003 |
| Information disclosure: secrets in client or repo | Duffel token, Supabase secret key | Server-only env (no `NEXT_PUBLIC_`), `server-only` imports, gitleaks scan, GitHub push protection (free for public repos, `[VERIFIED]`) | T-SEC-003 |
| Information disclosure: logs | Balances, spending, PII | Structured logger with an allow-list of fields; redaction | T-SEC-007 |
| Information disclosure: cached auth responses | Session | Supabase `setAll` cache headers applied; auth pages dynamic (`[VERIFIED]` Supabase SSR guidance) | TASK-003 |
| DoS / cost abuse | Search, Duffel quota | Rate limit 10/min; 10 s budget; cache; fixture fallback | T-SEC-004, T-INT-002 |
| Elevation: secret-key misuse | DB | Secret-key client only in `delete_account` and FX writes, in `src/server/admin/**` (import-restricted) | Code review + lint rule |
| Card data entry | PCI scope | No card-number/CVV/PIN fields; Luhn guard in schema and DB check | T-SEC-002, DB-015 |
| LLM prompt injection / fabricated numbers | Explanations | LLM off by default; validator rejects new numbers/entities; only derived, non-identifying fields are sent | T-SEC-008 |

## 3. Authentication modes (ADR-003, D-29)

**Hackathon default: `AUTH_MODE=guest`.** The full demo works without sign-in.

| Aspect | Guest-only mode (default) | Authenticated mode (`AUTH_MODE=supabase`, only after TASK-003 passes and credentials exist) |
|---|---|---|
| Storage | `localStorage` key `aum.guest.v1` (versioned schema; zod-validated on read; corrupt data quarantined to `aum.guest.v1.corrupt` with a notice) | Postgres under RLS |
| Disclosure | GuestModeBanner: "Your data is saved only in this browser on this device. It is not synced or backed up." | Account menu |
| Sign-in | — | Email OTP **via custom SMTP** (e.g. Resend Free, 3,000/month, 100/day), or GitHub OAuth. **Not** the built-in 2/hour sender (`[VERIFIED]`). |
| Session refresh | — | `proxy.ts` → `updateSession` with `getClaims()`, following the official example (`[VERIFIED]` docs; runtime unverified until TASK-003) |
| Session expiry mid-action | — | Action returns 401 `UNAUTHENTICATED`; the client keeps the draft locally, shows sign-in, and resumes (EC-TECH-14, T-FLOW-018) |
| Logout | "Clear local data" (SCR-14) | `signOut()`; clears React and router caches and any cached account data; the guest namespace is separate, so account data is never written into it |
| Export / delete | Local JSON export / local clear | API-29 / API-30 (re-auth ≤ 5 min; server-only cascade) |

### 3.1 Guest-to-account migration (API-25 + RPC `migrate_guest_data`)

1. On first successful sign-in, if a guest store exists with `migratedAt` unset, show "Move 3 trips and your wallet to your account?" (an explicit choice).
2. The client sends `{migrationId (uuid stored in the guest store), payload (schema v1)}`.
3. The server validates with zod, then calls the RPC in **one transaction**:
   - upsert by `(user_id, client_id)`;
   - trips with an existing `dedupe_key` are **reported** as duplicates, not merged.
4. **Idempotency:** unique `(user_id, migration_id)`. A retry returns the first result (409 `ALREADY_DONE` with counts).
5. **Failure:** the transaction rolls back completely; the guest store is untouched; the user can retry.
6. **Success:** the client stores `migratedAt` and keeps a read-only local copy for 7 days (`[ASSUMPTION]`) before clearing it.
7. **Two browsers:** each has its own `migrationId`; duplicates are detected by `dedupe_key` (EC-ONB-08).

Tests: T-FLOW-017, DB-009, DB-010.

## 4. Authorisation

- **Data Access Layer** `src/server/dal/*` (imports `server-only`): every function resolves the user via `getClaims()` and queries with the **user-session** Supabase client, so RLS is the second line of defence.
- **Server Actions are thin** and call the DAL (`[VERIFIED]` Next.js data-security guide).
- **Route Handlers:** the same DAL; resource IDs are never trusted without an ownership check; missing or foreign IDs both return 404.
- **Admin client:** `src/server/admin/**` only (lint-restricted), for `delete_account` and FX snapshot writes.

## 5. Secrets and environment variables (names only; values never in docs or Git)

| Variable | Scope | Where set |
|---|---|---|
| `PROVIDER_MODE` | server | Vercel (Preview: `fixture`; demo URL: `duffel_test`) |
| `DUFFEL_ACCESS_TOKEN` | **server-only secret** (test token) | Vercel env (Secret type) |
| `AUTH_MODE` | server + client flag | Vercel |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public (safe with RLS) | Vercel |
| `SUPABASE_SECRET_KEY` | **server-only secret** | Vercel env (Secret type) |
| `AI_EXPLANATIONS_ENABLED`, `AI_PROVIDER_API_KEY` | server-only | Vercel (off by default) |
| `RATE_LIMIT_PER_MIN` | server | Vercel |

**Rules for public repos:**
- `.env*` is gitignored except `.env.example` (names only).
- Run gitleaks via Docker before every push (`docker run --rm -v ${PWD}:/repo zricethezav/gitleaks:latest detect --source=/repo`; the image tag is pinned in TASK-000).
- Enable repository secret scanning and push protection (free for public repos, `[VERIFIED]`).
- Never paste tokens into chat, docs or MCP queries.

## 6. Input validation and abuse controls

- zod 4 on every request and response; maximum body size 64 KB for search and compute.
- Luhn guard on all free text.
- Rate limits as in doc 04.
- **Search time budget 10 s** and **engine limits** (50,000 nodes / 250 ms) to prevent CPU abuse.
- No HTML rendering of user text (React escaping).
- External links use `rel="noopener noreferrer"`.
- **Security headers:**
  - CSP with `default-src 'self'`, plus the Supabase URL and Frankfurter (server-side only) as needed;
  - `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal, `frame-ancestors 'none'`.
- Dependabot is enabled in both repos.

## 7. Logging

- Use a structured JSON logger.
- **Allowed fields:** request ID, route, status, latency, provider code, `limitHit`, `engine_version`.
- **Forbidden fields:** emails, names, passenger data, balances, spending amounts, tokens, full request bodies.
- Vercel Hobby keeps logs for 1 hour (doc 08), which is acceptable for the demo.

## 8. Privacy, retention and conflicts needing legal review

| Item | Position | Status |
|---|---|---|
| Data minimisation (GDPR art. 5(1)(c), 25) | No income, card numbers or bank logins; optional fields stay optional | Applied |
| Accessibility/health notes (GDPR art. 9) | Never stored in the profile; passed to award steps only | Applied |
| Export (art. 20) / erasure (art. 17) | API-29 / API-30, local equivalents | Planned |
| Retention (D-13) | Delete inactive accounts after 12 months, with notice | Proposed |
| **Conflict:** `quote_log` retention to substantiate savings claims (LCD/UCPD burden of proof) vs erasure on request | Delete with the account; keep only **aggregated, non-personal** claim evidence | **Needs legal review** |
| **Conflict:** test-booking references after account deletion | Deleted with the account | Needs legal review for the commercial case |
| Cookies (LSSI 22.2) | No analytics in P0 (D-14), so no consent banner is needed; essential auth cookies only | Applied |
| DPIA (AEPD list) | Required before commercial launch | Launch blocker |
| International transfers | Supabase/Vercel/LLM regions to be chosen (EU where available) before launch | Launch blocker |

## 9. Compliance split (carried from Phase 1 doc 03 §7)

**CONFIRMED requirements applied in design:**
- all-in final price (REQ-RES-01);
- ranking parameters page (REQ-RES-11);
- savings substantiation (REQ-RES-12);
- no "free" (REQ-RES-13);
- AI labelling (REQ-RES-14);
- cookie consent rule (REQ-RES-15);
- credit warning + APR (TAE) where card costs appear (REQ-RES-16);
- no bank-account linking;
- layered privacy notice.

**UNRESOLVED (lawyer before commercial launch):**
- UNR-01: CCD2 advisory services (M4).
- UNR-02: credit-intermediary registration if commissions are taken.
- UNR-03: who legally sells the ticket.
- UNR-04: art. 23 scope.
- UNR-05: DPIA and transfers.
- UNR-06: free-tier commercial use.
- UNR-07: AI Act role.
- UNR-08: Avios tax wording.
- UNR-09: Spanish-language consumer information.
- UNR-10: business cards.

**SAFEGUARDS:**
- no affiliate links or commissions (D-15);
- M4 neutral and P1;
- "pay in full" assumed (G2/G3);
- illustrative-data labels (REQ-RES-19);
- banned-word check;
- no CO₂ claims;
- export/delete;
- secret hygiene.

## 10. Security test list (linked)

T-SEC-001..009, DB-001..018 (doc 03 §7), T-INT-001..010, T-FUN-022, T-FUN-023, T-DEMO-005. The execution plan is in doc 07. **None has run.**
