# GitIntel AI — Quick Start Guide

Get up and running with GitIntel AI in under 5 minutes.

---

## Prerequisites

- **Git** 2.30+
- **Bun** 1.2+ (`curl -fsSL https://bun.sh/install | bash`)
- **Rust** 1.82+ (for building the CLI from source)
- **Node.js** 18+ (for the dashboard)
- **Docker** (optional, for the full stack)

---

## Option A: Docker Compose (Recommended)

Spin up the entire platform — API server, dashboard, PostgreSQL, ClickHouse, OTel collector — with one command.

```bash
# Clone the repo
git clone https://github.com/your-org/gitintel.git
cd gitintel

# Copy environment file
cp infra/docker/.env.example infra/docker/.env

# Edit .env with your settings (defaults work for local dev)
# At minimum, set POSTGRES_PASSWORD and API_SECRET_KEY

# Start all services
cd infra/docker
docker compose up -d
```

Services will be available at:

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| API Server | http://localhost:3001 |
| OTel Collector (gRPC) | http://localhost:4317 |
| OTel Collector (HTTP) | http://localhost:4318 |
| ClickHouse | http://localhost:8123 |

---

## Option B: Local Development

### 1. Install dependencies

```bash
# From the repo root
cd packages/core && bun install
cd ../server && bun install
cd ../dashboard && bun install
```

### 2. Build the core library

```bash
cd packages/core
bun run build
```

### 3. Set up the database

Start a local PostgreSQL instance (or use Docker):

```bash
docker run -d --name gitintel-pg \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=gitintel_test \
  -p 5432:5432 \
  postgres:16-alpine
```

Push the schema:

```bash
cd packages/server
DATABASE_URL=postgresql://postgres:test@localhost:5432/gitintel_test bunx drizzle-kit push
```

### 4. Start the API server

```bash
cd packages/server
DATABASE_URL=postgresql://postgres:test@localhost:5432/gitintel_test bun run dev
```

The API server starts on http://localhost:3001. Verify:

```bash
curl http://localhost:3001/health
# {"status":"healthy","timestamp":"...","version":"0.1.0"}
```

### 5. Start the dashboard

```bash
cd packages/dashboard
cp .env.example .env.local
# Edit .env.local if needed (defaults point to localhost:3001)

bun run dev
```

Open http://localhost:3000 in your browser.

### 6. Build the CLI (optional)

```bash
cd packages/cli
cargo build --release

# The binary is at target/release/gitintel
# Add it to your PATH:
cp target/release/gitintel ~/.local/bin/
```

---

## CLI Usage

### Initialize in a repo

```bash
cd your-project
gitintel init
```

This creates `.gitintel/config.json` and installs git hooks.

### View AI adoption stats

```bash
# Last 30 days (default)
gitintel stats

# Last 7 days, specific developer
gitintel stats --period 7d --developer alice@acme.com
```

### View cost breakdown

```bash
# Cost summary for the last week
gitintel cost --period 7d

# Cost for a specific commit
gitintel cost --commit abc123def456...

# Cost for a feature branch
gitintel cost --branch feature/auth
```

### AI-annotated blame

```bash
gitintel blame src/auth/login.ts
```

Output shows each line annotated with `[AI]`, `[Human]`, or `[Mixed]`.

### Context management

```bash
# Generate an optimized CLAUDE.md
gitintel context init

# Optimize an existing CLAUDE.md (prune stale sections)
gitintel context optimize

# Show token savings
gitintel context diff

# View context stats
gitintel context stats
```

### Memory management

```bash
# List stored context entries
gitintel memory list

# Prune stale entries
gitintel memory prune --max-tokens 50000
```

### Sync to cloud

```bash
# Enable cloud sync
gitintel config set cloudSync.enabled true
gitintel config set cloudSync.endpoint https://app.gitintel.com/api/v1

# Push local data
gitintel sync
```

---

## Claude Code Integration

GitIntel captures Claude Code's native OpenTelemetry metrics. Add these to your shell profile:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

This sends token usage, cost, and commit metrics directly to GitIntel's OTel collector.

---

## Running Tests

### Core library (94 unit tests)

```bash
cd packages/core
bun test
```

### API server

```bash
cd packages/server
bun test
```

### Dashboard E2E (Chromium + Firefox)

```bash
cd packages/dashboard

# Install browsers
bunx playwright install --with-deps chromium firefox

# Build the dashboard
bun run build

# Run tests
bunx playwright test --project=chromium --project=firefox
```

### Integration E2E (full stack)

Requires PostgreSQL running with schema pushed and seeded:

```bash
cd packages/dashboard

# Seed the test database
DATABASE_URL=postgresql://postgres:test@localhost:5432/gitintel_test \
  bun run e2e-integration/seed.ts

# Run integration tests (starts API server + dashboard automatically)
DATABASE_URL=postgresql://postgres:test@localhost:5432/gitintel_test \
  bunx playwright test --config=playwright.integration.config.ts
```

---

## Environment Variables

### API Server

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PORT` | No | `3001` | Server port |
| `NODE_ENV` | No | `production` | Environment (`test` enables mock auth) |
| `CLERK_SECRET_KEY` | Prod | — | Clerk authentication secret |

### Dashboard

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | API server URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Prod | — | Clerk publishable key |
| `CLERK_SECRET_KEY` | Prod | — | Clerk secret key |

### OTel Integration

| Variable | Required | Default | Description |
|---|---|---|---|
| `CLAUDE_CODE_ENABLE_TELEMETRY` | No | `0` | Enable Claude Code telemetry |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | — | OTel collector endpoint |

---

## Project Scripts

### packages/core

| Script | Command | Description |
|---|---|---|
| `build` | `tsc` | Compile TypeScript |
| `test` | `bun test` | Run unit tests |
| `type-check` | `tsc --noEmit` | Type check without emit |

### packages/server

| Script | Command | Description |
|---|---|---|
| `dev` | `bun run --hot src/index.ts` | Dev server with hot reload |
| `start` | `bun run src/index.ts` | Production server |
| `test` | `bun test` | Run tests |
| `db:generate` | `drizzle-kit generate` | Generate migrations |
| `db:migrate` | `bun run src/db/migrate.ts` | Run migrations |
| `db:studio` | `drizzle-kit studio` | Open Drizzle Studio GUI |

### packages/dashboard

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Dev server |
| `build` | `next build` | Production build |
| `test` | `playwright test` | E2E tests |
| `test:integration` | `playwright test --config=playwright.integration.config.ts` | Integration E2E |
| `test:ui` | `playwright test --ui` | Interactive test UI |

### packages/cli

| Script | Command | Description |
|---|---|---|
| Build | `cargo build --release` | Optimized binary |
| Test | `cargo test --all-features` | All tests |
| Lint | `cargo clippy -- -D warnings` | Lints |
| Format | `cargo fmt --check` | Format check |

---

## Troubleshooting

**Dashboard shows no data**
- Ensure the API server is running on the correct port
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify the database has data: `bunx drizzle-kit studio`

**CLI can't find git**
- GitIntel acts as a git proxy. Ensure real `git` is on your PATH
- Run `gitintel --version` to verify installation

**OTel metrics not arriving**
- Check `CLAUDE_CODE_ENABLE_TELEMETRY=1` is set
- Verify the collector is running: `curl http://localhost:13133` (health check)
- Check collector logs: `docker compose logs otel-collector`

**Database connection errors**
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Push schema if tables are missing: `bunx drizzle-kit push`
