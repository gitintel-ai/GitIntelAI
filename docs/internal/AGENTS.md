# AGENTS.md — Multi-Agent Orchestration Plan

## Orchestrator Model
**Model:** Claude Opus 4.5 (orchestrator)
**Sub-agents:** Claude Sonnet 4.5 (workers)
**Tool:** Claude Code with --dangerously-skip-permissions for autonomous build

## Orchestration Command
Run this from repo root to start the autonomous build:
```bash
claude --model claude-opus-4-5 \
  --dangerously-skip-permissions \
  -p "You are the lead architect for GitIntel AI. 
      Read CLAUDE.md, docs/internal/PRD.md, docs/ARCHITECTURE.md, and docs/internal/TASKS.md.
      Spawn sub-agents to implement each task group in docs/internal/TASKS.md.
      Coordinate via shared docs/internal/TASKS.md status updates.
      Build the full MVP as specified. Start now."
```

## Agent Roles

### Agent-0: Orchestrator (Opus)
- Reads all spec files
- Assigns tasks to sub-agents
- Reviews completed work
- Resolves blockers
- Updates docs/internal/TASKS.md

### Agent-1: CLI Foundation (Rust Expert)
**Context:** specs/01-cli-core.md, docs/ARCHITECTURE.md
**Deliverables:**
- Rust workspace setup
- Git proxy binary
- Hook install/uninstall system
- SQLite store module
- `gitintel checkpoint` command
- `gitintel blame` command
- `gitintel stats` command

### Agent-2: Cost Engine (Backend Expert)
**Context:** specs/03-cost-engine.md, docs/ARCHITECTURE.md
**Deliverables:**
- OTel collector integration
- Model pricing tables (Claude, OpenAI, Gemini, Copilot)
- Cost session correlator
- `gitintel cost` command (commit/branch/developer/period)
- SQLite cost_sessions schema + queries

### Agent-3: Context Manager (AI/NLP Expert)
**Context:** specs/04-context-manager.md, docs/ARCHITECTURE.md
**Deliverables:**
- Repo scanner (stack detection)
- CLAUDE.md generator
- Token counter (tiktoken-compatible)
- Context optimizer (section scoring)
- Memory store CRUD
- `gitintel context` and `gitintel memory` commands

### Agent-4: API Server (Backend Expert)
**Context:** specs/05-dashboard.md, docs/ARCHITECTURE.md
**Deliverables:**
- Bun + Hono server setup
- PostgreSQL schema + migrations
- All REST endpoints
- Auth middleware (Clerk JWT)
- CLI sync endpoints
- GitHub webhook handler

### Agent-5: Dashboard (Frontend Expert)
**Context:** specs/05-dashboard.md
**Deliverables:**
- Next.js 14 project setup
- shadcn/ui components
- AI adoption heatmap
- Cost trend charts (Recharts)
- Developer leaderboard
- PR cost annotation view
- Budget alert configuration

### Agent-6: DevOps (Infrastructure Expert)
**Context:** docs/ARCHITECTURE.md, infra/
**Deliverables:**
- Docker Compose (all services)
- Dockerfile per package
- GitHub Actions CI/CD
- Helm chart skeleton
- .env.example files
- Health check endpoints

## Sub-Agent Spawn Pattern (for Agent-0)
```javascript
// Claude Code sub-agent spawn pattern
const tasks = await readFile('docs/internal/TASKS.md');
const pendingTasks = parsePendingTasks(tasks);

for (const taskGroup of pendingTasks) {
  await spawnSubAgent({
    model: 'claude-sonnet-4-5',
    context: [
      'CLAUDE.md',
      `specs/${taskGroup.specFile}`,
      'docs/ARCHITECTURE.md'
    ],
    task: taskGroup.description,
    workDir: `packages/${taskGroup.package}`,
    onComplete: () => updateTaskStatus(taskGroup.id, 'done')
  });
}
```

## Parallel Execution Plan
```
Day 1 Morning (Parallel):
  Agent-1 → CLI Foundation (git proxy + hooks)
  Agent-6 → Docker + CI setup

Day 1 Afternoon (Parallel):
  Agent-1 → checkpoint + blame + stats commands
  Agent-2 → Cost engine + OTel integration
  Agent-3 → Context manager + CLAUDE.md generator

Day 2 Morning (Agent-1+2+3 must complete first):
  Agent-4 → API server (depends on schema from Agent-1/2)
  Agent-5 → Dashboard (can start with mock data)

Day 2 Afternoon:
  Agent-4 → Wire up real data endpoints
  Agent-5 → Connect to real API
  Agent-0 → Integration test + QA pass

Day 3 (if needed):
  Enterprise features, SSO, Helm chart
```
