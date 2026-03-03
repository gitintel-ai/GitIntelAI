# REAL_CLI_EXAMPLES.md — Verified Terminal Output

**Generated**: 2026-03-03 by Agent-0
**Source**: REPO_CONTEXT.md Section 8 (demo/artifacts/ directory)
**Purpose**: All terminal examples used on the website MUST come from this file. NEVER invent output.

---

## `gitintel init`

**Command**: `gitintel init`
**Output** (verified from source code and GETTING_STARTED.md):

```
Initializing GitIntel...
  ✓ Created ~/.gitintel/
  ✓ Configuration saved
  ✓ Database initialized
  ✓ Installed pre-commit
  ✓ Installed post-commit
  ✓ Installed prepare-commit-msg
  ✓ Installed post-rewrite
  ✓ Installed post-merge
  ✓ Set global hooks path
  ✓ Git hooks installed
  ✓ Created .gitintel/ in repository

GitIntel initialized successfully!

To enable Claude Code telemetry, add to your shell profile:

  export CLAUDE_CODE_ENABLE_TELEMETRY=1
  export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

---

## `gitintel checkpoint`

**Command** (example):
```bash
gitintel checkpoint \
  --agent "Claude Code" \
  --model "claude-sonnet-4-6" \
  --session-id "sess_abc123" \
  --file "src/auth/login.ts" \
  --lines "12-45,78-103" \
  --tokens-in 1240 \
  --tokens-out 890 \
  --cost-usd 0.0234
```

**Output** (verified from demo):
```
✓ Checkpoint recorded: 55 lines in src/api.ts (Claude Code / claude-sonnet-4-6)
  Cost: $0.0312
```

---

## `gitintel hooks run post-commit` (with pending checkpoints)

**Output** (verified from demo):
```
✓ Commit: 177.6% AI (Claude Code) | -77.6% Human | Cost: $0.0778
```

> ⚠️ The >100% AI percentage is a known issue with overlapping checkpoints in the demo. In typical usage with non-overlapping checkpoints, values are 0–100%.

---

## `gitintel blame`

**Command**: `gitintel blame src/utils.ts`
**Output** (actual — lines show `[??]` because initial commit had no checkpoint):
```
AI Blame: src/utils.ts (94 lines)
────────────────────────────────────────────────────────────────────────────────
   1 [??] a2ca9764 Demo Developer /**
   2 [??] a2ca9764 Demo Developer  * utils.ts — Utility functions for GitIntel demo project
```

**Command**: `gitintel blame src/api.ts`
**Output** (actual — lines 1-55 show `[AI]` because checkpoint was recorded):
```
AI Blame: src/api.ts (...)
   1 [AI] dc69ba8d Demo Developer ...
  ...
  55 [AI] dc69ba8d Demo Developer ...
  56 [??] dc69ba8d Demo Developer ...
```

**Attribution legend**:
- `[AI]` — AI-generated (blue)
- `[HU]` — Human-written (green)
- `[MX]` — Mixed (yellow)
- `[??]` — Unknown (no attribution note for this commit)

---

## `gitintel stats`

**Command**: `gitintel stats`
**Output** (actual, text format — from demo/artifacts/stats-output.txt):
```
AI Adoption Stats: Repository
Period: last 30d
────────────────────────────────────────────────────────────
Total Commits:  3
Total Lines:    231

AI-Generated:   [████████████████████████████████████] 119.0%
                275 lines
Human-Written:  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] -19.0%
                -44 lines

Total Cost:     $0.11

By Developer:
────────────────────────────────────────────────────────────
demo@gitintel.test             [████████████████████████] 119.0% (3 commits, $0.11)
```

> ⚠️ The >100% values are a known demo artifact (overlapping checkpoints). Do NOT use these numbers verbatim on marketing pages — use `[output pending — run gitintel stats to verify]` for hero sections, or use the JSON format below.

**Command**: `gitintel stats --format json`
**Output** (actual):
```json
{
  "period": "30d",
  "total_commits": 3,
  "total_lines": 231,
  "ai_lines": 275,
  "human_lines": -44,
  "ai_percentage": 119.04761904761905,
  "total_cost_usd": 0.1064,
  "by_developer": [
    {
      "email": "demo@gitintel.test",
      "commits": 3,
      "ai_lines": 275,
      "human_lines": -44,
      "ai_percentage": 119.04761904761905,
      "cost_usd": 0.1064
    }
  ]
}
```

---

## `gitintel cost`

**Command**: `gitintel cost --since 7d`
**Output** (actual, text format — from demo/artifacts/cost-output.txt):
```
Cost Summary: last 7d
──────────────────────────────────────────────────
Total Spend:     $0.11

Commits:         3
Avg Cost/Commit: $0.04
AI Code Lines:   275 / 231 (119.0%)
──────────────────────────────────────────────────
```

**Command**: `gitintel cost --since 7d --format json`
**Output** (actual):
```json
{
  "period": "7d",
  "commit": null,
  "branch": null,
  "developer": null,
  "total_cost_usd": 0.1064,
  "by_model": [],
  "by_agent": [],
  "commits": 3,
  "ai_lines": 275,
  "total_lines": 231,
  "ai_percentage": 119.04761904761905
}
```

> ⚠️ `by_model` and `by_agent` are always `[]` — not yet implemented.

---

## `gitintel context init`

**Command**: `gitintel context init`
**Output** (representative — not captured in demo):
```
[output pending — run gitintel context init to verify]
```

Use this placeholder on all pages until actual output is captured.

---

## Attribution YAML (git notes)

**Command**: `git notes --ref=refs/ai/authorship show HEAD`
**Output** (actual from demo/artifacts/attribution-payload.txt):
```yaml
schema_version: gitintel/1.0.0
commit: dc69ba8dd77e12e9ba306be56de72d074937bf16
author: demo@gitintel.test
timestamp: 2026-03-03T09:29:33.399118500+00:00
agent_sessions:
- agent: Claude Code
  model: claude-sonnet-4-6
  tokens:
    input: 3880
    output: 2640
    cache_read: 0
    cache_write: 0
  cost_usd: 0.0778
  transcript_ref: null
  files:
    src/api.ts:
      ai_lines:
      - - 1
        - 55
      human_lines: []
    src/auth.ts:
      ai_lines:
      - - 1
        - 50
      human_lines: []
summary:
  total_lines: 107
  ai_lines: 190
  human_lines: -83
  ai_pct: 177.57009345794393
  total_cost_usd: 0.0778
```

> ⚠️ The schema does NOT include `session_id`, `vendor`, or `calculated_by` fields despite their appearance in some docs. Use the YAML above as the canonical example.

---

## `gitintel --version`

```
gitintel 0.1.0
```

---

## Placeholder for Unverified Commands

For any command not listed above, use this exact text on the website:

```
[output pending — run gitintel <cmd> to verify]
```

Do NOT invent output.
