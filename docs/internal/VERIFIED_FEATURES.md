# VERIFIED_FEATURES.md — GitIntel AI Gate File

**Generated**: 2026-03-03 by Agent-0
**Source**: REPO_CONTEXT.md (code-verified)
**Purpose**: Definitive feature status for all website agents. DO NOT claim a feature as Built unless status = ✅.

---

## CLI Commands

| Feature | Status | Source | Notes |
|---------|--------|--------|-------|
| `gitintel init` | ✅ Built | `src/init.rs` | Full implementation verified |
| `gitintel init --force` | ✅ Built | `src/init.rs` | Flag accepted |
| `gitintel checkpoint` | ✅ Built | `src/checkpoint.rs` | All flags verified |
| `gitintel blame <file>` | ⚠️ Partial | `src/blame.rs` | Works only for commits that have a checkpoint; older commits show `[??]` |
| `gitintel blame --ai-only` | ✅ Built | `src/blame.rs` | Flag implemented |
| `gitintel blame --human-only` | ✅ Built | `src/blame.rs` | Flag implemented |
| `gitintel stats` | ✅ Built | `src/stats.rs` | Verified output in demo |
| `gitintel stats --developer <email>` | ⚠️ Partial | `src/stats.rs` | Matches by email only; display name matching not supported |
| `gitintel stats --since <period>` | ✅ Built | `src/stats.rs` | Formats: 7d, 30d, 3m, 2w |
| `gitintel stats --format json` | ✅ Built | `src/stats.rs` | Verified JSON output |
| `gitintel stats --format csv` | ✅ Built | `src/stats.rs` | CSV headers verified |
| `gitintel cost` | ✅ Built | `src/cost.rs` | Text and JSON output verified |
| `gitintel cost --commit <sha>` | ✅ Built | `src/cost.rs` | Flag implemented |
| `gitintel cost --branch <name>` | ✅ Built | `src/cost.rs` | Flag implemented |
| `gitintel cost --developer <email>` | ✅ Built | `src/cost.rs` | Flag implemented |
| `gitintel cost --since <period>` | ✅ Built | `src/cost.rs` | Default 7d |
| `gitintel cost --format json by_model` | 🔲 Not Built | `src/cost.rs` | `by_model` always `[]`; not implemented |
| `gitintel cost --format json by_agent` | 🔲 Not Built | `src/cost.rs` | `by_agent` always `[]`; not implemented |
| `gitintel context init` | ✅ Built | `src/context/init.rs` | Generates CLAUDE.md from repo scan |
| `gitintel context optimize` | ⚠️ Partial | `src/context/optimize.rs` | Heuristic scoring only; no transcript analysis |
| `gitintel context diff` | ✅ Built | `src/context/diff.rs` | Shows token delta |
| `gitintel memory add` | ✅ Built | `src/` | All CRUD operations |
| `gitintel memory get` | ✅ Built | `src/` | |
| `gitintel memory list` | ✅ Built | `src/` | |
| `gitintel memory prune` | ✅ Built | `src/` | Prunes zero-use entries only |
| `gitintel memory export` | ✅ Built | `src/` | markdown, yaml, json formats |
| `gitintel memory stats` | ✅ Built | `src/` | |
| `gitintel sync` | ✅ Built | `src/sync.rs` | Requires cloud_sync.enabled=true |
| `gitintel sync --dry-run` | ✅ Built | `src/sync.rs` | |
| `gitintel hooks install` | ✅ Built | `src/hooks/mod.rs` | 5 hooks installed |
| `gitintel hooks uninstall` | ✅ Built | `src/hooks/mod.rs` | |
| `gitintel hooks status` | ✅ Built | `src/hooks/mod.rs` | |
| `gitintel hooks run` | ✅ Built | `src/hooks/mod.rs` | Called by git hook scripts |
| `gitintel config` | ✅ Built | `src/config.rs` | |
| `gitintel config --set` | ✅ Built | `src/config.rs` | 9 valid keys |
| `gitintel config --json` | ✅ Built | `src/config.rs` | |
| Git proxy mode | ✅ Built | `src/proxy.rs` | commit, push, fetch, rebase, merge |
| `gitintel status` | 🔲 Not Built | — | **DOES NOT EXIST** — use `gitintel stats` |
| `gitintel dashboard` | 🔲 Not Built | — | **DOES NOT EXIST** as CLI command |
| `gitintel attribution strip` | 🔲 Planned | — | Listed in GETTING_STARTED.md as "coming in a future release" |

---

## Installation Methods

