# Technical 11: Traceability, Decisions and Final Readiness Gate

| Field | Value |
|---|---|
| Status | Planning record. Every artefact status below is **planned**; nothing is implemented or tested. |
| Covers | All 87 Phase 1 requirements (doc `../00` §9–10), D-00..D-33, AS-01..27, UNR-01..10 |

**Module codes (doc 01 §3.2):**
- **D** = MOD-DOMAIN `src/domain`
- **P** = MOD-PROV
- **S** = MOD-SERVER
- **U** = MOD-UI
- **G** = MOD-GUEST
- **B** = backend DB project
- **I** = MOD-I18N

## 1. Requirements traceability matrix

| Requirement | Modules | Screens | Tables | API / PRV | Engine | Tasks | Tests (T-* / DB-*) | Tier |
|---|---|---|---|---|---|---|---|---|
| REQ-OWN-000 | D | SCR-11 | TBL-22 | API-20 | ENG-10..13 | TASK-033 | T-REG-120, T-CALC-103, T-CALC-114..119, T-ALLOC-116 | P0r |
| REQ-BRF-01 | U S D | SCR-01, 02, 04 | TBL-11, 14, 15 | API-01, API-03 | ENG-03..07, 25 | TASK-015, 017 | T-FUN-001, T-FLOW-001, T-VAL-001, 002, 004, 007 | VS |
| REQ-BRF-02 | U S D | SCR-03, 04 | TBL-11, 12 | API-02 | ENG-19 | TASK-018 | T-FUN-002, T-FLOW-009, T-CALC-007, T-VAL-008, T-REG-008 | VS |
| REQ-BRF-03 | U D | SCR-04 | — | API-01 | ENG-05, 24 | TASK-017 | T-FUN-003, T-FUN-031, T-CALC-006, T-CALC-106, T-A11Y-003 | VS |
| REQ-BRF-04 | D U | SCR-04, 05 | TBL-15 | API-01 | ENG-04..06 | TASK-011, 017 | T-CALC-001, 002, 004, 022, T-FUN-027 | VS |
| REQ-BRF-05 | U S P | SCR-06, 07 | TBL-29 | API-26, 27; PRV-03 | ENG-16 | TASK-020, 031 | T-FUN-004, T-FUN-005, T-FLOW-015, T-INT-003..005, T-SEC-009, T-DEMO-002 | VS (steps) / P0r (checkout) |
| REQ-BRF-06 | U | all | — | API-31 | — | TASK-016, 022 | T-RESP-001..004, T-A11Y-001, T-FUN-012, T-INT-001, 007 | VS |
| REQ-BRF-07 | U D | SCR-02 | TBL-12 | API-01 | ENG-03, 25 | TASK-017 | T-CALC-004, 013, T-FLOW-008, T-VAL-012 | VS |
| REQ-BRF-08 | U G D | SCR-08 | TBL-17 | API-13 | ENG-08 | TASK-019 | T-FUN-007, T-FLOW-002, T-CALC-005, 110, T-VAL-009 | VS |
| REQ-BRF-09 | D | SCR-08 | TBL-03 | API-05 | ENG-08 | TASK-012 | T-CALC-010, 011 | VS |
| REQ-BRF-10 | U S G | SCR-13 | TBL-11 | API-10 | — | TASK-040 (guest: TASK-019) | T-FUN-006, T-FLOW-016, 017 | P0r |
| REQ-BRF-11 | U S | SCR-11 | TBL-28 | API-28 | — | TASK-042 (P0 part), TASK-105 (alerts P1) | T-TIME-011, T-FUN-030 | P0r / P1 |
| REQ-BRF-12 | U | SCR-02 | — | — | — | TASK-201 | T-FUN-015 | P2 |
| REQ-OWN-01 | D U | SCR-10, 11 | TBL-11 | API-20 | ENG-17, 18 | TASK-034, 036 | T-FLOW-007, T-TIME-010, 012, T-VAL-003 | P0r |
| REQ-OWN-02 | U D | SCR-08, 09 | TBL-16, 17 | API-13, 15 | ENG-08 | TASK-019, 035 | T-FLOW-003, T-FUN-007, 008 | VS / P0r |
| REQ-OWN-03 | U D | SCR-10 | TBL-18 | API-17 | ENG-23 | TASK-035 | T-FUN-009, T-ALLOC-007, T-VAL-010 | P0r |
| REQ-OWN-04 | U | SCR-10 | TBL-19 | API-18, 19 | — | TASK-035 | T-FUN-010, T-CALC-103 | P0r |
| REQ-OWN-05 | D U | SCR-11 | TBL-20, 28 | API-20 | ENG-18 | TASK-034, 036 | T-TIME-001..007, T-TIME-112 | P0r |
| REQ-OWN-06 | D I | SCR-04, 11 | — | — | ENG-18, 24 | TASK-021, 034 | T-FUN-022, T-TIME-006, T-FUN-012 | VS / P0r |
| REQ-OWN-07 | D | SCR-02, 04 | — | API-01 | ENG-25 | TASK-011 | T-CALC-013 | VS |
| REQ-OWN-08 | D S U B | SCR-12 | TBL-20, 21, 27 | API-11, 20, 21, 23 | ENG-20 | TASK-037 | T-REG-001..016, T-REG-107, DB-005, DB-011 | P0r |
| REQ-OWN-09 | D U | SCR-04 | — | API-01 | ENG-13 | TASK-017, 034 | T-FLOW-001, 005, 006, T-CALC-110 | VS |
| REQ-OWN-10 | D U | SCR-04 | TBL-10 | API-01 | ENG-25 | TASK-011, 017 | T-CALC-012, T-FUN-013 | VS |
| REQ-OWN-11 | U S B | SCR-09 | TBL-16 | API-15 | schemas | TASK-016, 035 | T-SEC-002, T-FUN-008, 011, DB-015 | VS |
| REQ-OWN-12 | G S B | SCR-13, 17 | TBL-31 | API-25 | — | TASK-019, 003, 040 | T-FUN-006, T-FLOW-017, 018, DB-009, 010 | VS (guest) / P0r (auth, conditional) |
| REQ-OWN-13 | D U | SCR-10, 11 | TBL-10 | API-20 | ENG-13 | TASK-033 | T-CALC-103, 108, 113, T-VAL-011 | P0r |
| REQ-RES-01 | U D | SCR-04, 05 | TBL-14 | API-01 | ENG-04 | TASK-017 | T-FUN-016 | VS |
| REQ-RES-02 | P S | SCR-07 | TBL-14 | API-26, 27; PRV-01a | — | TASK-030, 031 | T-INT-003, 004 | P0r |
| REQ-RES-03 | U D | SCR-02 | TBL-13 | API-01 | schemas | TASK-016 | T-VAL-005, 006 | VS |
| REQ-RES-04 | U | SCR-06 | TBL-13 | — | — | TASK-020 | T-FUN-017 | VS |
| REQ-RES-05 | U | SCR-06 | TBL-13 | — | — | TASK-020 | T-FUN-018 | VS |
| REQ-RES-06 | P U | SCR-05 | TBL-14 | PRV-01a | — | TASK-017, 030 | T-INT-010 | VS / P0r |
| REQ-RES-07 | D | SCR-08 | TBL-03 | API-05 | ENG-08 | TASK-012 | T-CALC-010, 011 | VS |
| REQ-RES-08 | U | SCR-06 | — | — | — | TASK-020 | T-FUN-019 | VS |
| REQ-RES-09 | D | SCR-08, 11 | TBL-02, 17 | — | ENG-14 | TASK-034 | T-TIME-008 | P0r |
| REQ-RES-10 | U | SCR-05 | — | — | — | TASK-017 | T-FUN-020 | VS |
| REQ-RES-11 | U | SCR-15 | — | — | — | TASK-021 | T-FUN-014 | VS |
| REQ-RES-12 | S B | SCR-15 | TBL-15 | API-01 | — | TASK-017, 040 | T-FUN-021 | VS (local) / P0r |
| REQ-RES-13 | I | all | — | — | — | TASK-021 | T-FUN-022 | VS |
| REQ-RES-14 | D U | SCR-11 | — | — | ENG-22 | TASK-038 | T-FUN-023, T-SEC-008 | P0r (if LLM on) |
| REQ-RES-15 | U | SCR-14 | TBL-30 | — | — | TASK-022 | T-FUN-024 | VS |
| REQ-RES-16 | U | SCR-16 | TBL-04 | — | — | TASK-101 | T-FUN-025 | P1 |
| REQ-RES-17 | P U | all | TBL-14 | PRV-* | — | TASK-014 | T-FUN-012, T-DEMO-001 | VS |
| REQ-RES-18 | U | SCR-04 | — | — | — | TASK-017 | T-FUN-026 | VS (static) / P1 |
| REQ-RES-19 | U D I | SCR-04 | — | API-01 | ENG-24 | TASK-017, 021 | T-FUN-031, T-DEMO-005 | VS |
| REQ-RES-20 | D U | SCR-06, 08 | TBL-03, 17 | API-05 | ENG-08 | TASK-012, 020 | T-FUN-032, T-CALC-024 | VS |
| REQ-RES-21 | D | SCR-04, 11 | TBL-02 | API-01 | ENG-17 | TASK-034 | T-VAL-003, T-TIME-012 | P0r |
| REQ-REC-RULE-01 | D B | SCR-09 | TBL-06 | API-04 | ENG-09 | TASK-032 | T-CALC-015..020 | P0r |
| REQ-REC-CAT-01 | B U P | SCR-09 | TBL-04, 05 | API-04; PRV-05 | — | TASK-012, 035, 039 | T-FUN-033, T-CALC-024, DB-013 | P0r |
| REQ-REC-FCST-01 | D U | SCR-11 | TBL-24 | API-24 | ENG-14, 15 | TASK-034 | T-CALC-021, T-REG-017 | P0r |
| REQ-REC-BUY-01 | D U | SCR-06 | — | — | ENG-16 | TASK-020 | T-CALC-023 | VS |
| REQ-REC-CARD-01 | D | SCR-11 | TBL-22 | API-20 | ENG-10..12 | TASK-033 | T-CALC-101 | P0r |
| REQ-REC-CARD-02 | D | SCR-11 | TBL-22 | API-20 | ENG-12 | TASK-033 | T-ALLOC-102, T-CALC-025 | P0r |
| REQ-REC-CARD-03 | D | SCR-11 | — | API-20 | ENG-13 | TASK-033 | T-CALC-103 | P0r |
| REQ-REC-CARD-04 | D U | SCR-16 | — | API-20 | ENG-11, 12 | TASK-033 (engine), TASK-101 (UI) | T-CALC-104 | P0 engine / P1 UI |
| REQ-REC-CARD-05 | D | SCR-11 | — | API-20 | ENG-11 | TASK-033 | T-TIME-105 | P0r |
| REQ-REC-CARD-06 | D | SCR-11, 16 | — | API-20 | ENG-13 | TASK-033 | T-CALC-108 | P0r / P1 |
| REQ-REC-CARD-07 | U S | SCR-14, 16 | TBL-26 | API-22 | — | TASK-041 | T-FLOW-109 | P0r |
| REQ-REC-CARD-08 | D | SCR-11 | TBL-22 | API-20 | ENG-10 | TASK-033, 103 | T-ALLOC-111 | P0r / P1 |
| REQ-REC-VAL-01 | D | SCR-05 | — | API-01 | ENG-06, 07 | TASK-011 | T-CALC-106, 003, 009 | VS |
| REQ-REC-REPLAN-01 | D U | SCR-12 | TBL-27 | API-18, 20 | ENG-20 | TASK-037 | T-REG-107 | P0r |
| REQ-REC-DATA-01 | D | SCR-11 | — | API-20 | ENG-13 | TASK-034 | T-CALC-110 | P0r |
| REQ-REC-TIME-01 | D | SCR-11 | — | API-20 | ENG-18 | TASK-034 | T-TIME-112 | P0r |
| REQ-REC-RES-01 | D | SCR-11 | TBL-10 | API-20 | ENG-13 | TASK-033 | T-CALC-113 | P0r |
| REQ-REC-MARG-01 | D | SCR-11 | TBL-22 | API-20 | ENG-10, 11 | TASK-033 | T-CALC-114 | P0r |
| REQ-REC-MARG-02 | D | SCR-11 | TBL-22 | API-20 | ENG-10, 11 | TASK-033 | T-CALC-115 | P0r |
| REQ-REC-MARG-03 | D | SCR-11 | TBL-22 | API-20 | ENG-10, 11 | TASK-033 | T-ALLOC-116 | P0r |
| REQ-REC-MARG-04 | D | SCR-11 | TBL-22 | API-20 | ENG-10, 11 | TASK-033 | T-CALC-117, T-CALC-026 | P0r |
| REQ-REC-MARG-05 | D | SCR-11 | — | API-20 | ENG-08, 11 | TASK-033 | T-CALC-118 | P0r |
| REQ-REC-MARG-06 | D | SCR-11 | — | API-20 | ENG-11 | TASK-033 | T-CALC-119 | P0r (a: engine / P1 UI) |
| REQ-REC-INV-01 | D B | — | TBL-22, 23 | — | ENG-10 | TASK-033, 039 | T-ALLOC-001..008, T-REG-120, DB-006, 007, 008 | P0r |
| REQ-REC-EXPL-01 | D U | SCR-11 | TBL-25 | — | ENG-21, 22 | TASK-038 | T-FUN-027, T-SEC-008 | P0r |
| REQ-REC-REJ-01 | U S | SCR-05, 11, 14 | TBL-26 | API-22 | — | TASK-041 | T-FUN-028, T-FLOW-109 | P0r |
| REQ-REC-CONF-01 | D U | SCR-04, 11 | — | — | ENG-24 | TASK-011 | T-FUN-029, T-TIME-006 | VS |
| REQ-REC-MULTI-01 | D | SCR-03 | — | API-02 | ENG-19 | TASK-018 | T-CALC-007 | VS |
| REQ-REC-BONUS-01 | D | SCR-11 | — | API-20 | ENG-11 | TASK-033, 036 | T-FLOW-121 | P0r |
| REQ-NFR-01 | P S | — | — | API-01 | — | TASK-014, 022 | T-INT-001, T-DEMO-001 | VS |
| REQ-NFR-02 | U | all | — | — | — | TASK-016, 022 | T-A11Y-001..004 | VS |
| REQ-NFR-03 | U | all | — | — | — | TASK-022 | T-RESP-001..004 | VS |
| REQ-NFR-04 | S B | — | all | all | — | TASK-015, 039 | T-SEC-001..005, DB-001..004 | VS / P0r |
| REQ-NFR-05 | S U B | SCR-14 | all user | API-29, 30 | — | TASK-041 | T-FUN-011, T-SEC-006, DB-016 | P0r |
| REQ-NFR-06 | P | — | — | registry | — | TASK-014 | T-DEMO-003, T-INT-009 | VS |
| REQ-NFR-07 | D B | — | TBL-20 | — | ENG-01 | TASK-010, 037 | T-REG-015, T-CALC-001, T-VAL-013, DB-005 | VS / P0r |
| REQ-NFR-08 | S | — | TBL-32 | API-01 | — | TASK-015 | T-SEC-004, T-INT-002, DB-014 | VS |
| REQ-NFR-09 | S | — | — | — | — | TASK-014 | T-SEC-007 | VS |
| REQ-NFR-10 | D I | all | — | — | ENG-01, 02 | TASK-010, 016 | T-TIME-009, T-FUN-034, T-CALC-008 | VS |
| REQ-NFR-11 | U | all | — | — | — | TASK-022 | Manual Lighthouse | VS |

