---
name: Rust CLI Choice
description: CLI built in Rust for single binary distribution, speed, and cross-platform support
type: reference
---

<!-- L0 -->
CLI built in Rust — single binary, fast, cross-platform (Linux/Mac/Win).

<!-- L1 -->
- Single binary: no runtime deps, easy install via curl | sh
- Speed: git operations are I/O bound but Rust keeps CLI startup instant
- Cross-platform: builds for linux-amd64, linux-arm64, macos-amd64, macos-arm64, windows-amd64
- Dependencies: git2 (libgit2 bindings), rusqlite (SQLite), clap (CLI framework), tokio (async)
- Alternatives: Go (good but less ecosystem for git ops), Node (needs runtime), Python (too slow for git proxy)

<!-- L2 -->
See packages/cli/Cargo.toml for full dependency list