| Method | Status | Notes |
|--------|--------|-------|
| Build from source (`cargo build --release`) | ✅ Available | Primary method |
| One-liner curl install | 🔲 Planned | No install script exists yet |
| Homebrew (`brew install gitintel`) | 🔲 Planned | "coming soon" per GETTING_STARTED.md |
| Pre-built binaries | 🔲 Planned | CI configured but no releases published |
| npm SDK (`@gitintel/sdk`) | 🔲 Not Built | `packages/sdk/` directory does not exist |

---

## Agent Integrations

| Agent | Status | Notes |
|-------|--------|-------|
| Claude Code | ⚠️ Partial | Manual checkpoint; OTel cost capture is placeholder TCP listener (not full OTLP/gRPC) |
| Cursor | ⚠️ Partial | Manual checkpoint only; no native telemetry export |
| GitHub Copilot | ⚠️ Partial | Manual file-level checkpoint; no session ID or line ranges from Copilot |
| Codex | ⚠️ Partial | Manual checkpoint; no specific integration code |
| Gemini Code Assist | ⚠️ Partial | Manual checkpoint; no specific integration code |

---

## Attribution Standard

| Feature | Status | Notes |
|---------|--------|-------|
| Attribution schema v1.0 | ✅ Built | `gitintel/1.0.0` schema verified |
| Storage in `refs/ai/authorship/<sha>` | ✅ Built | Verified in demo |
| YAML format | ✅ Built | Verified actual output |
| Per-file line ranges | ✅ Built | `ai_lines`, `human_lines` as `[(start, end)]` |
| Token counts (input/output/cache) | ✅ Built | All 4 token fields |
| Cost USD | ✅ Built | `cost_usd` field |
| Rebase/merge/squash preservation | ✅ Built | git notes preserved |
| `session_id` field in schema | 🔲 Not Built | Present in GETTING_STARTED.md examples but NOT in actual code |
| `vendor` field in schema | 🔲 Not Built | Same — in docs but not in code |

---

## OTel / Cost Engine

| Feature | Status | Notes |
|---------|--------|-------|
| OTel collector (gRPC port 4317) | ⚠️ Partial | TCP listener placeholder only; full OTLP/gRPC parsing not implemented in CLI |
| External OTel collector (Docker) | ✅ Available | Uses `otel/opentelemetry-collector-contrib:0.96.0` |
| Model pricing table | ✅ Built | 7 models: claude-opus-4-5, claude-sonnet-4-5, claude-haiku-3-5, gpt-4o, o3, gemini-2.0-flash, gemini-2.5-pro |
| Cost calculation (tokens → USD) | ✅ Built | Verified formula in `cost.rs` |
| `by_model` cost breakdown in JSON | 🔲 Not Built | Always empty array |
| `by_agent` cost breakdown in JSON | 🔲 Not Built | Always empty array |

---

## Dashboard

| Feature | Status | Notes |
|---------|--------|-------|
| Team adoption heatmap | ✅ Built | Next.js component exists |
| Cost trend chart | ✅ Built | Next.js component exists |
| Developer leaderboard | ✅ Built | Page exists |
| Repo breakdown | ✅ Built | Page exists |
| PR cost annotations | ✅ Built | Page exists |
| Budget alert UI | ✅ Built | Page exists |
| Context optimizer panel | ✅ Built | Page exists |
| Demo mode (no DB required) | 🔲 Not Built | Requires PostgreSQL |
| Mock data mode | 🔲 Not Built | No mock data found |

---

## Enterprise Features

| Feature | Status | Notes |
|---------|--------|-------|
| Docker Compose (self-hosted) | ✅ Built | `infra/docker/docker-compose.yml` |
| Kubernetes Helm chart | 🔲 Not Built | `infra/k8s/` directory does not exist |
| SAML/OIDC SSO (Auth.js) | ✅ Built | Server middleware |
| RBAC (5 roles) | ✅ Built | owner/admin/manager/developer/viewer |
| Audit logging | ✅ Built | `audit_logs` table |
| API key management | ✅ Built | |
| SCIM 2.0 provisioning | ✅ Built | `/scim/v2/*` endpoints |
| Air-gapped deployment | ✅ Available | Docker Compose works offline |

---

## Known Bugs (Do Not Claim as Working)

| Bug | Impact | Workaround |
|-----|--------|------------|
| `gitintel blame` shows `[??]` for most files | Medium | Only works for lines from commits WITH checkpoints |
| Stats AI% can exceed 100% | Low | Overlapping checkpoints inflate counts |
| `--developer` matches email only, not display name | Low | Use email address |
| Hook template bug (fresh installs) | Medium | Source NOT yet fixed; demo patched manually |
| OTel in-CLI parsing is TCP stub | High | Use Docker OTel collector for cost tracking |
