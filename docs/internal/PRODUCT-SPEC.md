# GitIntel AI — Product Specification

## Overview

**GitIntel AI** is a git-native platform for tracking AI adoption, development cost, and context optimization across engineering teams. It works transparently as a git proxy — developers keep using `git commit` as normal while GitIntel captures line-level AI/human attribution, token costs, and context health metrics.

**Binary:** `gitintel`
**License:** Open source
**Architecture:** Local-first monorepo with optional cloud sync

---

## Problem Statement

Engineering teams adopting AI coding assistants (Claude Code, Cursor, Copilot, Codex, Gemini) face three blind spots:

1. **No visibility into AI-generated code** — Who wrote what? How much of the codebase is AI-generated? Is AI output being reviewed?
2. **No cost tracking** — Token usage accumulates silently. Teams can't attribute spend to features, developers, or models.
3. **Context bloat** — CLAUDE.md files and memory stores grow unbounded, burning tokens on stale instructions.

GitIntel solves all three with zero workflow change.

---

## Core Principles

| Principle | What it means |
|---|---|
| **Local-first** | All tracking works 100% offline. Cloud sync is opt-in. |
| **Git-native** | Attribution stored in git notes at `refs/ai/authorship/{sha}`. No external database required for basic use. |
| **No workflow change** | Developers just `git commit`. GitIntel hooks handle the rest. |
| **Vendor-agnostic** | Works with Claude Code, Cursor, GitHub Copilot, Codex, and Gemini Code Assist. |
| **Privacy-first** | Prompts and transcripts never leave the machine unless explicitly configured. |
| **Zero-trust enterprise** | Self-hostable, air-gapped deployable, SCIM/SSO/RBAC ready. |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Developer Machine                 │
│                                                  │
│  AI Assistant ──► gitintel checkpoint            │
│       │                  │                       │
│       ▼                  ▼                       │
│  git commit ──► gitintel (git proxy)             │
│                      │                           │
│              ┌───────┴────────┐                  │
│              │  SQLite Store  │                   │
│              │  (checkpoints, │                   │
│              │   attributions,│                   │
│              │   cost, memory)│                   │
│              └───────┬────────┘                  │
│                      │                           │
│           git notes: refs/ai/authorship          │
└──────────────────────┼──────────────────────────┘
                       │ opt-in sync
                       ▼
┌──────────────────────────────────────────────────┐
│              Cloud / Self-Hosted                  │
│                                                   │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐ │
│  │ Hono API │  │ PostgreSQL │  │  ClickHouse  │ │
│  │ (Bun)    │──│            │  │  (telemetry) │ │
│  └─────┬────┘  └────────────┘  └──────────────┘ │
│        │                                          │
│  ┌─────┴──────────┐                              │
│  │ Next.js 14     │                               │
│  │ Dashboard      │                               │
│  │ (shadcn/ui)    │                               │
│  └────────────────┘                              │
└──────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| CLI | Rust | Binary size, speed, git-ai parity |
| API Server | Bun + Hono | Fast, TypeScript-native, edge-ready |
| Database (local) | SQLite | Zero-config, embedded |
| Database (cloud) | PostgreSQL | Enterprise scale, Drizzle ORM |
| Analytics | ClickHouse | High-cardinality time series at scale |
| Dashboard | Next.js 14 App Router + shadcn/ui | Fast iteration, SSR |
| Auth | Clerk (dev) / Auth.js (enterprise) | SSO/SAML/OIDC |
| Telemetry | OpenTelemetry → ClickHouse | Matches Claude Code native OTel export |
| Deployment | Docker → K8s (Helm) | Single-binary to enterprise |

---

## Monorepo Structure

```
gitintel/
├── packages/
│   ├── cli/          Rust binary (git proxy + attribution engine)
│   ├── core/         TypeScript shared lib (types, utils, constants)
│   ├── server/       Bun + Hono API server
│   ├── dashboard/    Next.js 14 web app
│   └── sdk/          Agent SDK (JS/Python)
├── infra/
│   └── docker/       Dockerfiles + docker-compose + OTel config
└── specs/            Detailed per-module specifications
```

---

## Feature Modules

### 1. AI Adoption Tracking

**Goal:** Know exactly which lines of code were written by AI vs humans, per developer, per commit, per sprint.

**How it works:**
1. AI assistants call `gitintel checkpoint` before each file write (captures pre-state)
2. On `git commit`, the post-commit hook diffs checkpoint vs committed state
3. Lines touched between checkpoint and commit are attributed to the agent
4. Attribution is stored as a YAML log in git notes at `refs/ai/authorship/{sha}`

