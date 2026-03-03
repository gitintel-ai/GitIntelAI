# Spec 08: Agent SDK — TypeScript & Python

## Overview
The GitIntel Agent SDK enables any coding agent (custom scripts, Claude Code hooks,
Cursor extensions, n8n/Make workflows) to report checkpoints and sessions to gitintel.

## TypeScript SDK (`@gitintel/sdk`)

### Installation
```bash
npm install @gitintel/sdk
# or
bun add @gitintel/sdk
```

### Core API
```typescript
// packages/sdk/src/index.ts
export interface GitIntelConfig {
  endpoint?: string;           // default: "http://localhost:4317" (local gitintel)
  apiKey?: string;             // for cloud/self-hosted sync
  agent: string;               // "Claude Code" | "Cursor" | "Custom"
  model: string;               // "claude-opus-4-5"
  vendor: "anthropic" | "openai" | "google" | "github" | "other";
  projectPath?: string;        // auto-detected if not set
  sessionId?: string;          // auto-generated UUID if not set
}

export class GitIntelClient {
  constructor(config: GitIntelConfig) {}

  // Report that AI generated specific lines in a file
  async checkpoint(params: {
    file: string;
    lineStart: number;
    lineEnd: number;
    tokensIn?: number;
    tokensOut?: number;
    cacheRead?: number;
    cacheWrite?: number;
    costUsd?: number;
    transcriptRef?: string;
  }): Promise<void> {}

  // Report multiple files in one call
  async checkpointBatch(params: CheckpointParams[]): Promise<void> {}

  // End the current session (auto-called on process exit)
  async endSession(params?: {
    totalTokensIn?: number;
    totalTokensOut?: number;
    totalCostUsd?: number;
  }): Promise<void> {}

  // Get current attribution stats for a file
  async getFileAttribution(file: string): Promise<FileAttribution> {}

  // Get cost summary for current project
  async getCostSummary(since?: string): Promise<CostSummary> {}
}
```

### Usage — Custom Coding Agent
```typescript
import { GitIntelClient } from "@gitintel/sdk";

const gitintel = new GitIntelClient({
  agent: "My Custom Agent",
  model: "claude-opus-4-5",
  vendor: "anthropic",
});

// After AI generates code in src/auth/login.ts lines 12-45
await gitintel.checkpoint({
  file: "src/auth/login.ts",
  lineStart: 12,
  lineEnd: 45,
  tokensIn: 1240,
  tokensOut: 890,
  costUsd: 0.0234,
});

// Developer commits → gitintel post-commit hook picks this up
```

### Usage — Claude Code Hooks (CLAUDE.md hooks)
Add to your `.claude/settings.json`:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{
          "type": "command",
          "command": "npx gitintel-hook report-edit"
        }]
      }
    ]
  }
}
```

The `gitintel-hook` CLI reads Claude Code's hook environment variables:
```typescript
// packages/sdk/src/claude-code-hook.ts
// Claude Code PostToolUse hook provides these env vars:
const toolName = process.env.CLAUDE_TOOL_NAME;    // "Write"
const filePath = process.env.CLAUDE_TOOL_FILE;    // "src/auth/login.ts"
const sessionId = process.env.CLAUDE_SESSION_ID;

// Read tool output from stdin (JSON)
const hookData = JSON.parse(await readStdin());

// Extract line ranges from the diff
const lineRanges = extractLineRanges(hookData.output);

// Report to gitintel
await client.checkpoint({
  file: filePath,
  lineStart: lineRanges[0],
  lineEnd: lineRanges[1],
  // tokens/cost read from OTel separately
});
```

### Usage — n8n / Make.com Workflow Integration
```typescript
// packages/sdk/src/http-api.ts
// Expose as simple REST for n8n HTTP nodes

// POST http://localhost:4317/v1/checkpoint
// Body: { file, lineStart, lineEnd, tokensIn, tokensOut, costUsd }

