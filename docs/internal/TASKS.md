# TASKS.md — Sprint Task Board

## Status Legend
- 🔲 Not Started
- 🔄 In Progress  
- ✅ Done
- 🚫 Blocked

---

## Phase 0: Project Setup

| ID   | Task                                    | Agent   | Status |
|------|-----------------------------------------|---------|--------|
| P0-1 | Initialize Rust workspace + Cargo.toml  | Agent-1 | ✅     |
| P0-2 | Initialize Bun monorepo (packages/)     | Agent-4 | ✅     |
| P0-3 | Initialize Next.js 14 dashboard         | Agent-5 | ✅     |
| P0-4 | Docker Compose + Dockerfiles            | Agent-6 | ✅     |
| P0-5 | GitHub Actions CI (test + build)        | Agent-6 | ✅     |
| P0-6 | SQLite schema + migrations (Rust)       | Agent-1 | ✅     |
| P0-7 | PostgreSQL schema + migrations (server) | Agent-4 | ✅     |

## Phase 1: CLI Core (Use Case 1 — AI Adoption)

| ID   | Task                                              | Agent   | Status |
|------|---------------------------------------------------|---------|--------|
| C1-1 | git proxy — intercept all git subcommands         | Agent-1 | ✅     |
| C1-2 | Hook installer (post-commit, pre-commit)          | Agent-1 | ✅     |
| C1-3 | `gitintel init` — per-repo setup                  | Agent-1 | ✅     |
| C1-4 | `gitintel checkpoint` — receive agent line marks  | Agent-1 | ✅     |
| C1-5 | Post-commit: write Authorship Log to git notes    | Agent-1 | ✅     |
| C1-6 | Git notes sync (push/fetch refs/ai/authorship/*)  | Agent-1 | ✅     |
| C1-7 | Preserve attribution through rebase/merge/squash  | Agent-1 | ✅     |
| C1-8 | `gitintel blame <file>` — line-level AI/Human     | Agent-1 | ✅     |
| C1-9 | `gitintel stats` — repo-level breakdown           | Agent-1 | ✅     |
| C1-10| `gitintel stats --developer` — per-dev breakdown  | Agent-1 | ✅     |
| C1-11| Claude Code hook integration (CLAUDE.md hook)     | Agent-1 | ✅     |
| C1-12| Cursor hook integration                           | Agent-1 | ✅     |
| C1-13| Codex / Copilot hook integration                  | Agent-1 | ✅     |

## Phase 2: Cost Engine (Use Case 2 — Cost Tracking)

| ID   | Task                                              | Agent   | Status |
|------|---------------------------------------------------|---------|--------|
| C2-1 | OTel collector (local port 4317)                  | Agent-2 | ✅     |
| C2-2 | Claude Code OTel metric ingestion                 | Agent-2 | ✅     |
| C2-3 | Session correlator (OTel session → git commit)    | Agent-2 | ✅     |
| C2-4 | Model pricing table (Claude, OpenAI, Gemini)      | Agent-2 | ✅     |
| C2-5 | Cost calculator (tokens × pricing → USD)          | Agent-2 | ✅     |
| C2-6 | `gitintel cost --commit <sha>`                    | Agent-2 | ✅     |
| C2-7 | `gitintel cost --since <period>`                  | Agent-2 | ✅     |
| C2-8 | `gitintel cost --branch <name>`                   | Agent-2 | ✅     |
| C2-9 | `gitintel cost --developer <email>`               | Agent-2 | ✅     |
| C2-10| Cost summary in commit message (prepare-msg hook) | Agent-2 | ✅     |
| C2-11| Cost data sync to cloud API                       | Agent-2 | ✅     |

## Phase 3: Context Manager (Use Case 3 — Context Optimization)

| ID   | Task                                              | Agent   | Status |
|------|---------------------------------------------------|---------|--------|
| C3-1 | Repo scanner (detect stack, structure, patterns)  | Agent-3 | ✅     |
| C3-2 | CLAUDE.md template engine                         | Agent-3 | ✅     |
| C3-3 | `gitintel context init` — generate CLAUDE.md      | Agent-3 | ✅     |
| C3-4 | Token counter module (tiktoken-compatible)        | Agent-3 | ✅     |
| C3-5 | Session transcript analyzer (section references)  | Agent-3 | ✅     |
| C3-6 | Section scorer (reference frequency → relevance)  | Agent-3 | ✅     |
| C3-7 | `gitintel context optimize` — prune + compress    | Agent-3 | ✅     |
| C3-8 | `gitintel context diff` — token delta report      | Agent-3 | ✅     |
| C3-9 | Memory store CRUD (SQLite-backed)                 | Agent-3 | ✅     |
| C3-10| `gitintel memory add/get/list/prune`              | Agent-3 | ✅     |
| C3-11| Auto-generate per-directory sub-CLAUDE.md         | Agent-3 | ✅     |
| C3-12| Memory export to CLAUDE.md section                | Agent-3 | ✅     |

## Phase 4: API Server

| ID   | Task                                              | Agent   | Status |
|------|---------------------------------------------------|---------|--------|
| S1-1 | Bun + Hono server bootstrap                       | Agent-4 | ✅     |
| S1-2 | PostgreSQL connection + Drizzle ORM               | Agent-4 | ✅     |
| S1-3 | Auth middleware (Clerk JWT verification)          | Agent-4 | ✅     |
| S1-4 | POST /api/v1/sync/attribution                     | Agent-4 | ✅     |
| S1-5 | POST /api/v1/sync/cost                            | Agent-4 | ✅     |
| S1-6 | GET /api/v1/stats/team                            | Agent-4 | ✅     |
| S1-7 | GET /api/v1/stats/developer/:id                   | Agent-4 | ✅     |
| S1-8 | GET /api/v1/cost/summary                          | Agent-4 | ✅     |
| S1-9 | POST /api/v1/webhooks/github (PR annotations)     | Agent-4 | ✅     |
| S1-10| POST /api/v1/alerts/budget                        | Agent-4 | ✅     |

## Phase 5: Dashboard

| ID   | Task                                              | Agent   | Status |
|------|---------------------------------------------------|---------|--------|
| D1-1 | Next.js 14 + shadcn/ui setup                      | Agent-5 | ✅     |
| D1-2 | Auth (Clerk provider + protected routes)          | Agent-5 | ✅     |
| D1-3 | Team AI adoption heatmap (by dev × week)          | Agent-5 | ✅     |
| D1-4 | Cost trend chart (daily spend, by model)          | Agent-5 | ✅     |
| D1-5 | Developer leaderboard (AI%, cost, commits)        | Agent-5 | ✅     |
| D1-6 | Repo breakdown page                               | Agent-5 | ✅     |
| D1-7 | PR cost annotation view                           | Agent-5 | ✅     |
| D1-8 | Budget alert configuration UI                     | Agent-5 | ✅     |
| D1-9 | Context optimizer suggestions panel               | Agent-5 | ✅     |

## Phase 7: Distribution (Phase 2 from docs/internal/PRODUCT_STRATEGY.md)

| ID   | Task                                                                           | Agent   | Status |
|------|--------------------------------------------------------------------------------|---------|--------|
| D2-1 | Pre-built binaries CI pipeline (Linux x64/ARM64, macOS x64/ARM64, Win x64)    | Agent-0 | ✅     |
| D2-2 | GitHub Releases auto-publish on `git tag v*`                                   | Agent-0 | ✅     |
| D2-3 | `install.sh` — one-liner install script (macOS + Linux)                        | Agent-0 | ✅     |
| D2-4 | `install.ps1` — Windows PowerShell installer with ARM64 detection              | Agent-0 | ✅     |
| D2-5 | Homebrew formula `Formula/gitintel.rb` + release CI auto-updates checksums     | Agent-0 | ✅     |
| D2-6 | npm wrapper `@gitintel/cli` — downloads correct pre-built binary on install    | Agent-0 | ✅     |
| D2-7 | `gitintel update` — self-update command (checks GitHub Releases, replaces bin) | Agent-0 | ✅     |
| D2-8 | gitintel.ai marketing site                                                     | Agent-5 | 🔲     |

## Phase 8: Auto-Attribution (Phase 3 from docs/internal/PRODUCT_STRATEGY.md)

| ID   | Task                                                                                      | Agent   | Status |
|------|-------------------------------------------------------------------------------------------|---------|--------|
| A3-1 | Claude Code PostToolUse hook install in `gitintel init` → `~/.claude/settings.json`      | Agent-0 | ✅     |
| A3-2 | `gitintel hooks run claude-post-tool-use` handler reads stdin JSON → calls checkpoint     | Agent-0 | ✅     |
| A3-3 | Git diff semantic analysis — infer AI-written hunks when no checkpoint exists             | Agent-1 | 🔲     |
| A3-4 | VS Code extension — auto-checkpoint for GitHub Copilot                                    | Agent-0 | 🔲     |
| A3-5 | Cursor integration — parse `.cursor/` session data for automatic attribution              | Agent-1 | 🔲     |

## Phase 6: Enterprise

| ID   | Task                                              | Agent   | Status |
|------|---------------------------------------------------|---------|--------|
| E1-1 | SAML/OIDC SSO (Auth.js)                           | Agent-4 | ✅     |
| E1-2 | RBAC (admin/manager/developer roles)              | Agent-4 | ✅     |
| E1-3 | Self-hosted Docker Compose bundle                 | Agent-6 | ✅     |
| E1-4 | Helm chart (K8s deployment)                       | Agent-6 | ✅     |
| E1-5 | Audit log (all API mutations)                     | Agent-4 | ✅     |
| E1-6 | API key management (CI/CD integration)            | Agent-4 | ✅     |
| E1-7 | SCIM provisioning endpoint                        | Agent-4 | ✅     |

## Phase 7: PM Gap Fixes (Distribution + Auto Attribution)

> Gaps identified in docs/internal/PRODUCT_STRATEGY.md — Priority: P0/P1

| ID   | Task                                                          | Agent   | Status |
|------|---------------------------------------------------------------|---------|--------|
| G1-1 | Claude Code PostToolUse auto-checkpoint (init.rs)             | Agent-0 | ✅     |
| G1-2 | `gitintel update` self-update command                         | Agent-0 | ✅     |
| G1-3 | Windows PowerShell install script (install.ps1)               | Agent-0 | ✅     |
| G1-4 | Fix npm package name to `@gitintel/cli`                       | Agent-0 | ✅     |
| G1-5 | Homebrew tap setup (`gitintel-ai/homebrew-tap`)               | Agent-0 | 🔲     |
| G1-6 | `gitintel.ai` marketing landing page                          | Agent-0 | 🔲     |
| G1-7 | Git diff semantic analysis for auto-attribution (no checkpoint)| Agent-0 | 🔲     |
| G1-8 | Hosted SaaS `app.gitintel.ai` — cloud sync target             | Agent-0 | 🔲     |