**Attribution log format (v1.0):**
```yaml
schema_version: gitintel/1.0.0
commit: abc123...
author: alice@acme.com
timestamp: 2026-03-03T10:00:00Z
agent_sessions:
  - agent: "Claude Code"
    model: "claude-sonnet-4-5"
    tokens: { input: 1240, output: 890, cache_read: 340 }
    cost_usd: 0.0234
    files:
      src/auth/login.ts:
        ai_lines: [[12, 45], [78, 103]]
        human_lines: [[1, 11], [46, 77]]
summary:
  total_lines: 150
  ai_lines: 60
  human_lines: 90
  ai_pct: 40.0
  total_cost_usd: 0.0234
```

**CLI commands:**
- `gitintel blame <file>` — git blame annotated with AI/Human/Mixed per line
- `gitintel stats [--period 30d] [--developer alice@]` — aggregated adoption metrics
- `gitintel show <sha>` — view attribution for a specific commit

### 2. Cost Intelligence

**Goal:** Track every token and dollar spent on AI-assisted development, attributable to commits, features, developers, and teams.

**Data sources:**
- Claude Code native OTel metrics (`claude_code.token.usage`, `claude_code.cost.usage`)
- Checkpoint metadata (model, tokens in/out/cache per session)
- Model pricing table (7 models across Anthropic, OpenAI, Google)

**Supported models and pricing (per million tokens):**

| Model | Input | Output | Cache Write | Cache Read |
|---|---|---|---|---|
| claude-opus-4-5 | $15.00 | $75.00 | $18.75 | $1.50 |
| claude-sonnet-4-5 | $3.00 | $15.00 | $3.75 | $0.30 |
| claude-haiku-3-5 | $0.80 | $4.00 | $1.00 | $0.08 |
| gpt-4o | $2.50 | $10.00 | — | $1.25 |
| o3 | $10.00 | $40.00 | — | $2.50 |
| gemini-2.0-flash | $0.075 | $0.30 | — | — |
| gemini-2.5-pro | $1.25 | $10.00 | — | $0.31 |

**CLI commands:**
- `gitintel cost [--period 7d] [--model claude-sonnet-4-5]` — cost breakdown
- `gitintel cost --commit abc123` — cost for a specific commit
- `gitintel cost --branch feature/auth` — cost for a feature branch

**Budget alerts:**
- Daily, weekly, monthly thresholds
- Slack and email notification channels
- Configurable via dashboard or CLI

### 3. Context & Memory Manager

**Goal:** Reduce token burn by keeping CLAUDE.md files lean and memory stores pruned.

**How it works:**
- `gitintel context init` — scans repo structure and generates an optimized CLAUDE.md
- `gitintel context optimize` — scores each section by relevance and usage frequency, prunes sections scoring below 0.05
- `gitintel context diff` — shows token delta before/after optimization
- Memory store: key-value pairs with category, token count, use count, and expiration

**CLI commands:**
- `gitintel memory list` — show stored context entries
- `gitintel memory prune [--max-tokens 50000]` — remove stale entries
- `gitintel context stats` — token counts and optimization suggestions

### 4. Web Dashboard

**Route structure:**

| Route | Purpose |
|---|---|
| `/team` | AI adoption heatmap (Developer x Week x AI%), KPI cards |
| `/cost` | Stacked bar chart (daily spend by model), trend lines |
| `/developers` | Per-developer stats table with AI%, cost, commits |
| `/developers/[id]` | Individual profile with commit history |
| `/repos` | Repository list with search, AI% and cost per repo |
| `/pulls` | Pull request list with cost badges and state badges |
| `/context` | Token stats, optimization suggestions, memory management |
| `/settings/alerts` | Budget alert configuration |

**Performance targets:** LCP < 1.5s, API response < 200ms

### 5. Enterprise Features

- **SSO:** SAML, OIDC, Entra ID, Google Workspace via Auth.js v5
- **RBAC:** Owner, Admin, Manager, Developer, Viewer roles
- **SCIM 2.0:** Automatic user provisioning and deprovisioning
- **Audit logging:** All mutations logged with actor, action, resource, IP, user agent
- **API keys:** Scoped keys (`gitintel_live_*`, `gitintel_test_*`) with expiration
- **Self-hosted:** Docker Compose or Helm chart for Kubernetes
- **Air-gapped:** Works without internet. All data stays in customer infrastructure.
- **Privacy controls:** Developers can't see peer costs; managers see team aggregates