Count: 87 requirement rows (REQ-OWN-000 + BRF-01..12 + OWN-01..13 + RES-01..21 + REC (29) + NFR-01..11 = 1 + 12 + 13 + 21 + 29 + 11).

## 2. Decision register

**Status:** LOCKED · CONFIRMED (owner answered) · PROPOSED (recommended default; needs approval) · LAUNCH (can stay open until commercial launch).
**Owner of every decision:** the product owner. Legal items: owner + qualified Spanish lawyer.

| ID | Decision | Default | Status | Alternatives | Effect on implementation | Approval needed by |
|---|---|---|---|---|---|---|
| D-00 | Principle P-01 | As written | LOCKED | — | INV-8, T-REG-120 | — |
| D-01 | Default objective | Goal B | PROPOSED | Goal A | ENG-25 default | GATE-02 |
| D-02 | Valuation | €0.010 editable + break-even | PROPOSED | Break-even only | ENG-07 | GATE-02 |
| D-03 | Market | Spain, EUR | PROPOSED (research-backed) | — | Catalogue | GATE-02 |
| D-04 | UI language | English P0, string catalogue | CONFIRMED (owner); client OPEN (QA-11) | es-ES now | MOD-I18N | — |
| D-05 | Reserve required in M3 | Required, no default | PROPOSED | Optional | ENG-13 G4 | GATE-02 |
| D-06 | M4 new cards | P1 | PROPOSED / LAUNCH | P0 | SCR-16 | Before P1 |
| D-07 | Currency | EUR only P0 | PROPOSED | Multi | ENG-02 display | GATE-02 |
| D-08 | minBenefit | max(€10, 5%) | PROPOSED | Other | ENG-12 | GATE-02 |
| D-09 | New-card fee horizon | 12 months | PROPOSED / LAUNCH | Until trip | ENG-11 (P1 UI) | Before P1 |
| D-10 | v_residual | 0 | PROPOSED | User value | ENG-11 | GATE-02 |
| D-11 | Need buffer | +10% forecast only | PROPOSED | 0 / 5 / 15% | ENG-11, 18 | GATE-02 |
| D-12 | Refund buffer | €0 / largest refundable | PROPOSED | — | ENG-10 | GATE-02 |
| D-13 | Retention | 12 months inactive | LAUNCH | — | TBL-* jobs (P1) | Before real users |
| D-14 | Analytics | None in P0 | PROPOSED | Cookieless | No consent banner | GATE-02 |
| D-15 | Business model | Free, no commissions | PROPOSED / LAUNCH | Affiliate (lawyer first) | No affiliate links | GATE-02 (P0 part) |
| D-16 | Limits | ≤ 6 legs, ≤ 9 travellers, ≤ 3×3 airports | PROPOSED | — | Schemas | GATE-02 |
| D-17 | Infants | Cash yes; award instructions only | PROPOSED | — | SCR-06 | GATE-02 |
| D-18 | Guest data | localStorage, one-time migration | PROPOSED | Anonymous auth (P1) | MOD-GUEST | GATE-03 |
| D-19 | Live data | Duffel test only | CONFIRMED | — | PRV registry | — |
| D-20 | AI | Templates + optional LLM flag (off) | CONFIRMED | — | ENG-21/22 | — |
| D-21 | Auth provider | Supabase Auth (free tier) when auth is enabled | CONFIRMED (in principle) | — | TASK-003 | — |
| D-22 | Approval timing | Tonight (Mon 26 Oct) | PROPOSED | — | Schedule | GATE-00 |
| D-23 | Default preferences | Self-transfer no; nearby airports off; overnight layover no | PROPOSED | — | Schemas | GATE-02 |
| D-24 | Tolerance | max(5%, €25) | PROPOSED | — | ENG-25 | GATE-02 |
| D-25 | Gap-fill limit | 20% | PROPOSED | 10% / 30% | ENG-16 | GATE-02 |
| D-26 | Cap-scope default | Restrictive | PROPOSED | Footnote reading | ENG-09 | GATE-02 |
| D-27 | P0 catalogue set | Phase 1 doc 00 §5.11 | PROPOSED | — | Seed / `catalogue.json` | GATE-02 |
| D-28 | REF-01 in demo | Only with client permission, labelled | PROPOSED | Exclude | Demo script | GATE-02 |
| D-29 | Hackathon auth mode | **Guest-only default**; auth only if TASK-003 passes + credentials | PROPOSED | Auth required | ADR-003 | GATE-03 |
| D-30 | Hosting | Vercel on owner's account, non-commercial demo | **CONFIRMED** (owner, 26 Oct) | Netlify | ADR-008 | — |
| D-31 | Repo layout | frontend = Next.js app; backend = Supabase DB project | PROPOSED | Monorepo; NestJS backend | ADR-012 | GATE-03 |
| D-32 | Docs location | Copy into `frontend/docs` at TASK-000; repo copy canonical after | PROPOSED | Keep workspace only | TASK-000 | GATE-03 |
| D-33 | Demo URL environment | Production domain of a dedicated demo project, labelled DEMO | PROPOSED | Unprotected preview | Vercel settings | GATE-03 |

