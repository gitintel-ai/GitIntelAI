# Architecture: GitIntel AI

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer Machine                                               │
│                                                                  │
│  ┌──────────────┐   checkpoint   ┌─────────────────────────┐   │
│  │  Claude Code │ ─────────────► │  gitintel CLI (Rust)    │   │
│  │  Cursor      │                │  - git proxy             │   │
│  │  Copilot     │                │  - hook manager          │   │
│  └──────────────┘                │  - checkpoint store      │   │
│                                  │  - OTel collector        │   │
│  ┌──────────────┐   git commit   │  - SQLite DB             │   │
│  │  Developer   │ ─────────────► │                          │   │
│  └──────────────┘                └────────────┬────────────┘   │
│                                               │                  │
│                                    git notes  │  (refs/ai/auth) │
│                                               ▼                  │
│                                  ┌────────────────────┐         │
│                                  │  Local Git Repo    │         │
│                                  └────────────────────┘         │
└───────────────────────────────────────┬────────────────────────┘
                                        │ optional sync (push)
                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  GitIntel Cloud / Self-Hosted Server                             │
│                                                                  │
│  ┌──────────────────┐   ┌──────────────────┐                   │
│  │  API Server      │   │  OTel Collector  │                   │
│  │  (Bun + Hono)    │   │  (OpenTelemetry) │                   │
│  └────────┬─────────┘   └────────┬─────────┘                   │
│           │                      │                               │
│           ▼                      ▼                               │
│  ┌──────────────────────────────────────────┐                   │
│  │  PostgreSQL + ClickHouse (analytics)     │                   │
│  └──────────────────────────────────────────┘                   │
│           │                                                       │
│           ▼                                                       │
│  ┌──────────────────┐                                            │
│  │  Next.js 14      │  (Team Dashboard)                         │
│  │  Dashboard       │                                            │
│  └──────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

## CLI Architecture (Rust)

### Git Proxy Pattern
```
gitintel (symlinked to git) → intercepts git commands
  ├── git commit → run pre-commit → run git → run post-commit (write git notes)
  ├── git push  → sync refs/ai/authorship/* to remote
  ├── git fetch → fetch refs/ai/authorship/* from remote
  └── git * → pass through to real git binary
```

### Key Modules
```
packages/cli/src/
├── main.rs              ← entry point, routes subcommands
├── proxy.rs             ← git proxy logic
├── hooks/
│   ├── post_commit.rs   ← writes authorship log to git notes
│   ├── pre_commit.rs    ← validates checkpoints
│   └── prepare_msg.rs   ← adds cost summary to commit message
├── checkpoint.rs        ← receives agent checkpoint calls
├── blame.rs             ← git blame extension
├── stats.rs             ← adoption statistics
├── cost.rs              ← cost calculation engine
├── context/
│   ├── init.rs          ← CLAUDE.md generator
│   ├── optimize.rs      ← context optimizer
│   └── memory.rs        ← memory store
├── store/
│   ├── sqlite.rs        ← local SQLite operations
│   └── sync.rs          ← cloud sync
└── otel.rs              ← OTel metrics collector
```

### SQLite Schema (Local)
```sql
-- Checkpoint buffer (pre-commit)
CREATE TABLE checkpoints (
  id          TEXT PRIMARY KEY,
  session_id  TEXT,
  agent       TEXT,  -- "Claude Code", "Cursor", etc.
  model       TEXT,  -- "claude-opus-4-5"
  file_path   TEXT,
  line_start  INT,
  line_end    INT,
  timestamp   TEXT,
  tokens_in   INT,
  tokens_out  INT,
  tokens_cache_read INT,
  tokens_cache_write INT,
  cost_usd    REAL,
  transcript_ref TEXT
);

-- Committed attribution logs
CREATE TABLE attributions (
  commit_sha    TEXT PRIMARY KEY,
  repo_path     TEXT,
  author_email  TEXT,
  authored_at   TEXT,
  ai_lines      INT,
  human_lines   INT,
  total_lines   INT,
  ai_pct        REAL,
  total_cost_usd REAL,
  log_json      TEXT   -- full authorship log JSON
);

-- Cost sessions
CREATE TABLE cost_sessions (
  session_id    TEXT PRIMARY KEY,
  commit_sha    TEXT,
  agent         TEXT,
  model         TEXT,
  project_path  TEXT,
  started_at    TEXT,
  ended_at      TEXT,
  tokens_in     INT,
  tokens_out    INT,
  tokens_cache  INT,
  cost_usd      REAL
);

-- Memory store
CREATE TABLE memory (
  key           TEXT PRIMARY KEY,
  value         TEXT,
  category      TEXT,  -- "architecture", "conventions", "dependencies"
  token_count   INT,
  last_used_at  TEXT,
  use_count     INT,
  created_at    TEXT
);
```

## API Server Architecture (Bun + Hono)

### Endpoints
```
POST /api/v1/sync/attribution     ← push attribution logs from CLI
POST /api/v1/sync/cost            ← push cost sessions from CLI
GET  /api/v1/stats/team           ← team adoption summary
GET  /api/v1/stats/developer/:id  ← per-developer stats
GET  /api/v1/cost/summary         ← org cost summary
GET  /api/v1/cost/pr/:id          ← cost per PR
POST /api/v1/webhooks/github      ← GitHub PR webhook
POST /api/v1/alerts/budget        ← budget alert configuration
GET  /api/v1/context/suggestions  ← context optimization suggestions
```

## OTel Integration
Claude Code's native OTel exporter sends:
- `claude_code.token.usage{model, developer}` counter
- `claude_code.cost.usage{model, developer}` counter
- `claude_code.commit.count` counter

gitintel runs a local OTel collector on port 4317 that:
1. Receives metrics from Claude Code
2. Correlates with pending checkpoints by session_id + timestamp
3. Writes to SQLite cost_sessions table
4. Optionally forwards to cloud ClickHouse

## Context Manager Architecture
```
gitintel context init:
  1. Scan repo structure (find src, packages, key files)
  2. Detect stack (package.json, Cargo.toml, requirements.txt, etc.)
  3. Detect conventions (linting, testing, commit format)
  4. Extract key exports/interfaces from entry points
  5. Generate CLAUDE.md with scored sections

gitintel context optimize:
  1. Load current CLAUDE.md → tokenize → count tokens
  2. Load recent session transcripts → extract referenced sections
  3. Score each CLAUDE.md section by reference frequency
  4. Prune zero-reference sections
  5. Compress low-reference sections to summaries
  6. Output new CLAUDE.md with delta report

Memory Store (MCP-compatible):
  - Key-value store of codebase facts
  - Each fact has: key, value, category, token_count, use_count
  - Facts auto-expire when use_count = 0 for 30 days
  - Exportable as CLAUDE.md section or MCP memory tool
```
