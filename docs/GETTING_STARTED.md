# Getting Started with GitIntel AI

GitIntel is a **git-native AI adoption tracker** for engineering teams. It runs entirely on your machine, requires no workflow changes, and answers three questions that no tool currently answers:

1. **How much of our codebase is AI-generated?** (line-level, per developer, per repo)
2. **What does AI coding actually cost us?** (dollars per commit, per feature, per sprint)
3. **Are we burning tokens on stale context?** (optimize CLAUDE.md, prune memory)

> GitIntel stores all data locally in SQLite. Cloud sync is opt-in and off by default.
> Prompts and transcripts **never leave your machine** unless you explicitly configure them to.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Build from Source](#build-from-source)
  - [Install the Binary](#install-the-binary)
- [Initializing a Repository](#initializing-a-repository)
- [The Core Workflow](#the-core-workflow)
  - [Step 1 — AI agent writes code](#step-1--ai-agent-writes-code)
  - [Step 2 — Record the checkpoint](#step-2--record-the-checkpoint)
  - [Step 3 — Commit normally](#step-3--commit-normally)
  - [Step 4 — Query the data](#step-4--query-the-data)
- [Agent Integrations](#agent-integrations)
  - [Claude Code](#claude-code)
  - [Cursor](#cursor)
  - [GitHub Copilot](#github-copilot)
  - [Manual / Any Agent](#manual--any-agent)
- [Commands Reference](#commands-reference)
  - [gitintel blame](#gitintel-blame)
  - [gitintel stats](#gitintel-stats)
  - [gitintel cost](#gitintel-cost)
  - [gitintel context](#gitintel-context)
  - [gitintel memory](#gitintel-memory)
- [Understanding Attribution Data](#understanding-attribution-data)
- [Team Setup](#team-setup)
  - [Sharing Attribution via Git Notes](#sharing-attribution-via-git-notes)
  - [Cloud Sync (Optional)](#cloud-sync-optional)
  - [Web Dashboard (Optional)](#web-dashboard-optional)
- [Cost Tracking with Claude Code OTel](#cost-tracking-with-claude-code-otel)
- [Context Optimization](#context-optimization)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## How It Works

```
┌────────────┐  checkpoint   ┌──────────────────────────────┐
│ Claude Code│ ────────────► │  gitintel CLI                │
│ Cursor     │               │  ┌─────────────────────────┐ │
│ Copilot    │               │  │ SQLite (local)           │ │
└────────────┘               │  │  checkpoints table       │ │
                             │  │  attributions table      │ │
┌────────────┐  git commit   │  │  cost_sessions table     │ │
│ Developer  │ ────────────► │  └─────────────────────────┘ │
└────────────┘               └──────────────┬───────────────┘
                                            │ post-commit hook
                                            │ writes git notes
                                            ▼
                             refs/ai/authorship/<commit-sha>
                             (YAML, travels with git push/fetch)
```

The key idea: **your AI agent calls `gitintel checkpoint` before writing each file**, recording which lines it wrote and which model/session produced them. When you run `git commit`, the post-commit hook automatically assembles these checkpoints into an Authorship Log and stores it in git notes — a standard git mechanism that travels with your repo.

No database servers. No accounts required. No changes to how you write or commit code.

---

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Git | 2.30+ | `git --version` |
| Rust + Cargo | 1.82+ | `rustc --version` |

Rust is only needed to build from source. Pre-built binaries (coming soon) will not require it.

---

## Installation

### Build from Source

```bash
# Clone the repository
git clone https://github.com/gitintel-ai/GitIntelAI.git
cd GitIntelAI

# Build the CLI (release mode — ~22 MB binary, <50ms startup)
cargo build --release --manifest-path packages/cli/Cargo.toml

# The binary is at:
# packages/cli/target/release/gitintel       (Linux/macOS)
# packages/cli/target/release/gitintel.exe   (Windows)
```

> **Windows note:** If the release build encounters file-lock errors (`os error 32`), run:
> `cargo build --jobs 1 --manifest-path packages/cli/Cargo.toml`

### Install the Binary

**Linux / macOS**

```bash
# Copy binary to a directory on your PATH
cp packages/cli/target/release/gitintel ~/.local/bin/

# Verify
gitintel --version
# gitintel 0.1.0
```

**macOS (Homebrew — coming soon)**

```bash
brew tap gitintel-ai/tap
brew install gitintel
```

**Windows**

```powershell
# Copy to a directory on your PATH, e.g.:
Copy-Item packages\cli\target\release\gitintel.exe "$env:USERPROFILE\.local\bin\"

# Or add the target directory directly to PATH in System Settings
```

---

## Initializing a Repository

Run this once per repository. It installs git hooks globally (via `core.hooksPath`) and creates a local `.gitintel/` config directory.

```bash
cd your-project
gitintel init
```

Expected output:

```
Initializing GitIntel...
  ✓ Created ~/.gitintel/
  ✓ Configuration saved
  ✓ Database initialized
  ✓ Installed pre-commit
  ✓ Installed post-commit
  ✓ Installed prepare-commit-msg
  ✓ Installed post-rewrite
  ✓ Installed post-merge
  ✓ Set global hooks path
  ✓ Git hooks installed
  ✓ Created .gitintel/ in repository
```

What `init` does:

| Action | Details |
|--------|---------|
| Creates `~/.gitintel/` | Global config and SQLite database |
| Installs hooks | `pre-commit`, `post-commit`, `prepare-commit-msg`, `post-rewrite`, `post-merge` |
| Sets `core.hooksPath` | Points git to `~/.gitintel/hooks/` globally |
| Creates `.gitintel/` | Per-repo config (commit to `.gitignore` if desired) |

The `.gitintel/` directory in your repo contains local config overrides. Add it to `.gitignore` if you don't want to share it, or commit it to share settings with your team.

---

## The Core Workflow

The full loop from AI-assisted coding to tracked commit takes four steps.

### Step 1 — AI agent writes code

Your AI coding agent (Claude Code, Cursor, etc.) is about to write or substantially modify a file. Nothing changes here — use your agent as you normally would.

### Step 2 — Record the checkpoint

Before or immediately after the agent writes the file, call `gitintel checkpoint`. This records which lines the agent wrote, which model produced them, and optional cost/token data.

```bash
gitintel checkpoint \
  --agent    "Claude Code" \
  --model    "claude-sonnet-4-6" \
  --session-id "sess_abc123" \
  --file     "src/auth/login.ts" \
  --lines    "12-45,78-103" \
  --tokens-in  1240 \
  --tokens-out  890 \
  --cost-usd  0.0234
```

| Flag | Required | Description |
|------|----------|-------------|
| `--agent` | Yes | Agent name: `"Claude Code"`, `"Cursor"`, `"Copilot"`, etc. |
| `--model` | Yes | Model identifier: `"claude-sonnet-4-6"`, `"gpt-4o"`, etc. |
| `--session-id` | Yes | Unique ID for this coding session (any string) |
| `--file` | Yes | File path (relative to repo root) |
| `--lines` | Yes | Line ranges the agent wrote, e.g. `"1-50"` or `"1-30,55-80"` |
| `--tokens-in` | No | Input tokens consumed (for cost tracking) |
| `--tokens-out` | No | Output tokens produced |
| `--cost-usd` | No | Cost in USD (overrides token-based calculation) |
| `--transcript-ref` | No | SHA or URL of the session transcript |

Checkpoints are stored in SQLite and are **not committed to git**. They are consumed and cleared by the post-commit hook.

> **Tip:** If you checkpoint multiple files in one session, use the same `--session-id` across all calls. This groups them into one attribution record per commit.

### Step 3 — Commit normally

```bash
git add src/auth/login.ts
git commit -m "feat: add OAuth2 login"
```

The post-commit hook fires automatically and:

1. Loads all pending checkpoints for this session
2. Verifies the line ranges are still valid in the committed diff
3. Builds an Authorship Log (YAML) with AI/Human line attribution
4. Writes it to `refs/ai/authorship/<commit-sha>` using git notes
5. Clears consumed checkpoints from SQLite
6. Prints a summary: `✓ Commit: 45% AI (Claude Code · claude-sonnet-4-6), 55% Human`

Any lines in the commit that were **not** covered by a checkpoint are attributed as Human.

### Step 4 — Query the data

```bash
# See AI% breakdown for the whole repo
gitintel stats

# See line-level AI/Human attribution for a specific file
gitintel blame src/auth/login.ts

# See cost breakdown for the last week
gitintel cost --since 7d
```

---

## Agent Integrations

### Claude Code

GitIntel integrates with Claude Code in two ways: **manual checkpoint calls** and **automatic OTel cost capture**.

**Option A: Hook-based (automatic)**

Add this to your project's `CLAUDE.md` (or global Claude config):

```markdown
## GitIntel Integration

After writing or significantly modifying any file, call:

```bash
gitintel checkpoint \
  --agent "Claude Code" \
  --model "$CLAUDE_MODEL" \
  --session-id "$CLAUDE_SESSION_ID" \
  --file "$FILE_PATH" \
  --lines "$LINE_RANGE"
```

Use the actual session ID from the Claude Code environment.
```

**Option B: OTel (cost tracking only)**

Claude Code exports native OpenTelemetry metrics. Point them at GitIntel's local collector to capture cost data without manual checkpoints:

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

This captures `claude_code.token.usage` and `claude_code.cost.usage` metrics automatically. GitIntel correlates them with your commits by timestamp.

**Option C: Both (recommended)**

Use OTel for automatic cost capture + manual checkpoints for line-level attribution. Together they give you the full picture.

---

### Cursor

Cursor does not yet have a native telemetry export. Use the checkpoint command from Cursor's terminal, or add a keyboard shortcut to your Cursor config that runs it after the AI edits a file.

A minimal integration:

```bash
# Run in Cursor's integrated terminal after an AI edit
gitintel checkpoint \
  --agent "Cursor" \
  --model "claude-3-5-sonnet" \
  --session-id "cursor-$(date +%s)" \
  --file "src/components/Button.tsx" \
  --lines "1-80"
```

For automated integration, add a post-edit script to Cursor's task runner or use the Cursor Extension API to call `gitintel checkpoint` programmatically.

---

### GitHub Copilot

Copilot operates inline and does not expose session IDs or line ranges natively. The best current approach is to checkpoint files at commit time rather than per-suggestion:

```bash
# After a Copilot-heavy session, before committing:
gitintel checkpoint \
  --agent "GitHub Copilot" \
  --model "copilot-gpt-4" \
  --session-id "copilot-$(git rev-parse --short HEAD)" \
  --file "src/utils/formatDate.ts" \
  --lines "1-45"
```

> **Coming soon:** A VS Code extension that calls `gitintel checkpoint` automatically on each Copilot suggestion accept.

---

### Manual / Any Agent

For any AI tool (ChatGPT, Gemini CLI, local models, etc.), the pattern is the same:

```bash
gitintel checkpoint \
  --agent    "Gemini CLI" \
  --model    "gemini-2.5-pro" \
  --session-id "my-session-$(date +%Y%m%d-%H%M%S)" \
  --file     "src/api/handler.go" \
  --lines    "25-100"
```

The checkpoint just needs to be called before `git commit`.

---

## Commands Reference

### gitintel blame

Extends `git blame` with AI/Human attribution per line.

```bash
# Full file attribution
gitintel blame src/auth/login.ts

# From a specific commit
gitintel blame src/auth/login.ts --commit abc1234

# Show only AI-generated lines
gitintel blame src/auth/login.ts --ai-only

# Show only human-written lines
gitintel blame src/auth/login.ts --human-only
```

Example output:

```
AI Blame: src/auth/login.ts (120 lines)
────────────────────────────────────────────────────────────────────────────────
   1 [HU] a3f8c21 Alice Chen   import { Request, Response } from 'express'
   2 [HU] a3f8c21 Alice Chen   import { db } from '../db'
  ...
  12 [AI] b7d1e94 Alice Chen   export async function login(req: Request, res: Response) {
  13 [AI] b7d1e94 Alice Chen     const { email, password } = req.body
  14 [AI] b7d1e94 Alice Chen     if (!email || !password) {
  15 [AI] b7d1e94 Alice Chen       return res.status(400).json({ error: 'Missing credentials' })
  ...
  46 [HU] c2a9b11 Alice Chen     // custom business logic added manually
  47 [HU] c2a9b11 Alice Chen     await auditLog.record('login_attempt', { email })
```

Legend: `[AI]` = AI-generated · `[HU]` = Human-written · `[MX]` = Mixed

---

### gitintel stats

Shows adoption statistics for the repository.

```bash
# Last 30 days (default)
gitintel stats

# Specific time period
gitintel stats --since 7d

# Per-developer breakdown
gitintel stats --developer alice@acme.com

# JSON output (for dashboards/scripts)
gitintel stats --format json

# CSV output (for spreadsheets)
gitintel stats --format csv
```

Example output:

```
GitIntel Stats — last 30 days
────────────────────────────────────────────
Commits:      47
Total Lines:  5,890
AI Lines:     2,341  (39.7%)
Human Lines:  3,549  (60.3%)

Top Agent:    Claude Code  (74% of AI lines)
Top Model:    claude-sonnet-4-6

Trend:        ↑ +8% AI adoption vs previous 30 days
────────────────────────────────────────────
```

---

### gitintel cost

Shows development cost broken down by commit, branch, developer, or time period.

```bash
# Weekly cost summary
gitintel cost --since 7d

# Cost for a specific commit
gitintel cost --commit abc1234def5678

# Cost for a feature branch (from branch point to HEAD)
gitintel cost --branch feature/oauth

# Cost for a specific developer
gitintel cost --developer alice@acme.com

# Cost for the last sprint (30 days) as JSON
gitintel cost --since 30d --format json
```

Example output:

```
Cost Summary — last 7 days
─────────────────────────────────────────────
Total Spend:     $12.45
├─ Claude Code:  $9.23   (74%)
├─ Copilot:      $2.10   (17%)
└─ Gemini CLI:   $1.12   (9%)

Commits:          47
Avg Cost/Commit:  $0.26
AI Lines Added:   2,341 / 5,890  (39.7%)
─────────────────────────────────────────────
```

---

### gitintel context

Generates and optimizes `CLAUDE.md` context files to reduce token burn.

```bash
# Generate a CLAUDE.md from repo analysis (auto-detects stack, conventions, structure)
gitintel context init

# Force overwrite existing CLAUDE.md
gitintel context init --force

# Preview what would be pruned (dry run)
gitintel context optimize

# Apply the optimizations
gitintel context optimize --apply

# Show token delta before/after optimization
gitintel context diff
```

`gitintel context init` scans your repo and produces a CLAUDE.md structured around what the AI actually needs: stack, file structure, key exports, conventions, and coding patterns. It skips boilerplate that wastes tokens.

`gitintel context optimize` analyzes which sections of your CLAUDE.md were actually referenced in recent sessions, scores them by reference frequency, and prunes zero-reference sections. Average token savings: 30–60%.

---

### gitintel memory

Manages a persistent key-value memory store for codebase facts. Useful for storing things that would otherwise be re-explained to the AI every session.

```bash
# Add a fact
gitintel memory add \
  --key    "auth-pattern" \
  --value  "All protected routes use requireAuth() middleware from src/middleware/auth.ts" \
  --category "architecture"

# Retrieve a fact
gitintel memory get auth-pattern

# List all facts
gitintel memory list

# Filter by category
gitintel memory list --category conventions

# Prune facts unused for 30+ days
gitintel memory prune --unused-days 30

# Prune unused facts (dry run first)
gitintel memory prune --unused-days 30 --dry-run

# Export memory as a CLAUDE.md section
gitintel memory export --format markdown
```

Memory facts are stored in SQLite, tracked by `use_count` and `last_used_at`. Facts that are never referenced expire automatically.

---

## Understanding Attribution Data

When you commit, GitIntel writes attribution data to git notes at `refs/ai/authorship`. You can read it directly at any time:

```bash
# Show attribution for the latest commit
git notes --ref=refs/ai/authorship show HEAD

# List all commits with attribution notes
git notes --ref=refs/ai/authorship list
```

The attribution YAML looks like this (schema `gitintel/1.0.0`):

```yaml
schema_version: gitintel/1.0.0
commit: b7d1e94f3a2c8e91d0f4b6a2c3e5d7f9b1a3c5e7
author_email: alice@acme.com
authored_at: 2026-03-03T14:30:00Z

agent_sessions:
  - session_id: sess_abc123
    agent: "Claude Code"
    model: "claude-sonnet-4-6"
    vendor: anthropic
    tokens:
      input: 1240
      output: 890
      cache_read: 340
      cache_write: 200
    cost:
      usd: 0.0234
      calculated_by: gitintel/1.0.0
    files:
      "src/auth/login.ts":
        total_lines: 120
        ai_ranges: [[12, 45], [78, 103]]
        human_ranges: [[1, 11], [46, 77], [104, 120]]

summary:
  total_files_changed: 1
  total_lines_added: 120
  ai_lines: 60
  human_lines: 60
  ai_pct: 50.0
  total_cost_usd: 0.0234
  primary_agent: "Claude Code"
  primary_model: "claude-sonnet-4-6"
```

This format is an open standard. Any tool can read it using plain `git notes` — no GitIntel installation required to consume the data.

---

## Team Setup

### Sharing Attribution via Git Notes

By default, git notes do not push/fetch automatically. Configure your remote to sync attribution notes alongside code:

```bash
# Configure fetch to pull attribution notes from origin
git config --add remote.origin.fetch '+refs/ai/authorship/*:refs/ai/authorship/*'

# Configure push to include attribution notes
git config --add remote.origin.push 'refs/ai/authorship/*'

# Push attribution for the current branch
git push origin refs/ai/authorship/*
```

Or add this to your `.git/config` (or `~/.gitconfig` for all repos):

```ini
[remote "origin"]
    fetch = +refs/ai/authorship/*:refs/ai/authorship/*
    push  = refs/ai/authorship/*
```

Once configured, `git push` and `git fetch` will automatically sync attribution data alongside your code. Team members running `gitintel stats` or `gitintel blame` will see attribution for all commits, not just their own.

### Cloud Sync (Optional)

GitIntel can sync attribution and cost data to a central API server for team dashboards. This is **off by default**.

```bash
# Enable cloud sync
gitintel config --set cloudSync.enabled=true
gitintel config --set cloudSync.endpoint=https://your-gitintel-server.example.com/api/v1
gitintel config --set cloudSync.apiKey=your-api-key

# Push all local data
gitintel sync

# Dry run to see what would be synced
gitintel sync --dry-run
```

To self-host the API server and dashboard, see the [Docker Compose setup in QUICKSTART.md](./QUICKSTART.md#option-a-docker-compose-recommended).

### Web Dashboard (Optional)

The dashboard provides team-level views: adoption heatmaps by developer and week, cost trend charts, PR cost annotations, and budget alerts.

```bash
# Start the full stack locally (requires Docker)
cd infra/docker
docker compose up -d

# Dashboard: http://localhost:3000
# API server: http://localhost:3001
```

For a production self-hosted deployment, see the [Helm chart in infra/k8s/](./infra/k8s/).

---

## Cost Tracking with Claude Code OTel

Claude Code exports native OpenTelemetry metrics. GitIntel runs a local OTel collector that captures them automatically. This works alongside (or instead of) manual `--cost-usd` flags in checkpoints.

**Setup:**

```bash
# 1. Add to your shell profile
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc

# 2. Source your profile (or open a new terminal)
source ~/.bashrc   # or ~/.zshrc

# 3. Verify Claude Code is sending metrics (after a session)
gitintel cost --since 1d
```

**Metrics captured automatically:**

| Metric | Description |
|--------|-------------|
| `claude_code.token.usage` | Input, output, and cache tokens per session |
| `claude_code.cost.usage` | USD cost per session |
| `claude_code.commit.count` | Number of commits in the session |
| `claude_code.code_edit_tool.decision` | Accept/reject counts for code edits |

GitIntel correlates OTel sessions to git commits by matching session timestamps with commit times. If you checkpoint with a `--session-id`, the correlation is exact.

---

## Context Optimization

One of GitIntel's most valuable features for heavy AI users is reducing the token cost of your context files.

**Generate an optimized CLAUDE.md for a new project:**

```bash
cd your-project
gitintel context init
```

GitIntel analyzes your repo structure, detects your stack (from `package.json`, `Cargo.toml`, `requirements.txt`, etc.), identifies conventions, and generates a CLAUDE.md with scored sections. Sections the AI is unlikely to need are excluded or summarized.

**Optimize an existing CLAUDE.md:**

```bash
# See what would be pruned (safe — no changes made)
gitintel context optimize

# Apply the optimizations
gitintel context optimize --apply

# Check the token savings
gitintel context diff
```

Example `context diff` output:

```
CLAUDE.md Context Diff
────────────────────────────────────────
Before:  4,230 tokens
After:   1,840 tokens
Saved:   2,390 tokens  (56.5%)

Pruned sections (0 references in last 30 sessions):
  - "Database Migration History" (340 tokens)
  - "Legacy API Endpoints" (280 tokens)
  - "Sprint Planning Notes" (190 tokens)

Compressed sections (< 3 references):
  - "CI/CD Pipeline Details" (520 → 85 tokens)
────────────────────────────────────────
```

**Per-directory context:**

For large monorepos, generate sub-CLAUDE.md files per package:

```bash
gitintel context init --output packages/api/CLAUDE.md
gitintel context init --output packages/dashboard/CLAUDE.md
```

Each file contains only the context relevant to that directory.

---

## Troubleshooting

### `gitintel hooks run` fails after install

This was a known bug fixed in the current build. The hook scripts call `gitintel hooks run post-commit`, which requires the `Run` subcommand. Verify you are on a build that includes this fix:

```bash
gitintel hooks run --help
# Should show: Run a specific hook (invoked internally by git hook scripts)
```

If not, rebuild from the latest source and reinstall:

```bash
cargo build --release --manifest-path packages/cli/Cargo.toml
cp packages/cli/target/release/gitintel ~/.local/bin/
```

### `gitintel blame` shows `[??]` for all lines

This was a known bug fixed in the current build. The YAML parser for git notes was a stub. Verify the fix is present:

```bash
# Read a commit's attribution note directly
git notes --ref=refs/ai/authorship show HEAD
# Should show valid YAML

# Then run blame — should show [AI] / [HU] not [??]
gitintel blame src/your-file.ts
```

If still showing `[??]`, it means the file path in the checkpoint did not match the path stored in git notes. Use the same relative path for both `--file` in the checkpoint and the argument to `gitintel blame`.

### Checkpoints exist but stats show 0% AI

The post-commit hook may not be executing. Check:

```bash
# Verify hooks are installed and pointing to the right path
gitintel hooks status

# Check git's configured hooks path
git config --global core.hooksPath
# Should return: /Users/yourname/.gitintel/hooks  (or Windows equivalent)

# Manually trigger the post-commit hook on the last commit
gitintel hooks run post-commit
```

### Stats show wrong developer

`gitintel stats --developer` matches by git author email. Make sure your `git config user.email` matches what you pass:

```bash
git config user.email
# e.g. alice@acme.com

gitintel stats --developer alice@acme.com
```

### OTel metrics not arriving

```bash
# Check that the env vars are set
echo $CLAUDE_CODE_ENABLE_TELEMETRY   # should be 1
echo $OTEL_EXPORTER_OTLP_ENDPOINT    # should be http://localhost:4317

# After a Claude Code session, check if cost data was captured
gitintel cost --since 1d
```

If the Docker-based OTel collector is running, check its logs:

```bash
docker compose logs otel-collector
```

### Windows: build fails with `os error 32` (file lock)

This is a Windows-specific concurrency issue during compilation. Force single-threaded build:

```bash
cargo build --jobs 1 --manifest-path packages/cli/Cargo.toml
```

---

## FAQ

**Does GitIntel change how I use git?**

No. You still run `git commit`, `git push`, etc. as normal. GitIntel hooks fire automatically in the background. The only new command in your workflow is `gitintel checkpoint`, which your AI agent can call on your behalf.

**What if I forget to checkpoint before committing?**

The commit still works. Lines not covered by a checkpoint are attributed as Human. You can retroactively add attribution using `gitintel checkpoint` and then amending the commit (though amending rewrites the SHA, so the old note will be orphaned — best to checkpoint before committing).

**Does GitIntel track my AI prompts or code content?**

No. GitIntel tracks line number ranges, token counts, and cost metadata only. Code content, prompts, and transcripts are never read or stored unless you explicitly pass `--transcript-ref` pointing to a file you control.

**Can I strip attribution notes before open-sourcing a repo?**

Yes:

```bash
# Remove all attribution notes from the repo
git notes --ref=refs/ai/authorship remove --ignore-missing $(git log --format="%H")

# Or use the GitIntel command (coming in a future release)
gitintel attribution strip --all
```

Git notes are stored separately from commit history — stripping them does not rewrite any commits.

**Does this work with GitHub / GitLab / Bitbucket?**

Yes. Git notes sync to any git remote. GitHub and GitLab both store and return notes on push/fetch when configured (see [Sharing Attribution via Git Notes](#sharing-attribution-via-git-notes)).

**Can I use GitIntel with multiple AI agents in the same repo?**

Yes. Each checkpoint carries its own `--agent` and `--model`. Attribution logs support multi-agent commits (e.g., Claude Code wrote lines 1–50 and Copilot wrote lines 55–80 in the same commit). `gitintel stats` breaks down adoption per agent.

**Is there a dashboard I can use without self-hosting?**

A hosted SaaS version is planned. In the meantime, self-host with Docker Compose (see [QUICKSTART.md](./QUICKSTART.md)). The free tier will support solo developers with unlimited repos.

**How do I contribute?**

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines. PRs welcome — open an issue first for anything beyond bug fixes.
