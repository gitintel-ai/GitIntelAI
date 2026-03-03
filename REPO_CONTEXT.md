# REPO_CONTEXT.md — GitIntel AI Ground Truth

**Generated**: 2026-03-03
**Purpose**: Accurate, code-verified context for website copywriting agents
**Source**: All files read directly from source; no inference or assumption
**⚠️ CRITICAL**: TASKS.md marks all tasks `✅ Done` but the actual demo validation report (demo/artifacts/report.md) shows partial implementations. The validation findings are authoritative over TASKS.md for feature status.

---

## SECTION 1: CLI Commands (ground truth from source)

Source files: `packages/cli/src/main.rs`, individual command modules.

---

### Command: `gitintel init`

```
Usage: gitintel init [--force]
```

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--force`, `-f` | bool | No | false | Force re-initialization |

**Help text** (from source): "Initialize gitintel in the current repository"

**Actual output** (verified running against demo project):
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

GitIntel initialized successfully!

To enable Claude Code telemetry, add to your shell profile:

  export CLAUDE_CODE_ENABLE_TELEMETRY=1
  export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

**What it does** (from `init.rs`):
1. Checks current directory is a git repo
2. Creates `~/.gitintel/` directory
3. Saves default config to `~/.gitintel/config.json`
4. Initializes SQLite database at `~/.gitintel/gitintel.db`
5. Installs git hooks (pre-commit, post-commit, prepare-commit-msg, post-rewrite, post-merge) to `~/.gitintel/hooks/`
6. Sets `git config --global core.hooksPath ~/.gitintel/hooks/`
7. Creates `.gitintel/` directory in repo with `.gitignore` for `*.db` and `config.local.json`

---

### Command: `gitintel checkpoint`

```
Usage: gitintel checkpoint --agent <AGENT> --model <MODEL> --session-id <SESSION_ID> --file <FILE> --lines <LINES> [--tokens-in <N>] [--tokens-out <N>] [--cost-usd <N>] [--transcript-ref <REF>]
```

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--agent` | string | Yes | — | Agent name (e.g., "Claude Code", "Cursor", "Copilot") |
| `--model` | string | Yes | — | Model name (e.g., "claude-opus-4-5") |
| `--session-id` | string | Yes | — | Session ID for correlation |
| `--file` | string | Yes | — | File path being edited |
| `--lines` | string | Yes | — | Line ranges (e.g., "12-45,78-103") |
| `--tokens-in` | u64 | No | 0 | Input tokens used |
| `--tokens-out` | u64 | No | 0 | Output tokens used |
| `--cost-usd` | f64 | No | 0.0 | Cost in USD |
| `--transcript-ref` | string | No | null | Transcript reference (SHA or URL) |

**Help text** (from source): "Record a checkpoint from an AI coding agent"

**Actual output** (verified):
```
✓ Checkpoint recorded: 55 lines in src/api.ts (Claude Code / claude-sonnet-4-6)
  Cost: $0.0312
```

**Example** (from GETTING_STARTED.md and demo artifacts):
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

**Line range format** (from `checkpoint.rs`): comma-separated ranges, e.g. `"12-45,78-103"` or `"10"` (single line) or `"1-5, 10-15, 20-25"` (spaces OK). Each range is `start-end` (inclusive).

Checkpoints are stored in SQLite `checkpoints` table and cleared after each commit.

---

### Command: `gitintel blame`

```
Usage: gitintel blame <FILE> [--commit <SHA>] [--ai-only] [--human-only]
```

| Arg/Flag | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `<FILE>` | string | Yes | — | File to blame |
| `--commit`, `-c` | string | No | HEAD | Commit to blame from |
| `--ai-only` | bool | No | false | Show only AI-generated lines |
| `--human-only` | bool | No | false | Show only human-written lines |

**Help text** (from source): "Show AI/Human attribution for a file (extends git blame)"

**Attribution values** (from `blame.rs` `LineAttribution` enum):
- `[AI]` — AI-generated (blue in terminal)
- `[HU]` — Human-written (green)
- `[MX]` — Mixed (yellow)
- `[??]` — Unknown (dimmed) — shown when no attribution note exists for the commit

**Actual output format**:
```
AI Blame: src/utils.ts (94 lines)
────────────────────────────────────────────────────────────────────────────────
   1 [??] a2ca9764 Demo Developer /**
   2 [??] a2ca9764 Demo Developer  * utils.ts — ...
```

⚠️ **PARTIAL**: `blame` shows `[AI]` only for lines where the checkpoint was recorded against the SAME commit that introduced those lines. Lines from older commits that lacked checkpoints show `[??]`. See Section 11 for details.

---

### Command: `gitintel stats`

```
Usage: gitintel stats [--developer <EMAIL>] [--since <PERIOD>] [--format <FORMAT>]
```

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--developer` | string | No | all | Show stats for a specific developer (matches by **email**, not display name) |
| `--since` | string | No | "30d" | Time period: "7d", "30d", "3m", "2w", etc. |
| `--format` | string | No | "text" | Output format: "text", "json", "csv" |

**Help text** (from source): "Show AI adoption statistics"

**Period format** (from `stats.rs`): suffix `d`=days, `w`=weeks, `m`=months (30 days each)

**Actual output** (verified, text format):
```
AI Adoption Stats: Repository
Period: last 30d
────────────────────────────────────────────────────────────
Total Commits:  3
Total Lines:    231

AI-Generated:   [████████████████████████████████████] 119.0%
                275 lines
Human-Written:  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] -19.0%
                -44 lines

Total Cost:     $0.11

