import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works — GitIntel AI Docs",
  description:
    "Learn how GitIntel AI tracks AI-generated code at the line level using git notes, git hooks, and the open attribution standard.",
};

export default function HowItWorksPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-3">Documentation</Badge>
        <h1 className="text-3xl font-bold tracking-tight">How It Works</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          GitIntel tracks AI authorship at the line level without changing your workflow.
          Here&apos;s the complete picture — from AI agent to git notes.
        </p>
      </div>

      {/* Architecture Diagram */}
      <h2 className="text-xl font-semibold">Architecture Overview</h2>
      <div className="not-prose rounded-lg border bg-muted p-4 font-mono text-xs leading-relaxed">
        <pre>{`┌────────────┐  checkpoint   ┌──────────────────────────────┐
│ Claude Code│ ────────────► │  gitintel CLI                │
│ Cursor     │               │  ┌─────────────────────────┐ │
│ Copilot    │               │  │ SQLite (local)           │ │
└────────────┘               │  │  checkpoints table       │ │
                             │  │  attributions table      │ │
┌────────────┐  git commit   │  │  cost_sessions table     │ │
│ Developer  │ ────────────► │  └─────────────────────────┘ │
└────────────┘               └──────────────┬───────────────┘
                                            │ post-commit hook
                                            │ writes git notes
                                            ▼
                             refs/ai/authorship/<commit-sha>
                             (YAML, travels with git push/fetch)`}</pre>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        No database servers. No accounts required. No changes to how you write or commit code.
      </p>

      {/* Key Idea */}
      <h2 className="text-xl font-semibold mt-8">The Key Idea</h2>
      <p>
        Your AI coding agent calls <code>gitintel checkpoint</code> before writing each file, recording
        which lines it wrote and which model/session produced them. When you run <code>git commit</code>,
        the post-commit hook automatically assembles these checkpoints into an Authorship Log and stores
        it in git notes — a standard git mechanism that travels with your repo on every push and fetch.
      </p>

      {/* Step-by-step */}
      <h2 className="text-xl font-semibold mt-8">Step-by-Step Breakdown</h2>

      <div className="not-prose space-y-6 mt-4">
        <div className="relative pl-6 before:absolute before:left-2 before:top-3 before:h-full before:w-px before:bg-border">
          <div className="absolute left-0 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Checkpoint Recording</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The AI agent (or you manually) calls <code className="rounded bg-muted px-1 font-mono text-xs">gitintel checkpoint</code> with
              the agent name, model, session ID, file path, and the line ranges it wrote. Checkpoints are stored
              in a local SQLite database and are never committed to git.
            </p>
          </div>
        </div>

        <div className="relative pl-6 before:absolute before:left-2 before:top-3 before:h-full before:w-px before:bg-border">
          <div className="absolute left-0 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Post-Commit Hook Fires</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              When you run <code className="rounded bg-muted px-1 font-mono text-xs">git commit</code>, the post-commit hook
              automatically executes. It loads all pending checkpoints for the current session, verifies the
              line ranges against the committed diff, and builds an Authorship Log.
            </p>
          </div>
        </div>

        <div className="relative pl-6 before:absolute before:left-2 before:top-3 before:h-full before:w-px before:bg-border">
          <div className="absolute left-0 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">3</div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Authorship Log Written to Git Notes</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The hook writes YAML attribution data to <code className="rounded bg-muted px-1 font-mono text-xs">refs/ai/authorship/&lt;commit-sha&gt;</code> using
              standard git notes. Any lines not covered by a checkpoint are attributed as Human.
            </p>
            <div className="mt-3 rounded bg-muted p-3 font-mono text-xs">
              <p className="text-muted-foreground"># Written automatically by the post-commit hook:</p>
              <p>schema_version: gitintel/1.0.0</p>
              <p>commit: b7d1e94f3a2c...</p>
              <p>author_email: alice@acme.com</p>
              <p>summary:</p>
              <p>  ai_lines: 60</p>
              <p>  human_lines: 60</p>
              <p>  ai_pct: 50.0</p>
              <p>  total_cost_usd: 0.0234</p>
            </div>
          </div>
        </div>

        <div className="relative pl-6">
          <div className="absolute left-0 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">4</div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Attribution Travels with the Repo</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Git notes sync alongside your code when you configure your remote. Team members running
              <code className="rounded bg-muted px-1 font-mono text-xs"> gitintel blame</code> or{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">gitintel stats</code> see
              attribution for all commits — not just their own.
            </p>
          </div>
        </div>
      </div>

      {/* Attribution Standard */}
      <h2 className="text-xl font-semibold mt-10">The Attribution Standard</h2>
      <p>
        Attribution data is stored as YAML in git notes at <code>refs/ai/authorship/&lt;sha&gt;</code>.
        This is an open standard — any tool can read it using plain <code>git notes</code>.
        No GitIntel installation is required to consume the data.
      </p>
      <div className="not-prose rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">
        <pre>{`schema_version: gitintel/1.0.0
commit: b7d1e94f3a2c8e91d0f4b6a2c3e5d7f9b1a3c5e7
author_email: alice@acme.com
authored_at: 2026-03-03T14:30:00Z

agent_sessions:
  - session_id: sess_abc123
    agent: "Claude Code"
    model: "claude-sonnet-4-6"
    vendor: anthropic
    tokens:
      input: 1240
      output: 890
      cache_read: 340
      cache_write: 200
    cost:
      usd: 0.0234
    files:
      "src/auth/login.ts":
        total_lines: 120
        ai_ranges: [[12, 45], [78, 103]]
        human_ranges: [[1, 11], [46, 77], [104, 120]]

summary:
  total_lines_added: 120
  ai_lines: 60
  human_lines: 60
  ai_pct: 50.0
  total_cost_usd: 0.0234
  primary_agent: "Claude Code"
  primary_model: "claude-sonnet-4-6"`}</pre>
      </div>

      {/* Cost Tracking */}
      <h2 className="text-xl font-semibold mt-10">Cost Tracking via OpenTelemetry</h2>
      <p>
        Claude Code exports native OpenTelemetry metrics. GitIntel runs a local OTel collector
        on port 4317 that captures cost and token data automatically — no manual checkpoints required
        for cost tracking.
      </p>
      <div className="not-prose rounded-lg bg-muted p-4 font-mono text-sm">
        <p className="text-muted-foreground"># Add to your shell profile</p>
        <p>export CLAUDE_CODE_ENABLE_TELEMETRY=1</p>
        <p>export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317</p>
        <p>export OTEL_EXPORTER_OTLP_PROTOCOL=grpc</p>
      </div>
      <div className="not-prose overflow-x-auto mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left font-semibold">Metric</th>
              <th className="py-2 text-left font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["claude_code.token.usage", "Input, output, and cache tokens per session"],
              ["claude_code.cost.usage", "USD cost per session"],
              ["claude_code.commit.count", "Number of commits in the session"],
              ["claude_code.code_edit_tool.decision", "Accept/reject counts for code edits"],
            ].map(([metric, desc]) => (
              <tr key={metric} className="border-b">
                <td className="py-2 font-mono text-xs">{metric}</td>
                <td className="py-2 text-muted-foreground">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Data flow */}
      <h2 className="text-xl font-semibold mt-10">Data Storage</h2>
      <div className="not-prose grid gap-4 sm:grid-cols-2 mt-4">
        <div className="rounded-lg border p-4">
          <p className="font-semibold text-sm">Local (SQLite)</p>
          <p className="mt-1 text-xs text-muted-foreground">All tracking data stored at <code className="font-mono">~/.gitintel/gitintel.db</code></p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>• <code className="font-mono">checkpoints</code> — pending AI session data</li>
            <li>• <code className="font-mono">attributions</code> — committed attribution records</li>
            <li>• <code className="font-mono">cost_sessions</code> — OTel cost data</li>
            <li>• <code className="font-mono">memory</code> — key-value memory store</li>
          </ul>
        </div>
        <div className="rounded-lg border p-4">
          <p className="font-semibold text-sm">Git Notes (portable)</p>
          <p className="mt-1 text-xs text-muted-foreground">Attribution YAML stored in standard git notes</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>• Stored at <code className="font-mono">refs/ai/authorship/&lt;sha&gt;</code></li>
            <li>• Syncs via <code className="font-mono">git push/fetch</code></li>
            <li>• Open standard — readable without GitIntel</li>
            <li>• Works with GitHub, GitLab, Bitbucket</li>
          </ul>
        </div>
      </div>

      {/* Next steps */}
      <h2 className="text-xl font-semibold mt-10">Next Steps</h2>
      <div className="not-prose grid gap-3 sm:grid-cols-2">
        <Link href="/docs/getting-started" className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted">
          <div>
            <p className="font-medium">Getting Started</p>
            <p className="text-sm text-muted-foreground">Install and set up your first repo</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
        </Link>
        <Link href="/docs/commands" className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted">
          <div>
            <p className="font-medium">Commands Reference</p>
            <p className="text-sm text-muted-foreground">All CLI commands and flags</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
        </Link>
      </div>
    </article>
  );
}
