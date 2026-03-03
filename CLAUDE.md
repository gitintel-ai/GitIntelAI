# CLAUDE.md — GitIntel AI: Master Project Context

## Project Identity
**Product:** GitIntel AI (`gitintel`)
**Tagline:** Git-native AI adoption tracking, cost intelligence & context optimization for dev teams
**CLI Binary:** `gitintel` (acts as a git proxy, like git-ai)
**Monorepo Root:** `/gitintel`

## Mission
Reverse-engineer and supersede usegitai.com by building a fully open, enterprise-ready platform that:
1. **Tracks AI adoption** — line-level attribution (AI / Human / Mixed) per developer, repo, sprint
2. **Tracks development cost** — token usage → USD cost per commit, feature, developer, team, org
3. **Manages context & memory** — optimizes CLAUDE.md generation, prunes redundant context, lowers token burn

## Monorepo Structure
```
gitintel/
├── CLAUDE.md                  ← YOU ARE HERE (always load this first)
├── PRD.md                     ← Full product requirements
├── ARCHITECTURE.md            ← System design decisions
├── AGENTS.md                  ← Multi-agent orchestration plan
├── TASKS.md                   ← Sprint-level task list for agents
├── specs/
│   ├── 01-cli-core.md         ← CLI git proxy + hook system
│   ├── 02-attribution-std.md  ← Authorship log open standard
│   ├── 03-cost-engine.md      ← Token cost tracking engine
│   ├── 04-context-manager.md  ← Context/memory optimization
│   ├── 05-dashboard.md        ← Web analytics dashboard
│   └── 06-enterprise.md       ← SSO, RBAC, audit, self-host
├── packages/
│   ├── cli/                   ← Rust CLI binary (git proxy)
│   ├── core/                  ← TypeScript shared lib (types, utils)
│   ├── server/                ← Bun/Node API server
│   ├── dashboard/             ← Next.js 14 web app
│   └── sdk/                   ← Agent SDK (JS/Python)
└── infra/
    ├── docker/
    └── k8s/
```

## Tech Stack Decisions (FIXED — do not change)
| Layer         | Technology                          | Rationale                              |
|---------------|-------------------------------------|----------------------------------------|
| CLI           | Rust                                | Binary size, speed, git-ai parity      |
| API Server    | Bun + Hono                          | Fast, TypeScript-native, edge-ready    |
| Database      | SQLite (local) + PostgreSQL (cloud) | Local-first, enterprise scale          |
| Dashboard     | Next.js 14 App Router + shadcn/ui   | Fast iteration, good DX                |
| Auth          | Clerk (dev) → Auth.js (enterprise)  | SSO/SAML/OIDC support                  |
| Telemetry     | OpenTelemetry (OTel) → ClickHouse   | Matches Claude Code native OTel export |
| Agent SDK     | TypeScript + Python                 | Coverage of both dev ecosystems        |
| Deployment    | Docker → K8s (Helm chart)           | Single-binary to enterprise            |

## Core Invariants (NEVER violate)
1. **Local-first** — all tracking works 100% offline; cloud sync is opt-in
2. **Git-native** — attribution stored in `refs/ai/authorship/{sha}` (open standard)
3. **No workflow change** — developers just `git commit` as normal
4. **Vendor-agnostic** — works with Claude Code, Cursor, Copilot, Codex, Gemini CLI
5. **Privacy-first** — prompts/transcripts NEVER leave the machine unless explicitly configured
6. **Zero-trust enterprise** — self-hostable, air-gapped deployable

## Claude Code Integration Points
Claude Code exports OTel metrics natively:
- `claude_code.token.usage` (input/output/cache tokens)
- `claude_code.cost.usage` (USD)
- `claude_code.commit.count`
- `claude_code.code_edit_tool.decision`

Set env vars to capture:
```bash
CLAUDE_CODE_ENABLE_TELEMETRY=1
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317  # gitintel OTel collector
```

## Attribution Standard (v1.0)
Stored at `refs/ai/authorship/{full-commit-sha}`:
```yaml
schema_version: gitintel/1.0.0
commit: <sha>
author: <git-config-name>
timestamp: <ISO8601>
agent_sessions:
  - agent: "Claude Code"
    model: "claude-opus-4-5"
    tokens: { input: 1240, output: 890, cache_read: 340, cache_write: 200 }
    cost_usd: 0.0234
    transcript_ref: <sha-or-url>
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

## Agent Orchestration Instructions
When Opus orchestrates sub-agents, use TASKS.md as the source of truth.
Each agent MUST:
1. Read this CLAUDE.md first
2. Read the relevant spec file(s) for their task
3. Write code in the correct package directory
4. Add tests alongside code
5. Update TASKS.md status on completion
6. Never skip error handling, never hardcode secrets

## Definition of Done
A feature is DONE when:
- [ ] Unit tests pass (>80% coverage)
- [ ] Integration test exists
- [ ] CLI `--help` updated
- [ ] README section updated
- [ ] TASKS.md status = `✅ Done`
