# Contributing to GitIntel

Thanks for your interest in contributing. This guide covers the basics.

## Getting Started

1. Fork the repo and clone your fork
2. Install Rust 1.82+ via [rustup.rs](https://rustup.rs)
3. Build and test the CLI:
   ```bash
   cargo build --manifest-path packages/cli/Cargo.toml
   cargo test --manifest-path packages/cli/Cargo.toml
   ```

## Branch Naming

Use the format `type/short-description`:

- `feat/auto-checkpoint` -- new feature
- `fix/blame-line-offset` -- bug fix
- `docs/install-guide` -- documentation
- `refactor/storage-layer` -- code restructuring
- `test/cost-engine` -- adding tests

## Code Style

### Rust (packages/cli)

- Run `cargo fmt` before committing
- Run `cargo clippy` and fix all warnings
- No `unwrap()` in library code -- use proper error handling

### TypeScript (packages/core, server, dashboard)

- Run `npx biome check --write .` before committing

## Testing

```bash
# Rust CLI
cargo test --manifest-path packages/cli/Cargo.toml
cargo clippy --manifest-path packages/cli/Cargo.toml -- -D warnings

# TypeScript
bun test
```

Every new feature needs tests. Every bug fix needs a regression test.

## Pull Request Process

1. Create a feature branch from `main`
2. Make focused, atomic commits
3. Update docs if behavior changes
4. Ensure CI passes (tests, clippy, fmt)
5. Open a PR against `main` with a clear description
6. Link any related issues

## Commit Messages

```
feat: add automatic checkpoint for Cursor sessions
fix: correct line offset in blame output
docs: update install instructions for Windows
```

## Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md). Include:

- GitIntel version (`gitintel --version`)
- OS and architecture
- Steps to reproduce
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
