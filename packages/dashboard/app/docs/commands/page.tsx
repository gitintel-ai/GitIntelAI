import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Commands Reference — GitIntel AI Docs",
  description: "Full reference for all gitintel CLI commands: blame, stats, cost, context, memory, sync, hooks, config.",
};

const commands = [
  {
    name: "gitintel init",
    description: "Initialize GitIntel in a repository. Installs git hooks and creates local config.",
    usage: "gitintel init [--force]",
    flags: [
      { flag: "--force", description: "Overwrite existing config and hooks" },
    ],
    example: `cd your-project
gitintel init`,
  },
  {
    name: "gitintel checkpoint",
    description: "Record an AI agent's contribution to a file. Call this before git commit.",
    usage: "gitintel checkpoint --agent <name> --model <id> --session-id <id> --file <path> --lines <ranges>",
    flags: [
      { flag: "--agent", description: "Agent name: \"Claude Code\", \"Cursor\", \"Copilot\", etc." },
      { flag: "--model", description: "Model ID: \"claude-sonnet-4-6\", \"gpt-4o\", etc." },
      { flag: "--session-id", description: "Unique ID for this coding session" },
      { flag: "--file", description: "File path relative to repo root" },
      { flag: "--lines", description: "Line ranges written by the agent, e.g. \"12-45,78-103\"" },
      { flag: "--tokens-in", description: "Input tokens consumed (optional)" },
      { flag: "--tokens-out", description: "Output tokens produced (optional)" },
      { flag: "--cost-usd", description: "Cost in USD (optional, overrides token calc)" },
      { flag: "--transcript-ref", description: "SHA or URL of session transcript (optional)" },
    ],
    example: `gitintel checkpoint \\
  --agent    "Claude Code" \\
  --model    "claude-sonnet-4-6" \\
  --session-id "sess_abc123" \\
  --file     "src/auth/login.ts" \\
  --lines    "12-45,78-103" \\
  --tokens-in  1240 \\
  --tokens-out  890`,
  },
  {
    name: "gitintel blame",
    description: "Show line-level AI/Human attribution for a file. Extends git blame.",
    usage: "gitintel blame <file> [--commit <sha>] [--ai-only | --human-only]",
    flags: [
      { flag: "--commit <sha>", description: "Show attribution from a specific commit" },
      { flag: "--ai-only", description: "Show only AI-generated lines" },
      { flag: "--human-only", description: "Show only human-written lines" },
    ],
    example: `gitintel blame src/auth/login.ts
gitintel blame src/auth/login.ts --ai-only`,
    output: `AI Blame: src/auth/login.ts (120 lines)
────────────────────────────────────────────────────
   1 [HU] a3f8c21 Alice Chen   import { Request } from 'express'
  12 [AI] b7d1e94 Alice Chen   export async function login(...) {
  13 [AI] b7d1e94 Alice Chen     const { email, password } = req.body
  46 [HU] c2a9b11 Alice Chen     await auditLog.record('login_attempt', ...)

Legend: [AI] = AI-generated · [HU] = Human-written · [MX] = Mixed`,
  },
  {
    name: "gitintel stats",
    description: "Show AI adoption statistics for the repository.",
    usage: "gitintel stats [--since <period>] [--developer <email>] [--format json|csv|table]",
    flags: [
      { flag: "--since <period>", description: "Time period: 7d, 30d, 90d (default: 30d)" },
      { flag: "--developer <email>", description: "Filter to a specific developer" },
      { flag: "--format", description: "Output format: table (default), json, csv" },
    ],
    example: `gitintel stats
gitintel stats --since 7d
gitintel stats --developer alice@acme.com
gitintel stats --format json`,
    output: `GitIntel Stats — last 30 days
────────────────────────────────────────────
Commits:      47
Total Lines:  5,890
AI Lines:     2,341  (39.7%)
Human Lines:  3,549  (60.3%)

Top Agent:    Claude Code  (74% of AI lines)
Top Model:    claude-sonnet-4-6

Trend:        ↑ +8% AI adoption vs previous 30 days`,
  },
  {
    name: "gitintel cost",
    description: "Show development cost broken down by commit, branch, developer, or time period.",
    usage: "gitintel cost [--since <period>] [--commit <sha>] [--branch <name>] [--developer <email>]",
    flags: [
      { flag: "--since <period>", description: "Time period: 7d, 30d, 90d" },
      { flag: "--commit <sha>", description: "Cost for a specific commit" },
      { flag: "--branch <name>", description: "Cost for a feature branch (from branch point to HEAD)" },
      { flag: "--developer <email>", description: "Cost for a specific developer" },
      { flag: "--format", description: "Output format: table (default), json, csv" },
    ],
    example: `gitintel cost --since 7d
gitintel cost --commit abc1234def5678
gitintel cost --branch feature/oauth
gitintel cost --developer alice@acme.com`,
    output: `Cost Summary — last 7 days
─────────────────────────────────────────────
Total Spend:     $12.45
├─ Claude Code:  $9.23   (74%)
├─ Copilot:      $2.10   (17%)
└─ Gemini CLI:   $1.12   (9%)

Commits:          47
Avg Cost/Commit:  $0.26
AI Lines Added:   2,341 / 5,890  (39.7%)`,
  },
  {
    name: "gitintel context",
    description: "Generate and optimize CLAUDE.md context files.",
    usage: "gitintel context <init|optimize|diff>",
    flags: [
      { flag: "init", description: "Generate a CLAUDE.md from repo analysis" },
      { flag: "init --force", description: "Overwrite existing CLAUDE.md" },
      { flag: "init --output <path>", description: "Write to a specific path (for monorepos)" },
      { flag: "optimize", description: "Preview what would be pruned (dry run)" },
      { flag: "optimize --apply", description: "Apply pruning optimizations" },
      { flag: "diff", description: "Show token count delta before/after optimization" },
    ],
    example: `gitintel context init
gitintel context optimize
gitintel context optimize --apply
gitintel context diff`,
    output: `CLAUDE.md Context Diff
────────────────────────────────────────
Before:  4,230 tokens
After:   1,840 tokens
Saved:   2,390 tokens  (56.5%)

Pruned sections (0 references in last 30 sessions):
  - "Database Migration History" (340 tokens)
  - "Legacy API Endpoints" (280 tokens)`,
  },
  {
    name: "gitintel memory",
    description: "Manage a persistent key-value memory store for codebase facts.",
    usage: "gitintel memory <add|get|list|prune|export|stats>",
    flags: [
      { flag: "add --key <k> --value <v>", description: "Add a fact" },
      { flag: "add --category <c>", description: "Categorize the fact (optional)" },
      { flag: "get <key>", description: "Retrieve a fact by key" },
      { flag: "list", description: "List all facts" },
      { flag: "list --category <c>", description: "Filter by category" },
      { flag: "prune --unused-days <n>", description: "Remove facts unused for N days" },
      { flag: "prune --dry-run", description: "Preview what would be pruned" },
      { flag: "export --format markdown", description: "Export memory as a CLAUDE.md section" },
      { flag: "stats", description: "Show memory store statistics" },
    ],
    example: `gitintel memory add \\
  --key    "auth-pattern" \\
  --value  "All protected routes use requireAuth() from src/middleware/auth.ts" \\
  --category "architecture"

gitintel memory list
gitintel memory prune --unused-days 30 --dry-run`,
  },
  {
    name: "gitintel sync",
    description: "Sync local attribution and cost data to a cloud API server.",
    usage: "gitintel sync [--dry-run]",
    flags: [
      { flag: "--dry-run", description: "Preview what would be synced without sending" },
    ],
    example: `gitintel config --set cloudSync.enabled=true
gitintel config --set cloudSync.endpoint=https://your-server.example.com/api/v1
gitintel sync`,
  },
  {
    name: "gitintel hooks",
    description: "Manage git hook installation.",
    usage: "gitintel hooks <install|uninstall|status|run>",
    flags: [
      { flag: "install", description: "Install all git hooks" },
      { flag: "uninstall", description: "Remove all git hooks" },
      { flag: "status", description: "Show current hook status" },
      { flag: "run <hook-name>", description: "Manually run a specific hook (e.g. post-commit)" },
    ],
    example: `gitintel hooks status
gitintel hooks run post-commit`,
  },
];