// GET http://localhost:4317/v1/stats?period=7d
// Returns: { aiPct, totalCost, commits, topDeveloper }
```

n8n node configuration:
```json
{
  "node": "HTTP Request",
  "method": "POST",
  "url": "http://localhost:4317/v1/checkpoint",
  "body": {
    "file": "={{ $json.file }}",
    "lineStart": "={{ $json.lineStart }}",
    "lineEnd": "={{ $json.lineEnd }}",
    "costUsd": "={{ $json.usage.cost }}"
  }
}
```

---

## Python SDK (`gitintel-sdk`)

### Installation
```bash
pip install gitintel-sdk
# or
uv add gitintel-sdk
```

### Core API
```python
# packages/sdk-python/gitintel/__init__.py
from gitintel import GitIntelClient, GitIntelConfig

client = GitIntelClient(
    agent="Claude Code",
    model="claude-opus-4-5", 
    vendor="anthropic",
    endpoint="http://localhost:4317",  # optional
    api_key=None,                       # optional
)

# Sync checkpoint
client.checkpoint(
    file="src/main.py",
    line_start=10,
    line_end=45,
    tokens_in=1240,
    tokens_out=890,
    cost_usd=0.0234,
)

# Async checkpoint
await client.checkpoint_async(...)

# Context manager for sessions
with client.session() as session:
    session.checkpoint(file="src/main.py", line_start=1, line_end=50)
    session.checkpoint(file="src/utils.py", line_start=1, line_end=20)
# session.end() auto-called on exit
```

### Usage — LangChain / LangGraph Callback
```python
from gitintel.callbacks import GitIntelCallbackHandler

handler = GitIntelCallbackHandler(
    agent="LangGraph Agent",
    model="claude-opus-4-5",
)

# Add to any LangChain chain
llm = ChatAnthropic(model="claude-opus-4-5", callbacks=[handler])
```

The callback automatically:
- Captures token usage from LLM responses
- Reports checkpoints via SDK
- Tracks session start/end

### Usage — Agentic Framework Hook (generic)
```python
from gitintel import GitIntelClient

class GitIntelAgentHook:
    """Drop-in hook for any custom agent framework."""

    def __init__(self, client: GitIntelClient):
        self.client = client

    def on_file_write(self, file: str, start: int, end: int, usage: dict):
        self.client.checkpoint(
            file=file,
            line_start=start,
            line_end=end,
            tokens_in=usage.get("input_tokens"),
            tokens_out=usage.get("output_tokens"),
            cost_usd=usage.get("cost"),
        )

    def on_session_end(self, total_usage: dict):
        self.client.end_session(
            total_tokens_in=total_usage.get("input_tokens"),
            total_tokens_out=total_usage.get("output_tokens"),
            total_cost_usd=total_usage.get("total_cost"),
        )
```

---

## SDK Package Structure

### TypeScript (`packages/sdk/`)
```
packages/sdk/
├── src/
│   ├── index.ts           ← main client export
│   ├── claude-code-hook.ts ← Claude Code PostToolUse hook
│   ├── http-api.ts        ← lightweight HTTP server for n8n/Make
│   ├── types.ts           ← shared TypeScript types
│   └── utils/
│       ├── tokenizer.ts   ← tiktoken-compatible line counter
│       └── correlate.ts   ← OTel session correlator
├── package.json           ← name: "@gitintel/sdk"
└── tsconfig.json
```

### Python (`packages/sdk-python/`)
```
packages/sdk-python/
├── gitintel/
│   ├── __init__.py        ← main client export
│   ├── callbacks.py       ← LangChain callback handler
│   ├── async_client.py    ← async variant
│   └── types.py           ← Pydantic models
├── pyproject.toml         ← name: "gitintel-sdk"
└── tests/
    ├── test_client.py
    └── test_callbacks.py
```

## SDK Test Harness
```bash
# Simulate a full checkpoint → commit → attribution cycle in tests
gitintel test simulate \
  --agent "Test Agent" \
  --file tests/fixtures/sample.ts \
  --lines "1-50" \
  --tokens-in 500 \
  --tokens-out 200 \
  --commit

# Output:
# ✓ Checkpoint recorded
# ✓ Post-commit hook fired
# ✓ Attribution log written to git notes
# ✓ Cost session: $0.0045
# ✓ Stats: 50/50 lines AI (100%) | $0.0045
```