By Developer:
────────────────────────────────────────────────────────────
demo@gitintel.test             [████████████████████████] 119.0% (3 commits, $0.11)
```

**Actual JSON output** (verified):
```json
{
  "period": "30d",
  "total_commits": 3,
  "total_lines": 231,
  "ai_lines": 275,
  "human_lines": -44,
  "ai_percentage": 119.04761904761905,
  "total_cost_usd": 0.1064,
  "by_developer": [
    {
      "email": "demo@gitintel.test",
      "commits": 3,
      "ai_lines": 275,
      "human_lines": -44,
      "ai_percentage": 119.04761904761905,
      "cost_usd": 0.1064
    }
  ]
}
```

⚠️ NOTE: AI% > 100 in demo because overlapping checkpoints inflate line counts. Known issue.

**CSV headers** (from `stats.rs`): `email,commits,ai_lines,human_lines,ai_percentage,cost_usd`

---

### Command: `gitintel cost`

```
Usage: gitintel cost [--commit <SHA>] [--branch <NAME>] [--developer <EMAIL>] [--since <PERIOD>] [--format <FORMAT>]
```

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--commit` | string | No | — | Show cost for a specific commit |
| `--branch` | string | No | — | Show cost for a branch (from main to branch) |
| `--developer` | string | No | — | Show cost for a developer |
| `--since` | string | No | "7d" | Time period (same format as stats) |
| `--format` | string | No | "text" | "text" or "json" |

**Help text** (from source): "Show development cost tracking"

**Actual output** (verified, text format):
```
Cost Summary: last 7d
──────────────────────────────────────────────────
Total Spend:     $0.11

Commits:         3
Avg Cost/Commit: $0.04
AI Code Lines:   275 / 231 (119.0%)
──────────────────────────────────────────────────
```

**Actual JSON output** (verified):
```json
{
  "period": "7d",
  "commit": null,
  "branch": null,
  "developer": null,
  "total_cost_usd": 0.1064,
  "by_model": [],
  "by_agent": [],
  "commits": 3,
  "ai_lines": 275,
  "total_lines": 231,
  "ai_percentage": 119.04761904761905
}
```

⚠️ NOTE: `by_model` and `by_agent` arrays are always empty in current version — not yet implemented (see Section 11).

---

### Command: `gitintel context`

Subcommand group with three actions:

#### `gitintel context init`
```
Usage: gitintel context init [--output <FILE>] [--force]
```

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--output`, `-o` | string | No | "CLAUDE.md" | Output file path |
| `--force`, `-f` | bool | No | false | Force overwrite existing file |

**Help text** (from source): "Generate CLAUDE.md from repo analysis"

Scans repo for: `package.json`, `Cargo.toml`, `requirements.txt`, `go.mod`, linters (`biome.json`, `.eslintrc.*`, `rustfmt.toml`), databases (`prisma/`, `drizzle.config.ts`).

Detects frameworks: Next.js, React, Vue, Express, Hono (from package.json deps), Rust (Cargo.toml), Python (requirements.txt/pyproject.toml), Go (go.mod).

#### `gitintel context optimize`
```
Usage: gitintel context optimize [--input <FILE>] [--apply]
```

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--input`, `-i` | string | No | "CLAUDE.md" | Input file path |
| `--apply` | bool | No | false | Apply changes (default: dry run) |

**Help text** (from source): "Optimize CLAUDE.md by pruning unused sections"

Section scoring thresholds (from `context/optimize.rs`):
- score < 0.05 → Prune
- score < 0.20 → Compress (to ~20% of original tokens)
- score >= 0.20 → Keep

⚠️ **PARTIAL**: Scoring is heuristic-only (section name keyword matching + system-time pseudo-random). Does NOT actually analyze session transcripts.

