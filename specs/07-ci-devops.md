# Spec 07: CI/CD & DevOps Infrastructure

## Monorepo CI Strategy
GitHub Actions with path-based filtering — only build/test what changed.

## GitHub Actions Workflows

### .github/workflows/ci.yml (Main CI)
```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ── CLI (Rust) ──────────────────────────────────────────
  cli:
    name: CLI Tests
    runs-on: ubuntu-latest
    if: |
      contains(github.event.head_commit.modified, 'packages/cli/')
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with: { components: clippy, rustfmt }
      - uses: Swatinem/rust-cache@v2
        with: { workspaces: packages/cli }
      - run: cd packages/cli && cargo fmt --check
      - run: cd packages/cli && cargo clippy -- -D warnings
      - run: cd packages/cli && cargo test --all-features
      - run: cd packages/cli && cargo build --release
      - uses: actions/upload-artifact@v4
        with:
          name: gitintel-linux-amd64
          path: packages/cli/target/release/gitintel

  # ── API Server (Bun) ─────────────────────────────────────
  server:
    name: Server Tests
    runs-on: ubuntu-latest
    if: |
      contains(github.event.head_commit.modified, 'packages/server/')
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: gitintel_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }
      - run: cd packages/server && bun install --frozen-lockfile
      - run: cd packages/server && bun run lint
      - run: cd packages/server && bun test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/gitintel_test

  # ── Dashboard (Next.js) ──────────────────────────────────
  dashboard:
    name: Dashboard Build
    runs-on: ubuntu-latest
    if: |
      contains(github.event.head_commit.modified, 'packages/dashboard/')
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: cd packages/dashboard && bun install --frozen-lockfile
      - run: cd packages/dashboard && bun run lint
      - run: cd packages/dashboard && bun run type-check
      - run: cd packages/dashboard && bun run build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3001
```

### .github/workflows/release.yml (Release & Publish)
```yaml
name: Release
on:
  push:
    tags: ['v*.*.*']

jobs:
  release-cli:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-musl
            artifact: gitintel-linux-amd64
          - os: macos-latest
            target: x86_64-apple-darwin
            artifact: gitintel-macos-amd64
          - os: macos-latest
            target: aarch64-apple-darwin
            artifact: gitintel-macos-arm64
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            artifact: gitintel-windows-amd64.exe
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with: { targets: ${{ matrix.target }} }
      - run: cd packages/cli && cargo build --release --target ${{ matrix.target }}
      - uses: softprops/action-gh-release@v2
        with:
          files: packages/cli/target/${{ matrix.target }}/release/gitintel*

  publish-npm-sdk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: cd packages/sdk && bun install && bun run build
      - run: cd packages/sdk && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  publish-pypi-sdk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: cd packages/sdk-python && pip install build && python -m build
      - uses: pypa/gh-action-pypi-publish@release/v1
        with: { packages-dir: packages/sdk-python/dist }

  docker-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: infra/docker/Dockerfile.server
          push: true
          tags: |
            ghcr.io/gitintel/server:${{ github.ref_name }}
            ghcr.io/gitintel/server:latest
```

### .github/workflows/preview.yml (PR Preview Deployments)
```yaml
name: Preview Deploy
on:
  pull_request:
    paths: ['packages/dashboard/**']

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: cd packages/dashboard && bun install && bun run build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: gitintel-dashboard
          directory: packages/dashboard/.next
```

## Dockerfile Specs

### infra/docker/Dockerfile.cli
```dockerfile
FROM rust:1.82-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY packages/cli/ .
RUN cargo build --release --target x86_64-unknown-linux-musl

FROM alpine:3.20
RUN apk add --no-cache git
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/gitintel /usr/local/bin/
ENTRYPOINT ["gitintel"]
```

### infra/docker/Dockerfile.server
```dockerfile
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY packages/server/package.json packages/server/bun.lockb ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.2-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/server/ .
RUN bun run db:migrate
EXPOSE 3001
CMD ["bun", "run", "start"]
```

### infra/docker/docker-compose.yml
```yaml
version: "3.9"
services:
  api:
    image: ghcr.io/gitintel/server:latest
    env_file: .env
    ports: ["3001:3001"]
    depends_on: [postgres, redis]
    restart: unless-stopped

  web:
    image: ghcr.io/gitintel/dashboard:latest
    env_file: .env
    ports: ["3000:3000"]
    depends_on: [api]

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./infra/docker/otel-config.yaml:/etc/otelcol/config.yaml
    ports: ["4317:4317", "4318:4318"]

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: gitintel
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  clickhouse:
    image: clickhouse/clickhouse-server:24
    volumes:
      - clickhouse_data:/var/lib/clickhouse

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./infra/docker/Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data

volumes:
  postgres_data:
  clickhouse_data:
  redis_data:
  caddy_data:
```

## OTel Collector Config (infra/docker/otel-config.yaml)
```yaml
receivers:
  otlp:
    protocols:
      grpc: { endpoint: "0.0.0.0:4317" }
      http: { endpoint: "0.0.0.0:4318" }

processors:
  batch:
    timeout: 10s

  # Add org_id from API key to all metrics
  attributes:
    actions:
      - key: org_id
        from_attribute: service.name
        action: upsert

exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000
    database: gitintel_otel
    ttl: 90  # days retention

  # Also write to local file for debugging
  file:
    path: /var/log/gitintel/otel.jsonl

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch, attributes]
      exporters: [clickhouse]
```

## Caddyfile (infra/docker/Caddyfile)
```
{$DOMAIN} {
  reverse_proxy /api/* api:3001
  reverse_proxy /* web:3000
  encode gzip
}
```