**New assumptions (Phase 2):**
- **AS-25:** search limits K=5, W=5, 50,000 nodes, 250 ms.
- **AS-26:** exact allocation for ≤ 12 expenses per window and ≤ 3 non-linear cards.
- **AS-27:** submission deadline is 23:59 IST on Wed 28 Oct (confirm with organiser).

## 3. Data-flow coverage

DF-01..DF-14 are defined in doc 04 §7. Each SCR maps to at least one DF:

| Flow | Screens |
|---|---|
| DF-01 | SCR-02, 04, 05 |
| DF-02 | SCR-03, 04 |
| DF-03 | SCR-04, 08, 13 |
| DF-04 | SCR-08 |
| DF-05 | SCR-09, 10 |
| DF-06 | SCR-10 |
| DF-07..09 | SCR-11 |
| DF-10 | SCR-06, 07 |
| DF-11 | SCR-13, 17 |
| DF-12 | SCR-12 |
| DF-13, DF-14 | SCR-14 |

- SCR-01, SCR-15 and SCR-16 are static, or have their data covered by DF-01 and DF-07.

## 4. Blockers

| Type | Item | Blocks |
|---|---|---|
| Owner approval | GATE-00 (master plan), GATE-02 (product defaults), GATE-03 (D-29, 31, 32, 33) | Any implementation |
| Owner access | Git push auth for both repos (`gh` not authenticated); Vercel ↔ GitHub connection on the owner's account | TASK-000, TASK-002 |
| Optional credentials | Duffel **test** token (TASK-030/031); Supabase project + custom SMTP or GitHub OAuth (TASK-003/040) | Those tasks only (fallbacks exist) |
| Tooling safety | Supabase MCP account-wide → scope or disable | Any MCP DB use |
| External facts | Duffel v2 order payload shape (re-check docs in TASK-030); Duffel test-mode rate limit; eslint 10 + eslint-config-next compatibility (TASK-002) | Specific tasks |
| Schedule | Organiser timezone for the deadline (AS-27) | Planning only |
| Commercial launch (not hackathon) | UNR-01..10, DPIA, paid tiers, data residency, Spanish legal texts, live-data agreements | Commercial use |

## 5. Final readiness gate (must pass before development is authorised)

| Gate | Check | Status now |
|---|---|---|
| GATE-01 | Owner approves ADR-001 (Option A) and ADR-012 (two repos) | Pending owner |
| GATE-02 | Owner approves or accepts the defaults for D-01, 02, 03, 05, 07, 08, 10, 11, 12, 14, 15 (P0 part), 16, 17, 23, 24, 25, 26, 27, 28 | Pending owner |
| GATE-03 | Owner confirms D-18, D-29, D-31, D-32, D-33 | Pending owner |
| GATE-04 | Owner provides Git auth and the Vercel connection; optional Duffel test token / Supabase | Pending owner |
| GATE-05 | Supabase MCP scoped read-only or disabled | Pending (currently account-wide) |
| GATE-06 | Documentation consistency check (master plan §8) passed with no unresolved failure | See the master plan §8 |
| GATE-07 | Deadline and timezone confirmed (AS-27) | Pending |

**Development is authorised only when GATE-00 through GATE-07 are satisfied or explicitly waived by the owner.**