---

## API Endpoints

All protected routes require authentication (Clerk JWT, API key, or mock JWT in test mode).

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check (public) |
| POST | `/api/v1/sync/attribution` | CLI pushes attribution log |
| POST | `/api/v1/sync/cost` | CLI pushes cost session |
| GET | `/api/v1/stats/team` | Team-level adoption stats |
| GET | `/api/v1/stats/developer/:id` | Individual developer stats |
| GET | `/api/v1/cost/summary` | Cost aggregation by model/agent |
| GET | `/api/v1/cost/sessions` | Cost session list |
| GET | `/api/v1/cost/daily` | Daily cost breakdown |
| GET | `/api/v1/cost/pr/:id` | Cost per pull request |
| GET | `/api/v1/attribution` | Attribution list |
| GET/POST | `/api/v1/alerts` | Budget alert CRUD |
| GET/POST | `/api/v1/api-keys` | API key management |
| GET | `/api/v1/audit` | Audit log query |
| POST | `/api/v1/webhooks/github` | GitHub webhook receiver |
| * | `/scim/v2/*` | SCIM 2.0 provisioning |

---

## Database Schema

**PostgreSQL tables (cloud):**

| Table | Purpose | Key columns |
|---|---|---|
| `organizations` | Tenant accounts | id, name, settings_json |
| `users` | Team members | email, clerk_id, org_id, role, status |
| `repositories` | Git repositories | org_id, name, remote_url, default_branch |
| `attributions` | Per-commit AI attribution | repo_id, commit_sha, author_email, ai_lines, human_lines, ai_pct, total_cost_usd, log_json |
| `cost_sessions` | Token usage sessions | session_id, repo_id, agent, model, tokens_in/out/cache, cost_usd |
| `budget_alerts` | Cost alert rules | org_id, type (daily/weekly/monthly), threshold_usd, channels_json |
| `audit_logs` | Mutation audit trail | user_id, action, resource_type, details, ip_address |
| `api_keys` | Scoped API keys | key_hash, scopes, expires_at, last_used_at |

**SQLite tables (local):** checkpoints, attributions, cost_sessions, memory

---

## OTel Integration

GitIntel captures Claude Code's native OpenTelemetry metrics:

```bash
CLAUDE_CODE_ENABLE_TELEMETRY=1
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317  # gitintel collector
```

Metrics captured:
- `claude_code.token.usage` — input, output, cache tokens per session
- `claude_code.cost.usage` — USD cost per session
- `claude_code.commit.count` — commits per session
- `claude_code.code_edit_tool.decision` — edit accept/reject signals

The OTel Collector routes metrics to ClickHouse with 90-day TTL.

---

## CI/CD Pipeline

```
                    ┌──────────┐
                    │  CI Jobs  │
                    └─────┬────┘
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     ┌─────────┐   ┌──────────┐   ┌──────────┐
     │  cli    │   │  server  │   │ dashboard │
     │ (Rust)  │   │  (Bun)   │   │ (Next.js) │
     └────┬────┘   └─────┬────┘   └─────┬────┘
          │               │              │
          ▼               ▼              ▼
     ┌─────────┐   ┌──────────┐   ┌──────────┐
     │  core   │   │   e2e    │   │  e2e-    │
     │ (tests) │   │(Chromium │   │integration│
     │         │   │+Firefox) │   │(full stack)│
     └────┬────┘   └─────┬────┘   └─────┬────┘
          │               │              │
          └───────────────┼──────────────┘
                          ▼
              ┌───────────────────────┐
              │    preview-deploy     │
              │  (PRs only, gated)    │
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │      docker build     │
              │  (all jobs must pass) │
              └───────────────────────┘
```

**Release pipeline:** Multi-platform binaries (Linux x86/ARM, macOS Intel/ARM, Windows), Docker images pushed to GHCR, npm SDK publish, changelog via git-cliff.

---

## Pricing

| Tier | Price | Features |
|---|---|---|
| **Solo** | Free | CLI + local SQLite, attribution + cost tracking, unlimited repos |
| **Team** | $29/dev/month | Cloud dashboard, team analytics, budget alerts, GitHub integration |
| **Enterprise** | Custom | SSO/SCIM, RBAC, audit logs, self-hosted, air-gapped, SLA |

---

## Supported Agents

- Claude Code (Anthropic)
- Cursor (Anysphere)
- GitHub Copilot (Microsoft)
- Codex (OpenAI)
- Gemini Code Assist (Google)