export default function CommandsPage() {
  return (
    <article className="max-w-none">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-3">Documentation</Badge>
        <h1 className="text-3xl font-bold tracking-tight">Commands Reference</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Complete reference for all <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-base">gitintel</code> CLI commands.
        </p>
      </div>

      <div className="space-y-10">
        {commands.map((cmd) => (
          <section key={cmd.name} className="scroll-mt-24" id={cmd.name.replace(/\s+/g, "-")}>
            <div className="flex items-start gap-3 mb-3">
              <code className="rounded-md bg-primary/10 px-2 py-1 font-mono text-sm font-semibold text-primary">
                {cmd.name}
              </code>
            </div>
            <p className="text-muted-foreground mb-4">{cmd.description}</p>

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Usage</p>
              <div className="rounded-lg bg-muted p-3 font-mono text-xs">{cmd.usage}</div>
            </div>

            {cmd.flags.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Flags</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {cmd.flags.map((f) => (
                        <tr key={f.flag} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-mono text-xs text-primary whitespace-nowrap">{f.flag}</td>
                          <td className="py-2 text-muted-foreground">{f.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Example</p>
              <div className="rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre">{cmd.example}</div>
            </div>

            {cmd.output && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Output</p>
                <div className="rounded-lg border bg-muted/40 p-3 font-mono text-xs whitespace-pre">{cmd.output}</div>
              </div>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
