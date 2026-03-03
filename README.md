# GitIntel AI

> **Git-native AI adoption tracking, cost intelligence & context optimization for dev teams**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/built%20with-Rust-orange)](https://www.rust-lang.org)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](packages/cli/Cargo.toml)
[![Local-first](https://img.shields.io/badge/local--first-SQLite-green)](#architecture)
[![Vendor-agnostic](https://img.shields.io/badge/works%20with-Claude%20%7C%20Cursor%20%7C%20Copilot%20%7C%20Codex%20%7C%20Gemini-blueviolet)](#supported-agents)

GitIntel is a transparent `git` proxy that answers three questions engineering leaders cannot answer today:

1. **How much of our codebase is AI-generated?** — line-level attribution per developer, repo, and sprint
2. **What does AI coding actually cost us?** — token usage mapped to USD per commit, branch, and team
3. **Are we burning tokens on stale context?** — auto-optimize `CLAUDE.md`, prune memory, lower token burn

All tracking runs **entirely on your machine**. No workflow changes. No new tools to learn. Just `git commit` as normal.

---

## How It Works

```
┌─────────────┐  gitintel checkpoint   ┌───────────────────────────────┐
│ Claude Code │ ───────────────────── ►│  gitintel CLI                 │
│ Cursor      │                        │  ┌────────────────────────┐   │
│ Copilot     │                        │  │ SQLite  (~/.gitintel/)  │   │
└─────────────┘                        │  │  checkpoints           │   │
                                       │  │  attributions          │   │
┌─────────────┐  git commit            │  │  cost_sessions         │   │
│  Developer  │ ───────────────────── ►│  │  memory                │   │
└─────────────┘   (hooks fire)         │  └────────────────────────┘   │
                                       └───────────────────────────────┘
                                                      │
                                          post-commit hook writes
                                          refs/ai/authorship/<sha>
                                          (open attribution standard)
```

When you `git commit`, gitintel's post-commit hook reads pending checkpoints from SQLite, computes AI/human line attribution, and stores a YAML attribution log in `refs/ai/authorship/<commit-sha>` — a standard git ref that travels with your repo.

---

## Quick Start

### Prerequisites

- Git 2.30+
- Rust + Cargo 1.82+ — install via [rustup.rs](https://rustup.rs)

### Build & Install

```bash
# Clone
git clone https://github.com/gitintel-ai/gitintel.git
cd gitintel

# Build (Linux/macOS)
cargo build --release --manifest-path packages/cli/Cargo.toml
cp packages/cli/target/release/gitintel ~/.local/bin/

# Build (Windows — use --jobs 1 if os error 32)
cargo build --release --manifest-path packages/cli/Cargo.toml
copy packages\cli\target\release\gitintel.exe C:\tools\

# Verify
gitintel --version
# gitintel 0.1.0
```

### Initialize in your repo

```bash
cd /path/to/your-project
gitintel init
```

```
Initializing GitIntel...
  ✓ Created ~/.gitintel/
  ✓ Configuration saved
  ✓ Database initialized
  ✓ Git hooks installed
  ✓ Created .gitintel/ in repository

GitIntel initialized successfully!
```

That's it. From now on, every `git commit` automatically triggers attribution tracking.

---

## Core Workflow

### 1 — AI agent writes code

Use Claude Code, Cursor, Copilot, or any AI assistant as you normally would.

### 2 — Record the AI session

```bash
gitintel checkpoint \
  --agent "Claude Code" \
  --model "claude-sonnet-4-6" \
  --session-id "sess_abc123" \
  --file "src/auth/login.ts" \
  --lines "12-45,78-103" \
  --tokens-in 1240 \
  --tokens-out 890 \
  --cost-usd 0.0234
```

```
✓ Checkpoint recorded: 55 lines in src/auth/login.ts (Claude Code / claude-sonnet-4-6)
  Cost: $0.0234
```

### 3 — Commit normally

```bash
git commit -m "Add login flow"
# gitintel post-commit hook fires automatically:
# ✓ Commit: 43.2% AI (Claude Code) | 56.8% Human | Cost: $0.0234
```

Attribution is stored in `refs/ai/authorship/<sha>` alongside your commit. It travels with `git push` and `git fetch`.

### 4 — Query the data

```bash
gitintel stats --since 30d
```

```
AI Adoption Stats: Repository
Period: last 30d
────────────────────────────────────────────────────────────
Total Commits:  142    Total Lines: 18,340

AI-Generated:   [████████████████████] 43.2%   (7,923 lines)
Human-Written:  [██████████████████████████] 56.8%  (10,417 lines)

Total Cost:     $47.23

By Developer:
────────────────────────────────────────────────────────────
alice@acme.com     [████████████████████████] 61.0% (38 commits, $18.40)
bob@acme.com       [█████████████] 34.5% (52 commits, $14.72)
carol@acme.com     [████████████████] 40.1% (52 commits, $14.11)
```

---

## Commands

| Command | Description |
|---------|-------------|
| `gitintel init` | Initialize gitintel in the current repo, install git hooks |
| `gitintel checkpoint` | Record an AI coding session (file, line ranges, tokens, cost) |
| `gitintel blame <file>` | Show per-line AI/Human/Mixed attribution (extends `git blame`) |
| `gitintel stats` | AI adoption statistics — total, by developer, by period |
| `gitintel cost` | Development cost summary — by commit, branch, developer, period |
| `gitintel context init` | Generate `CLAUDE.md` from repo analysis |
| `gitintel context optimize` | Prune and compress `CLAUDE.md` to reduce token burn |
| `gitintel context diff` | Show token delta before/after optimization |
| `gitintel memory add/get/list/prune/export` | Manage persistent AI memory facts |
| `gitintel sync` | Sync local data to cloud dashboard (opt-in) |
| `gitintel hooks install/uninstall/status` | Manage git hook integration |
| `gitintel config [--set key=value]` | View and edit configuration |

### `gitintel blame`

```bash
gitintel blame src/api.ts
```

```
AI Blame: src/api.ts (...)
   1 [AI] dc69ba8d Alice Chen  export async function createUser(
   2 [AI] dc69ba8d Alice Chen    data: CreateUserInput,
  ...
  55 [AI] dc69ba8d Alice Chen  }
  56 [HU] dc69ba8d Alice Chen  // Hand-written validation below
  57 [HU] dc69ba8d Alice Chen  function validateEmail(email: string) {
```

Attribution values: `[AI]` AI-generated · `[HU]` Human-written · `[MX]` Mixed · `[??]` Unknown

### `gitintel cost`

```bash
gitintel cost --since 7d
```

```
Cost Summary: last 7d
──────────────────────────────────────────────────
Total Spend:     $47.23

Commits:         142
Avg Cost/Commit: $0.33
AI Code Lines:   7,923 / 18,340 (43.2%)
──────────────────────────────────────────────────
```

```bash
gitintel cost --commit abc1234    # cost for a single commit
gitintel cost --branch feature/x  # cost for a feature branch
gitintel cost --developer alice@acme.com --since 30d
```

### `gitintel context`

```bash
# Generate CLAUDE.md from repo scan (detects stack, structure, patterns)
gitintel context init

# See how many tokens you'd save by optimizing
gitintel context diff

# Apply optimizations (prune unused sections, compress stale content)
gitintel context optimize --apply
```

---

## Supported Agents

All agents use the same universal `gitintel checkpoint` mechanism. No agent-specific plugins required.

| Agent | Integration | Notes |
|-------|-------------|-------|
| **Claude Code** | Manual checkpoint + OTel cost tracking | See [OTel Setup](#otel-setup-claude-code) |
| **Cursor** | Manual checkpoint | Record after each Cursor session |
| **GitHub Copilot** | Manual checkpoint | File-level attribution at commit time |
| **Codex** | Manual checkpoint | Any OpenAI model |
| **Gemini Code Assist** | Manual checkpoint | Any Gemini model |

Any agent name is accepted — `--agent` is a free-form string.

---

## OTel Setup (Claude Code)

Capture Claude Code token costs automatically via OpenTelemetry:

```bash
# Add to ~/.bashrc or ~/.zshrc
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

GitIntel runs a local OTel collector on port 4317. It ingests these Claude Code metrics:

| Metric | Description |
|--------|-------------|
| `claude_code.token.usage` | Input, output, and cache tokens per session |
| `claude_code.cost.usage` | USD cost per session |
| `claude_code.commit.count` | Commits in the session |
| `claude_code.code_edit_tool.decision` | Accept/reject counts |

For full team cost tracking, use the Docker OTel stack (see [Self-Hosting](#self-hosting)).

---

## Attribution Standard

GitIntel stores attribution in a **vendor-neutral open standard** at `refs/ai/authorship/<full-commit-sha>`:

```yaml
schema_version: gitintel/1.0.0
commit: dc69ba8dd77e12e9ba306be56de72d074937bf16
author: alice@acme.com
timestamp: 2026-03-03T09:29:33.399118500+00:00
agent_sessions:
  - agent: Claude Code
    model: claude-sonnet-4-6
    tokens:
      input: 1240
      output: 890
      cache_read: 340
      cache_write: 0
    cost_usd: 0.0234
    transcript_ref: null
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

Read attribution without gitintel installed:

```bash
git notes --ref=refs/ai/authorship show HEAD
git notes --ref=refs/ai/authorship list
```

Share attribution with your team:

```bash
git config --add remote.origin.fetch '+refs/ai/authorship/*:refs/ai/authorship/*'
git config --add remote.origin.push 'refs/ai/authorship/*'
```

The format is an open standard — any tool can consume it using plain `git notes`.

---

## Configuration

Config file: `~/.gitintel/config.json`

| Key | Default | Description |
|-----|---------|-------------|
| `cloud_sync.enabled` | `false` | Enable cloud sync (opt-in) |
| `cloud_sync.endpoint` | `https://app.gitintel.ai/api/v1` | Cloud API endpoint |
| `cloud_sync.api_key` | `""` | API key for cloud sync |
| `otel.enabled` | `true` | Enable local OTel collector |
| `otel.port` | `4317` | OTel gRPC port |
| `cost.currency` | `"USD"` | Cost display currency |
| `cost.alert_threshold_daily` | `10.0` | Daily cost alert threshold ($) |
| `prompt_storage` | `"local"` | Prompt storage: "local", "cloud", "none" |

```bash
gitintel config                              # show current config
gitintel config --json                       # as JSON
gitintel config --set cloud_sync.enabled=true
gitintel config --set cost.alert_threshold_daily=25.0
```

---

## Self-Hosting

Run the full GitIntel stack (API server + dashboard + PostgreSQL + OTel collector) with Docker Compose:

```bash
cd infra/docker
docker compose up -d
```

| Service | Port | Purpose |
|---------|------|---------|
| Dashboard (Next.js) | 3000 | Web analytics UI |
| API Server (Bun + Hono) | 3001 | REST API |
| PostgreSQL | 5432 | Team data |
| OTel Collector | 4317 (gRPC), 4318 (HTTP) | Metrics ingestion |
| ClickHouse | 8123 | Time-series analytics |
| Redis | 6379 | Caching |

Enterprise features: SSO (SAML/OIDC), RBAC (5 roles), SCIM 2.0 provisioning, audit logging, air-gapped deployment.

---

## Architecture

```
gitintel/
├── packages/
│   ├── cli/          Rust — git proxy binary, SQLite, git hooks, OTel collector
│   ├── core/         TypeScript — shared types, constants, cost calculator
│   ├── server/       Bun + Hono — REST API, PostgreSQL, auth, SCIM
│   └── dashboard/    Next.js 14 — team analytics web app (shadcn/ui)
└── infra/
    └── docker/       Docker Compose stack for self-hosting
```

**Core invariants:**

- **Local-first** — all tracking works 100% offline; cloud sync is opt-in
- **Git-native** — attribution in `refs/ai/authorship/{sha}` (open standard)
- **No workflow change** — developers just `git commit` as normal
- **Vendor-agnostic** — works with any AI coding tool
- **Privacy-first** — code and prompts never leave your machine unless configured
- **Zero-trust enterprise** — self-hostable, air-gapped deployable

**Tech stack:**

| Layer | Technology |
|-------|-----------|
| CLI Binary | Rust (Tokio, git2, rusqlite, clap) |
| API Server | Bun + Hono + Drizzle ORM |
| Database | SQLite (local) + PostgreSQL (cloud) |
| Dashboard | Next.js 14 App Router + shadcn/ui |
| Auth | Clerk (dev) → Auth.js (enterprise SSO) |
| Telemetry | OpenTelemetry → ClickHouse |
| Deployment | Docker Compose → Kubernetes (Helm, planned) |

---

## Model Pricing

Cost calculation uses these rates ($/MTok):

| Model | Input | Output | Cache Write | Cache Read |
|-------|-------|--------|-------------|------------|
| claude-opus-4-5 | $15.00 | $75.00 | $18.75 | $1.50 |
| claude-sonnet-4-5 | $3.00 | $15.00 | $3.75 | $0.30 |
| claude-haiku-3-5 | $0.80 | $4.00 | $1.00 | $0.08 |
| gpt-4o | $2.50 | $10.00 | — | $1.25 |
| o3 | $10.00 | $40.00 | — | $2.50 |
| gemini-2.0-flash | $0.075 | $0.30 | — | — |
| gemini-2.5-pro | $1.25 | $10.00 | — | $0.31 |

---

## Documentation

| Document | Contents |
|----------|----------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Full user guide — 868 lines, every feature with examples |
| [QUICKSTART.md](QUICKSTART.md) | 5-minute quick start |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design decisions |
| [specs/](specs/) | Detailed specs for each subsystem |
| [REPO_CONTEXT.md](REPO_CONTEXT.md) | Code-verified ground truth for all commands and output |

---

## Roadmap

- [ ] One-liner install script (`curl -fsSL https://gitintel.ai/install | sh`)
- [ ] Homebrew tap (`brew install gitintel-ai/tap/gitintel`)
- [ ] Pre-built binaries (Linux AMD64/ARM64, macOS AMD64/ARM64, Windows)
- [ ] Full OTLP/gRPC parsing in CLI binary (currently uses Docker OTel collector)
- [ ] Automatic per-line attribution without manual `gitintel checkpoint`
- [ ] VS Code extension for Copilot auto-checkpoint
- [ ] Kubernetes Helm chart
- [ ] Hosted SaaS at app.gitintel.ai
- [ ] `gitintel attribution strip` command
- [ ] `by_model` and `by_agent` breakdown in `gitintel cost --format json`

---

## Contributing

1. Fork the repo and create a feature branch
2. For CLI changes: edit `packages/cli/src/`, run `cargo test`
3. For server changes: edit `packages/server/src/`, run `bun test`
4. For dashboard changes: edit `packages/dashboard/`, run `bun run test:e2e`
5. Read [CLAUDE.md](CLAUDE.md) for architecture rules and invariants
6. Update [TASKS.md](TASKS.md) status when completing tracked items
7. Open a pull request

---

## License

MIT — see [LICENSE](LICENSE).

GitIntel AI is open source and free to use. The attribution standard (`gitintel/1.0.0`) is designed to be vendor-neutral and adopted by the community.

---

<p align="center">
  <a href="https://gitintel.ai">gitintel.ai</a> ·
  <a href="GETTING_STARTED.md">Documentation</a> ·
  <a href="https://github.com/gitintel-ai/gitintel/issues">Issues</a>
</p>
