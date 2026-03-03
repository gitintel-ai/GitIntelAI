# Spec 03: Cost Engine — Token Usage & Development Cost Tracking

## Overview
Track the exact dollar cost of every AI coding session, correlated to git commits,
feature branches, developers, and sprints.

## OTel Integration with Claude Code

### Setup (auto-configured on gitintel init)
```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

### Metrics Received from Claude Code
| Metric                          | Type    | Description                    |
|---------------------------------|---------|--------------------------------|
| claude_code.token.usage         | counter | tokens (input/output/cache)    |
| claude_code.cost.usage          | counter | session cost in USD            |
| claude_code.commit.count        | counter | commits made in session        |
| claude_code.code_edit_tool.decision | counter | accept/reject counts       |

### Session Correlation Algorithm
```
1. Claude Code session starts → OTel session_id generated
2. Developer runs gitintel checkpoint → session_id stored in checkpoints
3. Developer commits → post-commit hook fires
4. Correlate: find OTel session(s) whose time window contains checkpoint timestamps
5. Attribute cost proportionally if multiple commits in one session
6. Write cost_sessions record linked to commit_sha
```

## Model Pricing Tables
```rust
pub struct ModelPricing {
    pub model: String,
    pub input_per_mtok: f64,    // USD per million input tokens
    pub output_per_mtok: f64,   // USD per million output tokens  
    pub cache_write_per_mtok: f64,
    pub cache_read_per_mtok: f64,
}

pub const PRICING: &[ModelPricing] = &[
    // Anthropic Claude
    ModelPricing { model: "claude-opus-4-5",     input: 15.0, output: 75.0, cw: 18.75, cr: 1.50 },
    ModelPricing { model: "claude-sonnet-4-5",   input: 3.0,  output: 15.0, cw: 3.75,  cr: 0.30 },
    ModelPricing { model: "claude-haiku-3-5",    input: 0.80, output: 4.0,  cw: 1.0,   cr: 0.08 },
    // OpenAI
    ModelPricing { model: "gpt-4o",              input: 2.50, output: 10.0, cw: 0.0,   cr: 1.25 },
    ModelPricing { model: "o3",                  input: 10.0, output: 40.0, cw: 0.0,   cr: 2.50 },
    // Google
    ModelPricing { model: "gemini-2.0-flash",    input: 0.075, output: 0.30, cw: 0.0,  cr: 0.0  },
    ModelPricing { model: "gemini-2.5-pro",      input: 1.25, output: 10.0, cw: 0.0,   cr: 0.31 },
];
```

## CLI Commands

### gitintel cost --commit <sha>
```
$ gitintel cost --commit abc1234
───────────────────────────────────────────────
Commit: abc1234 feat: add OAuth2 login
Author: arunoday@example.com  |  2026-03-01
───────────────────────────────────────────────
Agent:    Claude Code (claude-opus-4-5)
Tokens:   Input: 1,240  Output: 890  Cache: 340
Cost:     $0.0234
AI Lines: 45 / 120 (37.5%)
───────────────────────────────────────────────
```

### gitintel cost --since 7d
```
$ gitintel cost --since 7d
Week of Feb 24 – Mar 2, 2026
─────────────────────────────────────────────
Total Spend:    $12.45
├─ Claude Code: $9.23  (74%)
├─ Copilot:     $2.10  (17%)
└─ Gemini CLI:  $1.12  (9%)

Commits:        47
Avg Cost/Commit: $0.26
AI Code Lines:  2,341 / 5,890 (39.7%)
─────────────────────────────────────────────
```

### gitintel cost --branch feat/oauth
Shows total cost to develop a feature branch from branch point to HEAD.

### gitintel cost --developer email@example.com
Shows per-developer cost breakdown.
