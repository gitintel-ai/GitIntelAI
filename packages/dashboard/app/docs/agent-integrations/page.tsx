import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Agent Integrations — GitIntel AI Docs",
  description: "How to integrate GitIntel with Claude Code, Cursor, GitHub Copilot, Codex, and Gemini CLI.",
};

export default function AgentIntegrationsPage() {
  return (
    <article className="max-w-none">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-3">Documentation</Badge>
        <h1 className="text-3xl font-bold tracking-tight">Agent Integrations</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          GitIntel works with any AI coding agent. Here&apos;s how to integrate with the most popular ones.
        </p>
      </div>

      {/* Claude Code */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-1">Claude Code</h2>
        <p className="text-muted-foreground text-sm mb-4">
          GitIntel integrates with Claude Code in three ways: hook-based checkpoints, OTel cost capture, or both.
        </p>

        <div className="mb-4">
          <p className="font-semibold text-sm mb-2">Option A: Hook-based (automatic line attribution)</p>
          <p className="text-sm text-muted-foreground mb-2">
            Add this to your project&apos;s <code className="rounded bg-muted px-1 font-mono text-xs">CLAUDE.md</code>:
          </p>
          <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre">{`## GitIntel Integration

After writing or significantly modifying any file, call:

\`\`\`bash
gitintel checkpoint \\
  --agent "Claude Code" \\
  --model "$CLAUDE_MODEL" \\
  --session-id "$CLAUDE_SESSION_ID" \\
  --file "$FILE_PATH" \\
  --lines "$LINE_RANGE"
\`\`\``}</div>
        </div>

        <div className="mb-4">
          <p className="font-semibold text-sm mb-2">Option B: OTel (automatic cost tracking)</p>
          <p className="text-sm text-muted-foreground mb-2">
            Claude Code exports native OpenTelemetry metrics. Point them at GitIntel&apos;s local collector:
          </p>
          <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre">{`# Add to your shell profile (~/.bashrc, ~/.zshrc)
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc`}</div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          <strong>Recommended:</strong> Use OTel for automatic cost capture + manual checkpoints for line-level attribution. Together they give you the full picture.
        </div>
      </section>

      {/* Cursor */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-1">Cursor</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Cursor does not yet have a native telemetry export. Use the checkpoint command from Cursor&apos;s terminal.
        </p>
        <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre">{`# Run in Cursor's integrated terminal after an AI edit
gitintel checkpoint \\
  --agent "Cursor" \\
  --model "claude-3-5-sonnet" \\
  --session-id "cursor-$(date +%s)" \\
  --file "src/components/Button.tsx" \\
  --lines "1-80"`}</div>
      </section>

      {/* GitHub Copilot */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-1">GitHub Copilot</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Copilot operates inline and does not expose session IDs or line ranges natively.
          The best approach is to checkpoint files at commit time rather than per-suggestion.
        </p>
        <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre">{`# After a Copilot-heavy session, before committing:
gitintel checkpoint \\
  --agent "GitHub Copilot" \\
  --model "copilot-gpt-4" \\
  --session-id "copilot-$(git rev-parse --short HEAD)" \\
  --file "src/utils/formatDate.ts" \\
  --lines "1-45"`}</div>
        <p className="text-sm text-muted-foreground mt-3">
          <strong>Coming soon:</strong> A VS Code extension that calls <code className="rounded bg-muted px-1 font-mono text-xs">gitintel checkpoint</code> automatically on each Copilot suggestion accept.
        </p>
      </section>

      {/* Gemini CLI */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-1">Gemini CLI</h2>
        <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre">{`gitintel checkpoint \\
  --agent    "Gemini CLI" \\
  --model    "gemini-2.5-pro" \\
  --session-id "gemini-$(date +%Y%m%d-%H%M%S)" \\
  --file     "src/api/handler.go" \\
  --lines    "25-100"`}</div>
      </section>

      {/* Any agent */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-1">Any Other Agent</h2>
        <p className="text-muted-foreground text-sm mb-4">
          For any AI tool (ChatGPT, local models, etc.), the pattern is the same.
          The checkpoint just needs to be called before <code className="rounded bg-muted px-1 font-mono text-xs">git commit</code>.
        </p>
        <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre">{`gitintel checkpoint \\
  --agent    "My Agent" \\
  --model    "my-model-name" \\
  --session-id "session-$(date +%s)" \\
  --file     "src/main.py" \\
  --lines    "10-50"`}</div>
      </section>

      {/* Supported agents table */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Supported Agents</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-semibold">Agent</th>
                <th className="py-2 text-left font-semibold">Line Attribution</th>
                <th className="py-2 text-left font-semibold">Cost Tracking</th>
                <th className="py-2 text-left font-semibold">Automatic</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Claude Code", "✓", "✓ (OTel native)", "With CLAUDE.md hook"],
                ["Cursor", "✓", "Manual only", "Manual"],
                ["GitHub Copilot", "✓", "Manual only", "Manual (VS Code ext soon)"],
                ["Codex", "✓", "Manual only", "Manual"],
                ["Gemini CLI", "✓", "Manual only", "Manual"],
                ["Any agent", "✓", "Manual only", "Manual"],
              ].map(([agent, lines, cost, auto]) => (
                <tr key={agent} className="border-b">
                  <td className="py-2 font-medium">{agent}</td>
                  <td className="py-2 text-muted-foreground">{lines}</td>
                  <td className="py-2 text-muted-foreground">{cost}</td>
                  <td className="py-2 text-muted-foreground">{auto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
