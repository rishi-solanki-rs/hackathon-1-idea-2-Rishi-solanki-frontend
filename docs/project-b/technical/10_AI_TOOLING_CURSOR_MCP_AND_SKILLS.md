# Technical 10: AI Tooling, Cursor, MCP and Skills

| Field | Value |
|---|---|
| Status | Inventory and plan. **Nothing was installed, configured or authenticated in this phase.** |
| Checked | 26 Oct 2026, 18:12–18:47 IST, via the Cursor tool catalogue (read-only) |

## 1. What each tool *is*

| Kind | Meaning here | Examples |
|---|---|---|
| MCP server | A tool server the agent calls during development; **not** part of the app | Context7, Playwright MCP, Supabase MCP, shadcn MCP, Vercel MCP |
| Library | Code shipped in or used by the app/tests | Next.js, zod, @playwright/test, @axe-core/playwright, msw |
| CLI | A command-line dev tool | pnpm, supabase CLI, gh, vercel CLI, gitleaks (Docker) |
| Skill | Reusable agent instructions (`SKILL.md`) | Superpowers skills, Cursor built-in skills |
| Application API | An external service the **app** calls at runtime | Duffel (test), Frankfurter |

## 2. Verified current status (no secrets read or printed)

| Tool | Status | Use in Project B |
|---|---|---|
| Context7 MCP | **ready** (authenticated). Used in this phase for Next.js, Duffel SDK and Supabase docs. | Library/API docs before coding each module |
| Playwright MCP (plugin) | ready | Exploratory checks only; **CI uses @playwright/test** |
| Cursor IDE browser | ready | Visual checks of the Vercel demo/preview |
| Figma MCP | ready | Not needed (no Figma designs) |
| Supabase MCP (plugin) | ready but **account-wide with write tools** (`apply_migration`, `execute_sql`, `create_project`, `pause_project`, …) | **Not used** in planning. For implementation: re-scope to `project_ref` + `read_only=true` (+ `features=database,docs`) or keep disabled (section 4). |
| Superpowers skills | installed | brainstorming (done), writing-plans, **test-driven-development** for `src/domain`, systematic-debugging, **verification-before-completion** before each DoD |
| Cursor built-in skills | available | review-security, review-bugbot (only if asked), verification |
| `gh` CLI 2.98 | installed, **not authenticated** | Owner runs `gh auth login` for TASK-000 pushes (or uses Git Credential Manager) |
| Supabase CLI / Vercel CLI | not installed | Pinned dev dependency / `pnpm dlx` at task time |
| Docker 29.8 | installed | `supabase start`/`test db`, gitleaks |
| `redis-development` plugin | installed, irrelevant | Disable (no Redis in the architecture) |

## 3. Planned project configuration (created in TASK-001; not now)

- **`AGENTS.md` (both repos):**
  - stack and commands;
  - "domain code is pure";
  - "every migration: GRANT + enable RLS + policies + pgTAP test";
  - "never print, commit or send secrets";
  - "every value carries provenance; never claim real prices";
  - "run the doc 07 §4 loop and write evidence before marking done".
- **`.cursor/rules/`:**

  | Rule | Scope |
  |---|---|
  | `domain-purity.mdc` | `src/domain/**` |
  | `migrations.mdc` | `supabase/migrations/**` |
  | `testing-loop.mdc` | always |
  | `provenance-copy.mdc` | `messages/**`, `src/components/**` |
  | `no-secrets.mdc` | always |

- **`.cursor/mcp.json` (frontend):**

  ```json
  { "mcpServers": { "shadcn": { "command": "npx", "args": ["shadcn@4.22.1", "mcp"] } } }
  ```

- **`.cursor/mcp.json` (backend):** only if scoping is possible:

  ```json
  { "mcpServers": { "supabase": { "url": "https://mcp.supabase.com/mcp?project_ref=${env:SUPABASE_PROJECT_REF}&read_only=true&features=database,docs" } } }
  ```

  The account-wide plugin connection is disabled in Cursor settings while this scoped entry is used.
- **Optional hook** (`.cursor/hooks.json`, `beforeShellExecution`): exit 2 to block `supabase db push` without `--dry-run`, `vercel --prod`, `git push --force`, and `Remove-Item -Recurse` outside the repo.

## 4. Safe permission boundaries

1. **Supabase MCP:** read-only, one project, or disabled. **Migrations are applied by the human/agent through the CLI after review and backup**, never through MCP `apply_migration` or `execute_sql`.
2. **Vercel MCP or CLI:** read logs and deployment status only, with owner approval. Deploys happen through Git integration.
3. **Shell:** keep manual approval for any command touching remote state (push, deploy, db push).
4. **Secrets:** never paste tokens into chat, docs, MCP queries or commits. Store them in Vercel or local `.env.local`, which is gitignored.
5. **Parallel agents:** one main agent owns integration; subagents get disjoint folders (doc 09).

## 5. Workflow per task (with AI)

1. Read the task in doc 09 plus the linked REQ/EC/T IDs.
2. Context7: query the exact API you are about to use.
3. Superpowers TDD: write the failing T-* test from the fixture, implement, make it pass.
4. Run the doc 07 §4 loop.
5. For UI tasks: run the Playwright spec, then do a visual check in the Cursor browser.
6. Superpowers verification-before-completion, then write the evidence entry, then commit.
7. At gates: security review skill (OWASP-style) over the diff, then the full regression and deploy.

## 6. Do not install (redundant or risky)

| Tool | Reason |
|---|---|
| GitHub MCP | The `gh` CLI is enough |
| 21st.dev MCP | shadcn covers it |
| Graphify | Too small a repo to benefit |
| Firecrawl / Exa MCP | Cursor already has web search and fetch |
| Inngest, Trigger.dev, Redis | No queue requirement |
| Lighthouse CI | Manual Lighthouse is enough |
| A second Context7 or Playwright install | Already installed |
| npm package `gitleaks` | Unrelated; use the official Docker image |
