# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `pricing` module — centralizes AI-model pricing, loads overrides from `~/.gitintel/pricing.json` and `<repo>/.gitintel/pricing.json` at runtime. Defaults refreshed to reflect 2026-04 Anthropic and OpenAI rates.
- `pricing::estimate_cost_typed` — separate input/output rate handling for callers that track both.
- `pricing::estimate_cost_combined` — historical combined-total helper with a 70/30 input/output split assumption, used by the CLI.
- `cost` command now prints an accuracy disclaimer (tiktoken approximation + pricing snapshot date) so estimates are read as estimates.
- Sync contract section in `docs/ARCHITECTURE.md` — explicit direction and authority for git notes / SQLite / PostgreSQL / ClickHouse.
- Release-scope table in README clarifying CLI is GA and server/dashboard are Preview at v0.1.

### Changed

- `context::token_counter::estimate_cost` now delegates to the pricing module instead of using a hardcoded `match` table. Old call sites keep working; no breaking change.
- README "Enterprise" section now marks SCIM/RBAC/audit components as Preview until load-tested.

### Notes

- No CLI flag or config changes. Existing users upgrade without action.
- Run `cargo test pricing::` to verify the pricing module after merge.

## [0.1.0-beta] - 2026-03-21

### Added

- Rust CLI with local SQLite storage for attribution data
- `gitintel init` -- install git hooks and create local database
- `gitintel checkpoint` -- record AI authorship for file line ranges
- `gitintel scan` -- zero-setup detection of `Co-Authored-By` trailers and AI agent signatures
- `gitintel blame` -- line-level `[AI]`/`[HU]`/`[MX]` attribution display
- `gitintel stats` -- AI adoption metrics with time range filtering
- `gitintel cost` -- per-developer and per-agent cost tracking via OpenTelemetry
- `gitintel context` -- CLAUDE.md context file optimizer
- Attribution storage in standard git refs (`refs/ai/authorship/<sha>`)
- Post-commit hook for automatic attribution recording
- Support for all AI coding agents via `--agent` flag
- Enterprise features: SAML/OIDC SSO, SCIM 2.0, RBAC, audit logging
- Docker Compose and Kubernetes (Helm) deployment support

[0.1.0-beta]: https://github.com/gitintel-ai/GitIntelAI/releases/tag/v0.1.0-beta
