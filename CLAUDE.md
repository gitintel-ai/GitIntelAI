# CLAUDE.md — GitIntel AI

**Product:** GitIntel AI (`gitintel`)
**Tagline:** The missing git blame for AI code
**CLI Binary:** `gitintel` (git proxy — intercepts commits, attributes AI vs human lines)

## Monorepo Structure
```
gitintel/
├── CLAUDE.md                  ← YOU ARE HERE
├── docs/
│   ├── ARCHITECTURE.md        ← System design decisions
│   ├── GETTING_STARTED.md     ← User-facing setup guide
│   ├── QUICKSTART.md          ← Quick start guide
│   ├── REAL_CLI_EXAMPLES.md   ← Verified CLI output examples
│   └── internal/
│       ├── PRD.md             ← Full product requirements
│       ├── AGENTS.md          ← Multi-agent orchestration plan
│       ├── TASKS.md           ← Sprint-level task list
│       ├── PRODUCT_STRATEGY.md
│       ├── PRODUCT-SPEC.md
│       ├── INTEGRATION_STATUS.md
│       └── VERIFIED_FEATURES.md
├── specs/                     ← Feature specifications (01–08)
├── packages/
│   ├── cli/                   ← Rust CLI binary (git proxy)
│   ├── cli-npm/               ← npm wrapper for CLI distribution
│   ├── core/                  ← TypeScript shared lib (types, utils)
│   ├── server/                ← Bun/Hono API server
│   └── dashboard/             ← Next.js 14 web app
└── infra/                     ← Docker, K8s configs
```

## Tech Stack (FIXED — do not change without RFC)
| Layer      | Technology                        | Rationale                            |
|------------|-----------------------------------|--------------------------------------|
| CLI        | Rust                              | Binary size, speed, git-ai parity    |
| API Server | Bun + Hono                        | Fast, TypeScript-native, edge-ready  |
| Database   | SQLite (local) + PostgreSQL (cloud)| Local-first, enterprise scale       |
| Dashboard  | Next.js 14 App Router + shadcn/ui | Fast iteration, good DX              |
| Auth       | Clerk (dev) → Auth.js (enterprise)| SSO/SAML/OIDC support                |
| Telemetry  | OpenTelemetry → ClickHouse        | Matches Claude Code native OTel      |
| Deployment | Docker → K8s (Helm chart)         | Single-binary to enterprise          |

## Core Invariants (NEVER violate)
1. **Local-first** — all tracking works 100% offline; cloud sync is opt-in
2. **Git-native** — attribution stored in `refs/ai/authorship/{sha}` (open standard)
3. **No workflow change** — developers just `git commit` as normal
4. **Vendor-agnostic** — works with Claude Code, Cursor, Copilot, Codex, Gemini CLI
5. **Privacy-first** — prompts/transcripts NEVER leave the machine unless explicitly configured
6. **Zero-trust enterprise** — self-hostable, air-gapped deployable

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

## Claude Code OTel Integration
```bash
CLAUDE_CODE_ENABLE_TELEMETRY=1
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317  # gitintel collector
```
Captured metrics: `claude_code.token.usage`, `claude_code.cost.usage`, `claude_code.commit.count`, `claude_code.code_edit_tool.decision`

## Decision Framework
1. **Bug fix?** → Fix it, add a test, submit PR
2. **New feature?** → Check alignment with core invariants. If yes, build. If not, open an issue first.
3. **Breaking change to attribution standard?** → NEVER without RFC process
4. **Adding a dependency?** → Justify it. Prefer stdlib/existing deps.
5. **Touching the CLI binary?** → Run `cargo test` AND manual test the affected command

## Red Flags — Thoughts That Signal You're Off Track
| Thought | What It Really Means |
|---------|---------------------|
| "This is simple, I don't need to test" | This is exactly when tests catch bugs |
| "I'll refactor this while I'm here" | Scope creep. Separate PR. |
| "The attribution standard should support X" | Open an RFC. Don't change the standard in a feature PR. |
| "I'll skip the manual checkpoint fallback" | Fallbacks exist for a reason. Never remove safety nets. |
| "This error is unlikely, no need to handle it" | `claude_hooks.rs` must NEVER crash. Handle everything. |

## Definition of Done (Enforced)
Before claiming any task is done:
1. **IDENTIFY** what proves completion (test passing, CLI output, file created)
2. **RUN** the verification fresh (`cargo test`, `cargo check`, manual command)
3. **READ** the full output — don't assume
4. **CONFIRM** it matches expected behavior
5. **ONLY THEN** mark as done

Forbidden in completion reports: "should work", "probably done", "seems fine"

## Agent Orchestration
When Opus orchestrates sub-agents, use `docs/internal/TASKS.md` as source of truth.
Each agent MUST:
1. Read this CLAUDE.md first
2. Read the relevant spec file(s) in `specs/`
3. Write code in the correct `packages/` directory
4. Add tests alongside code
5. Update `docs/internal/TASKS.md` status on completion
6. Never skip error handling, never hardcode secrets