#### `gitintel context diff`
```
Usage: gitintel context diff [--input <FILE>]
```

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--input`, `-i` | string | No | "CLAUDE.md" | Input file path |

**Help text** (from source): "Show token diff before/after optimization"

---

### Command: `gitintel memory`

Subcommand group:

#### `gitintel memory add`
```
Usage: gitintel memory add --key <KEY> --value <VALUE> [--category <CAT>]
```
| Flag | Type | Required | Default |
|------|------|----------|---------|
| `--key` | string | Yes | — |
| `--value` | string | Yes | — |
| `--category` | string | No | "general" |

Valid categories (from `types/index.ts`): `"architecture"`, `"conventions"`, `"dependencies"`, `"general"`

#### `gitintel memory get`
```
Usage: gitintel memory get <KEY>
```

#### `gitintel memory list`
```
Usage: gitintel memory list [--category <CAT>]
```

#### `gitintel memory prune`
```
Usage: gitintel memory prune [--unused-days <N>] [--dry-run]
```
| Flag | Type | Required | Default |
|------|------|----------|---------|
| `--unused-days` | u32 | No | 30 |
| `--dry-run` | bool | No | false |

Prunes entries where `use_count = 0` AND `last_used_at < cutoff`. (Note: only prunes entries with zero uses, not just old ones.)

#### `gitintel memory export`
```
Usage: gitintel memory export [--format <FMT>]
```
| Flag | Type | Required | Default |
|------|------|----------|---------|
| `--format` | string | No | "markdown" |

Valid formats: "markdown", "yaml", "json"

#### `gitintel memory stats`
```
Usage: gitintel memory stats
```
Shows total count, total tokens, and count of entries used in last 7 days.

---

### Command: `gitintel sync`

```
Usage: gitintel sync [--force] [--dry-run]
```

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--force`, `-f` | bool | No | false | Force full sync |
| `--dry-run` | bool | No | false | Dry run (don't actually sync) |

**Help text** (from source): "Sync local data to cloud"

Syncs last 30 days of attributions to `<cloud_sync.endpoint>/sync/attribution`. Requires `cloud_sync.enabled = true` and `cloud_sync.api_key` to be set.

---

### Command: `gitintel hooks`

Subcommand group:

#### `gitintel hooks install`
```
Usage: gitintel hooks install [--force]
```
Installs 5 hook scripts to `~/.gitintel/hooks/`: pre-commit, post-commit, prepare-commit-msg, post-rewrite, post-merge. Sets `git config --global core.hooksPath`.

Hook scripts call `exec gitintel hooks run <hook-name> "$@"`.

#### `gitintel hooks uninstall`
Removes `core.hooksPath` global config. Preserves hook files.

#### `gitintel hooks status`
Shows whether global hooks path is configured and which hook files exist.

#### `gitintel hooks run`
```
Usage: gitintel hooks run <HOOK_NAME> [<HOOK_ARGS>...]
```
Valid hook names: `pre-commit`, `post-commit`, `prepare-commit-msg`, `post-rewrite`, `post-merge`

Called internally by git hook shell scripts. Can also be called manually.

---

### Command: `gitintel config`

```
Usage: gitintel config [--json] [--set <KEY=VALUE>]
```

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--json` | bool | No | false | Show configuration as JSON |
| `--set` | string | No | — | Set a configuration value (format: "key=value") |

**Help text** (from source): "Show current configuration"

---

### Git Proxy Mode

When called with git args and no subcommand:
```bash
gitintel commit -m "message"   # proxies to git, adds hooks
gitintel push origin main       # pushes code + refs/ai/authorship/*
gitintel fetch origin           # fetches code + refs/ai/authorship/*
```

The proxy intercepts `commit`, `push`, `fetch`, `rebase`, `merge` to add hook processing and attribution ref syncing.

---

## SECTION 2: Configuration Keys

Source: `packages/cli/src/config.rs`
Config file location: `~/.gitintel/config.json`

| Key | Type | Default | Description | User-facing |
|-----|------|---------|-------------|-------------|
| `git_path` | string | Auto-detected (`git` or full path on Windows) | Path to the real git binary | Internal |
| `prompt_storage` | string | `"local"` | Prompt storage mode: "local", "cloud", "none" | Yes |
| `cloud_sync.enabled` | bool | `false` | Whether cloud sync is enabled | Yes |
| `cloud_sync.endpoint` | string | `"https://app.gitintel.com/api/v1"` | Cloud API endpoint | Yes |
| `cloud_sync.api_key` | string | `""` (empty) | API key for cloud sync | Yes |
| `otel.enabled` | bool | `true` | Whether OTel collector is enabled | Yes |
| `otel.port` | u16 | `4317` | OTel collector gRPC port | Yes |
| `cost.currency` | string | `"USD"` | Cost display currency | Yes |
| `cost.alert_threshold_daily` | f64 | `10.0` | Daily cost alert threshold in USD | Yes |

**Set via CLI**: `gitintel config --set key=value`

Valid keys for `--set` (from `config.rs` match arm):
- `git_path`
- `prompt_storage`
- `cloud_sync.enabled`
- `cloud_sync.endpoint`
- `cloud_sync.api_key`
- `otel.enabled`
- `otel.port`
- `cost.currency`
- `cost.alert_threshold_daily`

**Other paths** (from `config.rs`):
- Database: `~/.gitintel/gitintel.db`
- Hooks: `~/.gitintel/hooks/`

---

## SECTION 3: Attribution Standard Schema

Source: `packages/cli/src/hooks/post_commit.rs` (Rust structs), actual YAML from `demo/artifacts/attribution-payload.txt`

**Storage location**: `refs/ai/authorship/<full-commit-sha>` (git notes)
**Format**: YAML
**Schema version string**: `"gitintel/1.0.0"` (from `constants.ts` and `post_commit.rs`)

**Actual YAML produced** (verified against running binary):
```yaml
schema_version: gitintel/1.0.0
commit: dc69ba8dd77e12e9ba306be56de72d074937bf16
author: demo@gitintel.test
timestamp: 2026-03-03T09:29:33.399118500+00:00
agent_sessions:
- agent: Claude Code
  model: claude-sonnet-4-6
  tokens:
    input: 3880
    output: 2640
    cache_read: 0
    cache_write: 0
  cost_usd: 0.0778
  transcript_ref: null
  files:
    src/api.ts:
      ai_lines:
      - - 1
        - 55
      human_lines: []
    src/auth.ts:
      ai_lines:
      - - 1
        - 50
      human_lines: []
summary:
  total_lines: 107
  ai_lines: 190
  human_lines: -83
  ai_pct: 177.57009345794393
  total_cost_usd: 0.0778
```

**Rust struct definitions** (from `post_commit.rs`):
```rust
AuthorshipLog {
    schema_version: String,       // "gitintel/1.0.0"
    commit: String,               // full SHA
    author: String,               // git author email
    timestamp: String,            // ISO 8601 with timezone
    agent_sessions: Vec<AgentSession>,
    summary: Summary,
}

AgentSession {
    agent: String,
    model: String,
    tokens: TokenUsage { input: i64, output: i64, cache_read: i64, cache_write: i64 },
    cost_usd: f64,
    transcript_ref: Option<String>,
    files: HashMap<String, FileAttribution>,
}

FileAttribution {
    ai_lines: Vec<(i32, i32)>,    // [(start, end), ...] 1-based inclusive
    human_lines: Vec<(i32, i32)>,
}

Summary {
    total_lines: i32,
    ai_lines: i32,
    human_lines: i32,
    ai_pct: f64,
    total_cost_usd: f64,
}
```

**Reading attribution** (as documented in GETTING_STARTED.md):
```bash
git notes --ref=refs/ai/authorship show HEAD
git notes --ref=refs/ai/authorship list
```

**Syncing attribution with remote** (from GETTING_STARTED.md):
```bash
git config --add remote.origin.fetch '+refs/ai/authorship/*:refs/ai/authorship/*'
git config --add remote.origin.push 'refs/ai/authorship/*'
```

⚠️ **CONFLICT**: GETTING_STARTED.md shows a richer schema in examples (with `session_id`, `vendor`, `calculated_by` fields) but the actual code in `post_commit.rs` does NOT produce these fields. The actual YAML produced matches the code structs above, not the GETTING_STARTED.md examples.

---

## SECTION 4: OTel Metrics Consumed

Source: `packages/cli/src/otel.rs`, `GETTING_STARTED.md`, `infra/docker/docker-compose.yml`

**OTel collector port**: 4317 (gRPC), configured via `otel.port` in config

**Metrics documented** (from GETTING_STARTED.md and CLAUDE.md):

| Metric Name | Description |
|-------------|-------------|
| `claude_code.token.usage` | Input, output, and cache tokens per session |
| `claude_code.cost.usage` | USD cost per session |
| `claude_code.commit.count` | Number of commits in the session |
| `claude_code.code_edit_tool.decision` | Accept/reject counts for code edits |

**Environment variables required** (from `init.rs` output and GETTING_STARTED.md):
```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

**How metrics are used** (from `otel.rs`):
- `process_claude_code_metrics()` creates a `CostSession` record in SQLite
- `correlate_session_to_commit()` links the session to a git commit SHA
- Correlation is by session timestamp matching with commit time (or exact if `--session-id` is passed to checkpoint)

⚠️ **PARTIAL IMPLEMENTATION**: The OTel collector in `otel.rs` is a TCP listener placeholder:
```rust
// In production, this would use opentelemetry-otlp to receive metrics
// For now, we'll create a simple TCP listener placeholder
```
The actual OTLP/gRPC parsing via `tonic` and `prost` is NOT implemented in the CLI. The full OTel collector in Docker uses `otel/opentelemetry-collector-contrib:0.96.0` image (external component, not custom code).

---

## SECTION 5: Supported Agents (verified)

Source: `packages/core/src/constants.ts` (`SUPPORTED_AGENTS` const array)

**Declared supported agents** (exact values from code):
```typescript
export const SUPPORTED_AGENTS = [
  "Claude Code",
  "Cursor",
  "GitHub Copilot",
  "Codex",
  "Gemini Code Assist",
] as const;
```

**What "supported" means in practice** (from GETTING_STARTED.md and code):

All agents use the same generic `gitintel checkpoint` mechanism. There is NO agent-specific integration code beyond documentation:

| Agent | Integration Level | Notes |
|-------|------------------|-------|
| Claude Code | Manual checkpoint + OTel cost tracking | OTel capture is partial (see Section 4) |
| Cursor | Manual checkpoint only | "Cursor does not yet have a native telemetry export" |
| GitHub Copilot | Manual file-level checkpoint at commit time | No session ID or line range exposed by Copilot |
| Codex | Manual checkpoint | No specific integration code found |
| Gemini Code Assist | Manual checkpoint | No specific integration code found |

Any agent can be used with the `--agent` flag (it's a free-form string). The `SUPPORTED_AGENTS` list is for type safety in the SDK only.

---

## SECTION 6: Pricing Table Data

Source: `packages/cli/src/cost.rs` (Rust) and `packages/core/src/constants.ts` (TypeScript) — identical values in both.

All prices are per million tokens ($/MTok):

| Model | Input $/MTok | Output $/MTok | Cache Write $/MTok | Cache Read $/MTok |
|-------|-------------|---------------|---------------------|-------------------|
| `claude-opus-4-5` | $15.00 | $75.00 | $18.75 | $1.50 |
| `claude-sonnet-4-5` | $3.00 | $15.00 | $3.75 | $0.30 |
| `claude-haiku-3-5` | $0.80 | $4.00 | $1.00 | $0.08 |
| `gpt-4o` | $2.50 | $10.00 | $0 | $1.25 |
| `o3` | $10.00 | $40.00 | $0 | $2.50 |
| `gemini-2.0-flash` | $0.075 | $0.30 | $0 | $0 |
| `gemini-2.5-pro` | $1.25 | $10.00 | $0 | $0.31 |

**Model matching** (from `cost.rs`): Uses `model.contains(pricing.model)` — so `"claude-sonnet-4-6"` would NOT match `"claude-sonnet-4-5"` if the version differs.

**Cost formula** (from `cost.rs`):
```
input_cost = (input_tokens / 1,000,000) × input_per_mtok
output_cost = (output_tokens / 1,000,000) × output_per_mtok
cache_cost = (cache_tokens / 1,000,000) × cache_read_per_mtok
total = input_cost + output_cost + cache_cost
```

---

## SECTION 7: SQLite Schema (actual tables)

Source: `packages/cli/src/store/sqlite.rs` — inline SQL migration in `migrate()` function.

Location: `~/.gitintel/gitintel.db`

```sql
-- Checkpoint buffer (pre-commit)
CREATE TABLE IF NOT EXISTS checkpoints (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL,
    agent           TEXT NOT NULL,
    model           TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    line_start      INTEGER NOT NULL,
    line_end        INTEGER NOT NULL,
    timestamp       TEXT NOT NULL,       -- ISO 8601 string
    tokens_in       INTEGER DEFAULT 0,
    tokens_out      INTEGER DEFAULT 0,
    tokens_cache_read INTEGER DEFAULT 0,
    tokens_cache_write INTEGER DEFAULT 0,
    cost_usd        REAL DEFAULT 0.0,
    transcript_ref  TEXT                 -- nullable
);

-- Committed attribution logs
CREATE TABLE IF NOT EXISTS attributions (
    commit_sha      TEXT PRIMARY KEY,
    repo_path       TEXT NOT NULL,
    author_email    TEXT NOT NULL,
    authored_at     TEXT NOT NULL,       -- ISO 8601 string
    ai_lines        INTEGER DEFAULT 0,
    human_lines     INTEGER DEFAULT 0,
    total_lines     INTEGER DEFAULT 0,
    ai_pct          REAL DEFAULT 0.0,
    total_cost_usd  REAL DEFAULT 0.0,
    log_json        TEXT NOT NULL        -- full AuthorshipLog as JSON
);

-- Cost sessions (from OTel or direct API)
CREATE TABLE IF NOT EXISTS cost_sessions (
    session_id      TEXT PRIMARY KEY,
    commit_sha      TEXT,                -- nullable, linked post-commit
    agent           TEXT NOT NULL,
    model           TEXT NOT NULL,
    project_path    TEXT NOT NULL,
    started_at      TEXT NOT NULL,
    ended_at        TEXT,                -- nullable
    tokens_in       INTEGER DEFAULT 0,
    tokens_out      INTEGER DEFAULT 0,
    tokens_cache    INTEGER DEFAULT 0,
    cost_usd        REAL DEFAULT 0.0
);

-- Memory store
CREATE TABLE IF NOT EXISTS memory (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    category        TEXT DEFAULT 'general',
    token_count     INTEGER DEFAULT 0,
    last_used_at    TEXT NOT NULL,
    use_count       INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL
);

-- Sync metadata
CREATE TABLE IF NOT EXISTS sync_metadata (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL
);
```

**Indexes** (from same migration):
- `idx_checkpoints_session` ON `checkpoints(session_id)`
- `idx_checkpoints_timestamp` ON `checkpoints(timestamp)`
- `idx_attributions_author` ON `attributions(author_email)`
- `idx_attributions_date` ON `attributions(authored_at)`
- `idx_cost_sessions_commit` ON `cost_sessions(commit_sha)`
- `idx_cost_sessions_started` ON `cost_sessions(started_at)`
- `idx_memory_category` ON `memory(category)`
- `idx_memory_last_used` ON `memory(last_used_at)`

---

## SECTION 8: Real Output Examples

Source: `demo/artifacts/` directory — all outputs captured from running binary on 2026-03-03.

**Binary version**: `gitintel 0.1.0` (debug build, compiled at `packages/cli/target/debug/gitintel.exe`)

**`gitintel checkpoint` (actual)**:
```
✓ Checkpoint recorded: 55 lines in src/api.ts (Claude Code / claude-sonnet-4-6)
  Cost: $0.0312
```

**`gitintel hooks run post-commit` with pending data (actual)**:
```
✓ Commit: 177.6% AI (Claude Code) | -77.6% Human | Cost: $0.0778
```

**`gitintel blame src/utils.ts` (actual — all `[??]` because initial commit had no notes)**:
```
AI Blame: src/utils.ts (94 lines)
────────────────────────────────────────────────────────────────────────────────
   1 [??] a2ca9764 Demo Developer /**
   2 [??] a2ca9764 Demo Developer  * utils.ts — Utility functions for GitIntel demo project
```

**`gitintel blame src/api.ts` (actual — lines 1-55 show `[AI]`)**:
```
AI Blame: src/api.ts (...)
   1 [AI] dc69ba8d Demo Developer ...
   ...
  55 [AI] dc69ba8d Demo Developer ...
  56 [??] dc69ba8d Demo Developer ...
```

**`gitintel stats` (actual)**:
(see Section 1 — Stats)

**`gitintel cost --since 7d` (actual)**:
(see Section 1 — Cost)

**`gitintel init` output** (from GETTING_STARTED.md, matches code):
(see Section 1 — Init)

**`gitintel --help`**: Not captured. Would output standard clap help listing all subcommands and their descriptions.

**`gitintel stats --help`**: Not captured. Would output: "Show AI adoption statistics" with flags table.

**`gitintel cost --help`**: Not captured. Standard clap format.

---

## SECTION 9: Install Method (actual)

Source: `install.sh` (repo root), `.github/workflows/release.yml`

### Primary Install — curl one-liner (Linux / macOS)

```bash
curl -fsSL https://gitintel.com/install | sh
```

Or using the raw GitHub URL (works without domain redirect):

```bash
curl -fsSL https://raw.githubusercontent.com/gitintel-ai/gitintel/main/install.sh | sh
```

**What the script does** (`install.sh` at repo root):
1. Detects OS (linux / macos) and arch (amd64 / arm64)
2. Fetches the latest release tag from the GitHub API
3. Downloads the correct pre-built binary from GitHub Releases
4. Installs to `~/.local/bin/gitintel` (configurable via `GITINTEL_INSTALL_DIR`)
5. Prints PATH instructions if `~/.local/bin` is not in PATH

**Options:**
```bash
# Pin a specific version
GITINTEL_VERSION=v0.1.0 curl -fsSL https://gitintel.com/install | sh

# Install to a custom directory
GITINTEL_INSTALL_DIR=/usr/local/bin curl -fsSL https://gitintel.com/install | sh
```

**Verify:**
```bash
gitintel --version
# gitintel 0.1.0
```

**Requirements**: curl, internet access. No Rust, no build tools needed.

### Windows

Direct download from GitHub Releases (no install script yet):
```
https://github.com/gitintel-ai/gitintel/releases/latest
→ gitintel-windows-amd64.exe
```
Copy to a directory on your PATH and rename to `gitintel.exe`.

### Available Release Binaries

Built by `release.yml` on every `v*.*.*` tag push. Artifact names:

| Platform | Artifact |
|---|---|
| Linux x86_64 | `gitintel-linux-amd64` |
| Linux ARM64 | `gitintel-linux-arm64` |
| macOS x86_64 | `gitintel-macos-amd64` |
| macOS ARM64 (M1/M2/M3) | `gitintel-macos-arm64` |
| Windows x86_64 | `gitintel-windows-amd64.exe` |

**Status**: CI workflow exists and is correct. No releases published yet (no git tags pushed). Once a `v*.*.*` tag is pushed, all 5 binaries publish automatically.

### Fallback — Build from Source

Requires Rust 1.82+ and Git 2.30+.

```bash
git clone https://github.com/gitintel-ai/gitintel.git
cd gitintel
cargo build --release --manifest-path packages/cli/Cargo.toml

# Linux/macOS
cp packages/cli/target/release/gitintel ~/.local/bin/

# Windows (PowerShell)
Copy-Item packages\cli\target\release\gitintel.exe "$env:USERPROFILE\.local\bin\"
```

Windows build note — if `os error 32` occurs:
```bash
cargo build --jobs 1 --manifest-path packages/cli/Cargo.toml
```

### npm (all platforms including Windows)

```bash
npm install -g @gitintel/cli
```

Package: `@gitintel/cli` at `packages/cli-npm/`. The `postinstall.js` script downloads the correct pre-built binary from GitHub Releases for the user's OS and arch. No Rust or build tools needed.

**Status**: Package and CI publish step exist. No releases published yet (same prerequisite: git tag push).

### Future Install Methods (not yet available)

- Homebrew: `brew install gitintel` — needs a tap repo
- Docker images to `ghcr.io` — CI configured, no images published yet

### Docker Compose (Self-hosted Stack)

```bash
cd infra/docker
docker compose up -d
# Dashboard: http://localhost:3000
# API server: http://localhost:3001
```

---

## SECTION 10: README / Existing Docs

**No README.md exists at repo root.** Documentation is spread across:

- `GETTING_STARTED.md` — Primary user guide (868 lines, comprehensive)
- `CLAUDE.md` — Master project context (project spec, architecture)
- `ARCHITECTURE.md` — System design decisions
- `AGENTS.md` — Multi-agent orchestration plan
- `TASKS.md` — Sprint task board
- `PRD.md` — Product requirements
- `PRODUCT-SPEC.md` — Product specification
- `QUICKSTART.md` — Quick start guide
- `specs/*.md` — Detailed spec files for each component

**Project tagline** (from `CLAUDE.md`):
> "Git-native AI adoption tracking, cost intelligence & context optimization for dev teams"

**Alternative tagline** (from `GETTING_STARTED.md`):
> "git-native AI adoption tracker for engineering teams"

**CLI binary description** (from `main.rs` clap attribute):
> "GitIntel CLI - Git-native AI adoption tracking"

**Feature list** (from `GETTING_STARTED.md` — exact words):
1. "How much of our codebase is AI-generated? (line-level, per developer, per repo)"
2. "What does AI coding actually cost us? (dollars per commit, per feature, per sprint)"
3. "Are we burning tokens on stale context? (optimize CLAUDE.md, prune memory)"

**Privacy guarantee** (exact, from GETTING_STARTED.md):
> "GitIntel stores all data locally in SQLite. Cloud sync is opt-in and off by default. Prompts and transcripts **never leave your machine** unless you explicitly configure them to."

**What GitIntel does NOT track** (exact, from GETTING_STARTED.md FAQ):
> "GitIntel tracks line number ranges, token counts, and cost metadata only. Code content, prompts, and transcripts are never read or stored unless you explicitly pass `--transcript-ref` pointing to a file you control."

**Dashboard description** (from GETTING_STARTED.md):
> "The dashboard provides team-level views: adoption heatmaps by developer and week, cost trend charts, PR cost annotations, and budget alerts."

**Attribution standard description** (from GETTING_STARTED.md):
> "This format is an open standard. Any tool can read it using plain `git notes` — no GitIntel installation required to consume the data."

---

## SECTION 11: What Is NOT Yet Built

Source: `demo/artifacts/report.md` (validation report from actual test run), code comments, and GETTING_STARTED.md.

⚠️ **CRITICAL**: TASKS.md marks ALL tasks `✅ Done`. The validation report (demo/artifacts/report.md) is the authoritative source on what actually works.

### Verified Bugs / Incomplete Features (from actual test runs)

#### Issue 1 — Hook template format (MEDIUM, partially fixed)
- **Source**: `packages/cli/src/hooks/mod.rs` `templates` module
- **Status**: Bug existed in Run 1 (hook scripts called `run-post-commit` instead of `hooks run post-commit`). Fixed manually in the installed hook file. Source code NOT yet fixed.
- **Impact**: Fresh `gitintel init` installs would produce broken hooks until source is fixed.

#### Issue 2 — `blame` attribution only works for same-commit files (MEDIUM)
- **Source**: `packages/cli/src/blame.rs`
- **Status**: Parser works (reads YAML correctly via serde_yaml), but attribution only resolves for lines whose git blame points to a commit that HAS a git note. If the file was introduced in an earlier commit that lacked a checkpoint, all lines show `[??]`.
- **Impact**: `gitintel blame` shows `[??]` for most real-world files.

#### Issue 3 — Stats aggregation can exceed 100% (LOW)
- **Status**: When multiple checkpoint sessions overlap on the same file/lines, totals inflate.
- **Impact**: Stats show ai_percentage > 100 and human_lines can be negative in some scenarios.

#### Issue 4 — `cost --format json` missing `by_model`/`by_agent` (LOW)
- **Status**: Arrays are always empty `[]` in current version. Not yet implemented.
- **Impact**: JSON cost output lacks breakdown by model or agent.

#### Issue 5 — `--developer` flag matches email only (LOW)
- **Status**: `gitintel stats --developer "Alice Chen"` returns 0 results; requires exact email.
- **Impact**: UX friction; CLI help text says "developer" but means email.

### OTel Collector is a Placeholder

From `packages/cli/src/otel.rs` (comment in code):
```rust
// In production, this would use opentelemetry-otlp to receive metrics
// For now, we'll create a simple TCP listener placeholder
```
And:
```rust
// Parse OTLP/gRPC metrics
// In production, use tonic and prost for protobuf parsing
tracing::debug!("Handling OTel connection");
```
The actual OTLP/gRPC metric parsing is NOT implemented. Cost from OTel only flows through the external Docker OTel collector (contrib image), not through the CLI binary directly.

### Context Optimizer Scoring is Heuristic-Only

From `packages/cli/src/context/optimize.rs` (comment in code):
```rust
// In production, this would analyze session transcripts to determine
// which sections are actually referenced by the AI.
//
// For now, use heuristics based on section names:
```
And `rand_float()` uses system time nanoseconds — non-deterministic, not true ML scoring.

### Missing Package: `packages/sdk/`

The release.yml publishes an npm SDK `@gitintel/sdk` from `packages/sdk/`, but this directory does not exist in the repository.

### Missing Infrastructure: `infra/k8s/`

GETTING_STARTED.md references `infra/k8s/` Helm chart, but this directory does not exist in the repository (only `infra/docker/` exists).

### Planned Features (from GETTING_STARTED.md, explicitly marked)

- Homebrew tap (`brew install gitintel`) — "coming soon"
- VS Code extension for Copilot auto-checkpoint — "coming soon"
- Hosted SaaS version — "planned"
- `gitintel attribution strip --all` command — "coming in a future release"
- Free tier for solo developers with unlimited repos — "planned"

### Dashboard Status

The Next.js dashboard has pages for: team overview, cost, developers, repos, context, pulls, team management, alerts settings. These pages exist as React components but connect to the API server which requires a running PostgreSQL instance. No demo mode or mock data mode found.

---

## SECTION 12: Tech Stack Detected

Source: `packages/cli/Cargo.toml`, `packages/server/package.json`, `packages/core/package.json`, `packages/dashboard/package.json`, `infra/docker/docker-compose.yml`

### CLI (Rust — `packages/cli/`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| clap | 4.5 | CLI argument parsing (with derive, env, cargo features) |
| clap_complete | 4.5 | Shell completion generation |
| git2 | 0.19 | Git operations (libgit2 bindings) |
| rusqlite | 0.32 | SQLite (bundled, with backup and functions features) |
| serde | 1.0 | Serialization framework |
| serde_json | 1.0 | JSON serialization |
| serde_yaml | 0.9 | YAML parsing (for attribution logs) |
| tokio | 1.40 | Async runtime (full features) |
| reqwest | 0.12 | HTTP client for sync API (rustls-tls, json) |
| opentelemetry | 0.26 | OTel SDK (metrics feature) |
| opentelemetry_sdk | 0.26 | OTel SDK (metrics, rt-tokio) |
| opentelemetry-otlp | 0.26 | OTLP exporter (tonic, metrics) |
| tonic | 0.12 | gRPC framework |
| prost | 0.13 | Protobuf encoding |
| tiktoken-rs | 0.6 | Token counting (tiktoken-compatible) |
| chrono | 0.4 | Date/time (with serde) |
| uuid | 1.11 | UUID generation (v4, serde) |
| thiserror | 2.0 | Error type derivation |
| anyhow | 1.0 | Error handling |
| dirs | 5.0 | Platform home directory detection |
| walkdir | 2.5 | Recursive directory scanning |
| glob | 0.3 | File glob matching |
| colored | 2.1 | Terminal color output |
| indicatif | 0.17 | Progress bars |
| dialoguer | 0.11 | Interactive prompts |
| regex | 1.11 | Regular expressions |
| lazy_static | 1.5 | Lazy statics |
| once_cell | 1.20 | One-time initialization |
| tracing | 0.1 | Structured logging |
| tracing-subscriber | 0.3 | Tracing output (env-filter, json) |
| tempfile | 3.14 | Temporary files (also dev dep) |
| sha2 | 0.10 | SHA-256 hashing |
| hex | 0.4 | Hex encoding |
| toml | 0.8 | TOML parsing |
| semver | 1.0 | Semantic versioning |

**Dev dependencies**: assert_cmd 2.0, predicates 3.1, mockall 0.13, wiremock 0.6, tokio-test 0.4

**Build profile (release)**: opt-level=z, lto=true, codegen-units=1, strip=true, panic=abort

**Features**: `default = []`, `enterprise = []`

### API Server (`packages/server/`)

| Dependency | Version | Purpose |
|------------|---------|---------|
| hono | 4.6 | Web framework |
| @hono/zod-validator | 0.7.6 | Request validation |
| drizzle-orm | 0.35 | PostgreSQL ORM |
| postgres | 3.4 | PostgreSQL driver |
| @clerk/backend | 1.15 | Auth (JWT verification) |
| zod | 3.23 | Schema validation |
| @paralleldrive/cuid2 | 2.2.2 | ID generation |
| @gitintel/core | workspace:* | Shared types |

**Dev**: drizzle-kit 0.26, typescript 5.6

**Runtime**: Bun
**Default port**: 3001 (from `process.env.PORT || 3001`)

### Core Library (`packages/core/`)

TypeScript shared library with no runtime dependencies. Contains:
- Types: Attribution, AgentSession, CostSession, ModelPricing, Memory, TeamStats, etc.
- Constants: MODEL_PRICING table, DEFAULT_CONFIG, SCHEMA_VERSION, SUPPORTED_AGENTS
- Utils: date parsing, cost calculation

### Dashboard (`packages/dashboard/`)

- Next.js 14 (App Router)
- Clerk (authentication)
- shadcn/ui (component library)
- Tailwind CSS
- Playwright (E2E testing)

### Infrastructure

| Service | Image/Version | Port | Purpose |
|---------|--------------|------|---------|
| API Server | Custom (Bun) | 3001 | REST API |
| Dashboard | Custom (Next.js) | 3000 | Web UI |
| PostgreSQL | postgres:16-alpine | 5432 | Primary database |
| ClickHouse | clickhouse/clickhouse-server:24.3-alpine | 8123, 9000 | OTel analytics |
| Redis | redis:7-alpine | 6379 | Caching |
| OTel Collector | otel/opentelemetry-collector-contrib:0.96.0 | 4317 (gRPC), 4318 (HTTP) | Metrics collection |
| Caddy | caddy:2-alpine | 80, 443 | Reverse proxy (production profile only) |

### PostgreSQL Schema (Cloud/Server)

Tables (from `packages/server/drizzle/0000_shiny_venom.sql`):

| Table | Primary Key | Notable Columns |
|-------|-------------|-----------------|
| `organizations` | uuid | name, settings_json (jsonb) |
| `users` | uuid | email (unique), clerk_id (unique), external_id (SCIM), org_id, role (owner/admin/manager/developer/viewer), status (active/inactive/pending) |
| `repositories` | uuid | org_id, name, remote_url, default_branch |
| `attributions` | uuid | repo_id, commit_sha, author_email, authored_at, ai_lines, human_lines, total_lines, ai_pct, total_cost_usd, log_json (jsonb) |
| `cost_sessions` | uuid | session_id (unique), repo_id, commit_sha, agent, model, started_at, ended_at, tokens_in, tokens_out, tokens_cache, cost_usd |
| `budget_alerts` | uuid | org_id, type (daily/weekly/monthly), threshold_usd, channels_json (jsonb), enabled |
| `audit_logs` | text | organization_id, user_id, action, resource_type, resource_id, details (jsonb), ip_address, user_agent |
| `api_keys` | text | organization_id, name, key_hash (unique), key_prefix, scopes (jsonb, default: ["sync:write","stats:read"]), created_by, last_used_at, expires_at |

### Server API Endpoints

From `packages/server/src/index.ts` and route files:

```
GET  /health                          — Health check (no auth)
POST /api/v1/webhooks/*               — Webhooks (no auth)

-- Protected (JWT auth required) --
POST /api/v1/sync/attribution         — Sync attribution data from CLI
POST /api/v1/sync/cost                — Sync cost session data
GET  /api/v1/stats/team               — Team AI adoption summary (?period=30d)
GET  /api/v1/stats/developers         — List all developers with stats
GET  /api/v1/stats/developer/:id      — Per-developer stats (?period=30d)
GET  /api/v1/cost/summary             — Cost summary
GET  /api/v1/attribution/*            — Attribution endpoints
POST /api/v1/alerts/*                 — Budget alert management
GET  /api/v1/repos/*                  — Repository management
GET  /api/v1/api-keys                 — API key management
GET  /api/v1/audit                    — Audit log
SCIM /scim/v2/*                       — SCIM 2.0 provisioning (separate auth)
```

---

## APPENDIX: Key File Locations

| What | Where |
|------|-------|
| CLI main (commands) | `packages/cli/src/main.rs` |
| Config schema | `packages/cli/src/config.rs` |
| Pricing table | `packages/cli/src/cost.rs`, `packages/core/src/constants.ts` |
| SQLite schema | `packages/cli/src/store/sqlite.rs` |
| Attribution YAML writer | `packages/cli/src/hooks/post_commit.rs` |
| Attribution YAML parser | `packages/cli/src/blame.rs` |
| OTel collector (stub) | `packages/cli/src/otel.rs` |
| CLAUDE.md generator | `packages/cli/src/context/init.rs` |
| Context optimizer | `packages/cli/src/context/optimize.rs` |
| Repo scanner | `packages/cli/src/context/scanner.rs` |
| Git proxy | `packages/cli/src/proxy.rs` |
| Hook installer + templates | `packages/cli/src/hooks/mod.rs` |
| Server entry | `packages/server/src/index.ts` |
| PostgreSQL schema (ORM) | `packages/server/src/db/schema.ts` |
| PostgreSQL schema (SQL) | `packages/server/drizzle/0000_shiny_venom.sql` |
| Shared types | `packages/core/src/types/index.ts` |
| Shared constants | `packages/core/src/constants.ts` |
| Docker Compose | `infra/docker/docker-compose.yml` |
| Release CI | `.github/workflows/release.yml` |
| Actual test run report | `demo/artifacts/report.md` |
| Actual stats output | `demo/artifacts/stats-output.txt` |
| Actual cost output | `demo/artifacts/cost-output.txt` |
| Actual blame output | `demo/artifacts/blame-output.txt` |
| Actual attribution YAML | `demo/artifacts/attribution-payload.txt` |
