# Spec 02: Attribution Open Standard — gitintel/1.0.0

## Overview
The GitIntel Attribution Standard is a git-native, vendor-neutral open format for
recording AI code authorship. It is fully backward-compatible with the git-ai v3
standard and extends it with cost and model metadata.

## Storage Mechanism
- Stored in git notes at ref: `refs/ai/authorship`
- Note is attached to commit SHA (not tree, not blob)
- Notes travel with `git push` / `git fetch` when configured:
  ```bash
  git config --global push.followTags true
  git config --add remote.origin.fetch '+refs/ai/authorship/*:refs/ai/authorship/*'
  git config --add remote.origin.push 'refs/ai/authorship/*'
  ```
- Notes are NEVER part of commit history — safe to strip without affecting code

## Schema v1.0.0 (Full)
```yaml
schema_version: gitintel/1.0.0         # REQUIRED
commit: <40-char-sha>                   # REQUIRED
repo: <remote-origin-url>              # OPTIONAL
author_email: dev@example.com          # REQUIRED
authored_at: 2026-03-02T22:30:00Z     # REQUIRED (ISO 8601, UTC)

# One entry per AI session that contributed to this commit
agent_sessions:
  - session_id: sess_abc123            # REQUIRED
    agent: "Claude Code"               # REQUIRED (agent name)
    model: "claude-opus-4-5"           # REQUIRED (model identifier)
    vendor: "anthropic"                # REQUIRED: anthropic|openai|google|github|other

    tokens:
      input: 1240                      # prompt tokens
      output: 890                      # completion tokens
      cache_read: 340                  # tokens read from cache
      cache_write: 200                 # tokens written to cache

    cost:
      usd: 0.0234                      # REQUIRED if tokens known
      calculated_by: "gitintel/1.0.0"  # tool that calculated cost
      pricing_ref: "claude-opus-4-5@2026-03-01" # pricing snapshot used

    transcript_ref: null               # SHA of transcript note (optional)
    session_started: 2026-03-02T22:10:00Z
    session_ended:   2026-03-02T22:28:00Z

    # Per-file line attribution
    files:
      "src/auth/login.ts":
        total_lines: 120
        ai_ranges: [[12, 45], [78, 103]]      # inclusive line numbers
        human_ranges: [[1, 11], [46, 77], [104, 120]]
        mixed_ranges: []                        # human-edited AI lines
      "src/auth/types.ts":
        total_lines: 34
        ai_ranges: [[1, 34]]
        human_ranges: []
        mixed_ranges: []

# Aggregate summary (computed by CLI, not manually set)
summary:
  total_files_changed: 2
  total_lines_added: 154
  ai_lines: 92
  human_lines: 62
  mixed_lines: 0
  ai_pct: 59.7
  human_pct: 40.3
  total_cost_usd: 0.0234
  primary_agent: "Claude Code"
  primary_model: "claude-opus-4-5"
```

## Schema v0.1 Compatibility (git-ai standard)
When gitintel reads a note with `schema_version: authorship/0.0.1` (git-ai format),
it transparently upgrades to v1.0.0 in memory. When writing, always write v1.0.0.

Migration mapping:
```
git-ai "author" string → gitintel "agent" string
git-ai line ranges (arrays) → gitintel ai_ranges
git-ai has no cost data → gitintel cost section added as null
```

## Multi-Agent Commits
When multiple agents contributed (e.g., Claude Code + Copilot in same session):
```yaml
agent_sessions:
  - session_id: sess_abc
    agent: "Claude Code"
    files:
      "src/api.ts":
        ai_ranges: [[1, 50]]
  - session_id: sess_def
    agent: "GitHub Copilot"
    files:
      "src/api.ts":
        ai_ranges: [[55, 80]]
```
Line range conflicts are resolved: last-write wins (by session_ended timestamp).

## Validation Rules
```rust
pub fn validate_attribution(log: &AttributionLog) -> Result<(), Vec<ValidationError>> {
    // R1: schema_version must match "gitintel/1.0.0" or "authorship/0.0.1"
    // R2: commit SHA must be 40 hex chars
    // R3: ai_ranges + human_ranges + mixed_ranges must cover all file lines (no gaps, no overlaps)
    // R4: cost.usd must be >= 0
    // R5: session_ended >= session_started
    // R6: total ai_lines + human_lines + mixed_lines == summary.total_lines_added
}
```

## CLI Tooling
```bash
# View attribution for any commit
gitintel attribution show <sha>
gitintel attribution show HEAD

# Export all attributions as NDJSON
gitintel attribution export --format ndjson > attributions.ndjson

# Verify attribution integrity
gitintel attribution verify <sha>

# Strip all attribution notes (e.g., before open-sourcing)
gitintel attribution strip --all

# Show attribution diff between two commits
gitintel attribution diff <sha1> <sha2>
```

## Interoperability
Any tool can read GitIntel attribution notes:
```bash
# Read raw attribution for HEAD commit
git notes --ref=refs/ai/authorship show HEAD

# List all commits with attribution notes
git notes --ref=refs/ai/authorship list
```
