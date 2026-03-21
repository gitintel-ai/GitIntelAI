# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
