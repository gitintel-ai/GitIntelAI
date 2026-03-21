# GitIntel

[![CI](https://github.com/gitintel-ai/GitIntelAI/actions/workflows/ci.yml/badge.svg)](https://github.com/gitintel-ai/GitIntelAI/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0--beta-blue)](packages/cli/Cargo.toml)
[![Rust](https://img.shields.io/badge/built%20with-Rust-orange)](https://www.rust-lang.org)

> Do you know how much of your codebase is AI-generated?

GitIntel tracks AI authorship in your git history -- line by line, commit by commit.
**The missing `git blame` for AI code.**

## The Problem

Engineering teams use Claude Code, Cursor, and Copilot daily. But nobody can answer:

- What percentage of our code is AI-written?
- What does AI coding actually cost per sprint?
- Which developers and agents produce the most code?

GitIntel answers all three. Zero workflow change. 100% local.

## Install

```bash
# macOS / Linux
curl -fsSL https://gitintel.com/install | sh

# Homebrew
brew install gitintel-ai/tap/gitintel

# Windows (PowerShell)
irm https://gitintel.com/install.ps1 | iex

# npm (any platform)
npx @gitintel-cli/gitintel
```

<details>
<summary>Build from source</summary>

```bash
git clone https://github.com/gitintel-ai/GitIntelAI.git && cd GitIntelAI
cargo build --release --manifest-path packages/cli/Cargo.toml
cp packages/cli/target/release/gitintel ~/.local/bin/
```

Requires Rust 1.82+ ([rustup.rs](https://rustup.rs)) and Git 2.30+.
</details>

## Quick Start

```bash
cd your-project/
gitintel init          # install hooks, create local DB
gitintel checkpoint \
  --file "src/api.ts" \
  --lines "12-45,78-103"   # --agent and --model are optional
git commit -m "Add auth flow"   # hook fires, attribution recorded
gitintel stats --since 30d      # see the numbers
```

## Zero-Setup Mode

Works on **any** repo. No init required. Detects `Co-Authored-By` trailers and AI agent signatures automatically:

```bash
gitintel scan
```

```
Scanning git history...
  Found 47 commits with AI co-author trailers
  Agents detected: Claude Code (31), Cursor (12), Copilot (4)

AI Adoption: 38.2% of commits  |  ~4,200 lines attributed
```

## gitintel blame

Like `git blame`, but shows who (or what) wrote each line:

```bash
gitintel blame src/api.ts
```

```
AI Blame: src/api.ts
   1 [AI] dc69ba8  Alice Chen  export async function createUser(
   2 [AI] dc69ba8  Alice Chen    data: CreateUserInput,
   3 [AI] dc69ba8  Alice Chen  ) {
  ...
  55 [AI] dc69ba8  Alice Chen  }
  56 [HU] dc69ba8  Alice Chen  // Hand-written validation
  57 [HU] dc69ba8  Alice Chen  function validateEmail(email: string) {
  58 [HU] dc69ba8  Alice Chen    return EMAIL_RE.test(email);
  59 [HU] dc69ba8  Alice Chen  }
```

`[AI]` AI-generated (checkpoint) | `[AI*]` AI-detected (Co-Authored-By) | `[HU]` Human-written | `[MX]` Mixed | `[??]` Unknown

## gitintel cost

```bash
gitintel cost --since 7d
```

```
Cost Summary: last 7d
------------------------------------------------------
Total Spend:     $47.23
Commits:         142
Avg Cost/Commit: $0.33
AI Code Lines:   7,923 / 18,340 (43.2%)
------------------------------------------------------
By Developer:
  alice@acme.com     $18.40  (38 commits, 61.0% AI)
  bob@acme.com       $14.72  (52 commits, 34.5% AI)
  carol@acme.com     $14.11  (52 commits, 40.1% AI)
```

## How It Works

1. You `git commit` as normal -- no workflow change
2. GitIntel's post-commit hook reads pending checkpoints from a local SQLite DB
3. It computes AI vs human line attribution and stores a YAML record in `refs/ai/authorship/<sha>`
4. That ref is a **standard git ref** -- it travels with `git push`, survives clones, and is readable with plain `git notes` even without GitIntel installed

```bash
# Read attribution without gitintel:
git notes --ref=refs/ai/authorship show HEAD
```

No cloud. No vendor lock-in. Your attribution data lives in the repo itself.

## Why GitIntel vs Alternatives

| | GitIntel | usegitai.com | Manual tracking |
|---|:---:|:---:|:---:|
| Works offline | Yes | No | Yes |
| Open standard (git refs) | Yes | No | No |
| All agents supported | Yes | Claude only | N/A |
| Self-hostable | Yes | No | N/A |
| Line-level attribution | Yes | Unknown | No |
| Cost tracking | Yes | No | No |
| Open source | MIT | No | N/A |

## Supported Agents

GitIntel is vendor-agnostic. `--agent` is a free-form string -- any agent works:

- **Claude Code** -- auto-checkpoint via PostToolUse hooks
- **Cursor** -- Co-Authored-By detection via `gitintel scan`
- **GitHub Copilot** -- VS Code extension (planned)
- **OpenAI Codex** -- manual checkpoint
- **Gemini Code Assist** -- manual checkpoint
- **Amazon Q Developer** -- manual checkpoint
- **Windsurf / Codeium** -- manual checkpoint
- **Any custom agent** -- just pass `--agent "your-agent"`

## Enterprise

GitIntel ships with enterprise features from day one: self-hosted deployment via Docker Compose and Kubernetes (Helm), SAML/OIDC SSO (Okta, Azure AD, any SAML 2.0 IdP), SCIM 2.0 user provisioning, RBAC with 5 configurable roles, full audit logging, air-gapped deployment support, and compliance report export for SOC2/ISO 27001 audits.

## Roadmap

- [x] Rust CLI with local SQLite storage
- [x] Line-level AI/Human attribution
- [x] Cost tracking per commit, developer, sprint
- [x] `gitintel blame` with `[AI]`/`[HU]`/`[AI*]` markers
- [x] `gitintel scan` — zero-setup Co-Authored-By detection
- [x] Enterprise SSO, SCIM, RBAC, audit log
- [x] CLAUDE.md context optimizer
- [ ] Pre-built binaries (Linux, macOS, Windows)
- [ ] One-liner install script
- [ ] Homebrew tap
- [ ] Auto-attribution via IDE hooks (Cursor, Copilot)
- [ ] VS Code extension for Copilot
- [ ] Hosted SaaS at app.gitintel.com
- [ ] PR cost annotations (GitHub App, GitLab)
- [ ] Budget forecasting and anomaly detection
- [ ] MCP server for agent-readable attribution

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

## License

MIT -- see [LICENSE](LICENSE).

---

<p align="center">
  <a href="https://gitintel.com">gitintel.com</a> &middot;
  <a href="docs/">Docs</a> &middot;
  <a href="https://github.com/gitintel-ai/GitIntelAI/issues">Issues</a>
</p>
