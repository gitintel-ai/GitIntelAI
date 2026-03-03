# Spec 01: CLI Core — Git Proxy + Attribution Engine

## Overview
The `gitintel` CLI is a Rust binary that acts as a transparent git proxy.
It intercepts git operations to track AI-generated code attribution.

## Implementation: Git Proxy

### How the Proxy Works
1. On install, `gitintel` is symlinked at a path that shadows `git` in shell PATH
2. When any tool calls `git <subcommand>`, it actually calls `gitintel <subcommand>`
3. gitintel runs its own pre-processing, then calls the real git binary
4. gitintel runs post-processing (hooks) after git completes

### Install Script Logic
```bash
# 1. Detect real git binary path
REAL_GIT=$(which git)

# 2. Install gitintel binary to ~/.local/bin/
cp gitintel ~/.local/bin/gitintel

# 3. Create git symlink that shadows real git
ln -sf ~/.local/bin/gitintel ~/.local/bin/git

# 4. Store real git path in gitintel config
echo '{ "git_path": "'$REAL_GIT'" }' > ~/.gitintel/config.json

# 5. Install global git hooks
git config --global core.hooksPath ~/.gitintel/hooks/
```

## Checkpoint Protocol
Coding agents call this BEFORE writing to files:
```bash
gitintel checkpoint \
  --agent "Claude Code" \
  --model "claude-opus-4-5" \
  --session-id "sess_abc123" \
  --file "src/auth/login.ts" \
  --lines "12-45,78-103" \
  --tokens-in 1240 \
  --tokens-out 890 \
  --cost-usd 0.0234
```

Stored in SQLite checkpoints table until commit.

## Post-Commit Hook Logic
```
1. Load all checkpoints since last commit (by session timestamp)
2. For each checkpoint, verify file + line ranges are still valid
3. Compute diff: which checkpoint lines made it into the commit
4. Build Authorship Log (YAML format per CLAUDE.md standard)
5. Write to git notes: git notes --ref=refs/ai/authorship add -m "<yaml>" HEAD
6. Clear consumed checkpoints from SQLite
7. Print adoption summary: "✓ Commit: 45% AI (Claude Opus), 55% Human"
```

## git-ai blame Implementation
```rust
// Extend git blame output with AI attribution
pub fn ai_blame(file: &str, commit: Option<&str>) -> Result<BlameOutput> {
    let blame = run_git_blame(file, commit)?;
    let notes = load_authorship_notes()?;

    for line in blame.lines {
        let attribution = notes.get_line_attribution(
            &line.commit_sha, 
            file, 
            line.line_number
        );
        line.set_attribution(attribution); // AI/Human/Mixed
    }

    render_colored_blame(blame)
}
```

## Config File (~/.gitintel/config.json)
```json
{
  "git_path": "/usr/bin/git",
  "prompt_storage": "local",
  "cloud_sync": {
    "enabled": false,
    "endpoint": "https://app.gitintel.com/api/v1",
    "api_key": ""
  },
  "otel": {
    "enabled": true,
    "port": 4317
  },
  "cost": {
    "currency": "USD",
    "alert_threshold_daily": 10.00
  }
}
```

## Authorship Log Git Notes Standard
Stored at ref: `refs/ai/authorship` with note body attached to commit SHA.

Preservation through git operations:
- **rebase**: re-apply notes to new commit SHAs via post-rewrite hook
- **merge**: combine attribution logs from both parents
- **cherry-pick**: copy attribution note to new commit SHA
- **squash**: merge all attribution logs into single combined log
