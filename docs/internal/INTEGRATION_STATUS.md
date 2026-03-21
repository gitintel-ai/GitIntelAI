# INTEGRATION_STATUS.md — Per-Agent Integration Status

**Generated**: 2026-03-03 by Agent-0
**Source**: REPO_CONTEXT.md Section 5 + code review
**Purpose**: Website agents MUST only list integrations as "Built" or "Available" if they appear here with ✅.

---

## AI Agent Integrations

| Integration | Status | How Connected | Use on Website |
|-------------|--------|---------------|----------------|
| Claude Code | ⚠️ Partial | Manual `gitintel checkpoint` + OTel TCP stub | Claim: "Manual checkpoint + OTel cost tracking. OTel full OTLP/gRPC parsing coming soon." |
| Cursor | ⚠️ Partial | Manual `gitintel checkpoint` only | Claim: "Manual checkpoint. No native telemetry export." |
| GitHub Copilot | ⚠️ Partial | Manual file-level checkpoint at commit time | Claim: "Manual checkpoint. No session ID or line ranges exposed by Copilot." |
| Codex (OpenAI) | ⚠️ Partial | Manual checkpoint | Claim: "Manual checkpoint. No agent-specific integration." |
| Gemini Code Assist | ⚠️ Partial | Manual checkpoint | Claim: "Manual checkpoint. No agent-specific integration." |
| VS Code Copilot auto-checkpoint | 🔲 Planned | — | "Coming soon" badge only |

**What "manual checkpoint" means**:
The user (or a wrapper script) calls `gitintel checkpoint --agent "..." --lines "..."` after each AI coding session. There is no automatic hook into any agent's API. All agents use the exact same mechanism.

---

## "Works With" Section Policy

The website "Works with" or "Supported agents" section MUST state:

> "All agents use the universal `gitintel checkpoint` command. Native auto-detection is planned for Claude Code via OpenTelemetry."

Do NOT imply that GitIntel automatically detects AI output from any agent without manual checkpoint recording.

---

## OTel / Telemetry Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| Claude Code OTel export (native) | ✅ Available | Claude Code natively exports `claude_code.token.usage`, `claude_code.cost.usage` via OTel |
| GitIntel OTel collector (CLI, in-process) | ⚠️ Partial | TCP placeholder only. Full OTLP/gRPC not implemented in CLI binary. |
| External OTel collector (Docker) | ✅ Available | `otel/opentelemetry-collector-contrib:0.96.0` in docker-compose |
| ClickHouse storage | ✅ Available | In docker-compose stack |

**For website**: Claim OTel integration as "available via Docker stack" for cost tracking. Do NOT claim the CLI binary itself parses OTLP/gRPC.

---

## CI/CD Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| GitHub Actions | ✅ Available | API key auth for `gitintel sync` in CI |
| GitLab CI | 🔲 Not documented | Same mechanism would work but not documented |

---

## Cloud / SaaS Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| Hosted dashboard (app.gitintel.com) | 🔲 Planned | SaaS version planned; self-hosted via Docker is available |
| Slack alerts | 🔲 Planned | `channels_json` in budget_alerts schema suggests this but no implementation found |
| Email alerts | 🔲 Planned | Same |
| GitHub PR annotations | ✅ Built | `/api/v1/webhooks/github` endpoint exists |

---

## Infrastructure Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| Docker (self-hosted) | ✅ Built | Full `docker-compose.yml` with all services |
| Kubernetes Helm | 🔲 Not Built | `infra/k8s/` does not exist |
| PostgreSQL | ✅ Built | Required for server/dashboard |
| SQLite (local) | ✅ Built | Local-first database |
| Redis | ✅ Available | In docker-compose |
| ClickHouse | ✅ Available | In docker-compose |

---

## Summary for Homepage "Works With" Section

**Approved copy** (accurate as of 2026-03-03):

> GitIntel AI works with any AI coding assistant. Record sessions using
> `gitintel checkpoint --agent "Agent Name" --lines "12-45"` after each
> AI coding session. Supports Claude Code, Cursor, GitHub Copilot, Codex,
> and Gemini Code Assist out of the box.

**Approved agent list** (exact values from `SUPPORTED_AGENTS` constant):
1. Claude Code
2. Cursor
3. GitHub Copilot
4. Codex
5. Gemini Code Assist
