import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Getting Started — GitIntel AI Docs",
  description:
    "Get up and running with GitIntel AI. Install the CLI, initialize your first repo, and start tracking AI adoption and costs in minutes.",
};

export default function GettingStartedPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-3">Documentation</Badge>
        <h1 className="text-3xl font-bold tracking-tight">Getting Started with GitIntel AI</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          GitIntel is a git-native AI adoption tracker for engineering teams. It runs entirely on your machine,
          requires no workflow changes, and answers three questions that no tool currently answers.
        </p>
      </div>

      <div className="not-prose mb-8 grid gap-4 rounded-lg border bg-muted/40 p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm font-semibold">How much AI code?</p>
          <p className="mt-1 text-sm text-muted-foreground">Line-level attribution per developer, per repo, per sprint</p>
        </div>
        <div>
          <p className="text-sm font-semibold">What does it cost?</p>
          <p className="mt-1 text-sm text-muted-foreground">Dollars per commit, per feature, per developer</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Is context optimized?</p>
          <p className="mt-1 text-sm text-muted-foreground">Optimize CLAUDE.md, prune stale memory, reduce token burn</p>
        </div>
      </div>

      <div className="not-prose mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        GitIntel stores all data locally in SQLite. Cloud sync is opt-in and off by default.
        Prompts and transcripts <strong>never leave your machine</strong> unless you explicitly configure them to.
      </div>

      {/* Prerequisites */}
      <h2 className="text-xl font-semibold">Prerequisites</h2>
      <div className="not-prose overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left font-semibold">Requirement</th>
              <th className="py-2 text-left font-semibold">Version</th>
              <th className="py-2 text-left font-semibold">Check</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">Git</td>
              <td className="py-2">2.30+</td>
              <td className="py-2 font-mono text-xs">git --version</td>
            </tr>
            <tr>
              <td className="py-2">Rust + Cargo</td>
              <td className="py-2">1.82+</td>
              <td className="py-2 font-mono text-xs">rustc --version</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-sm text-muted-foreground">Rust is only needed to build from source. Pre-built binaries (coming soon) will not require it.</p>
      </div>

      {/* Installation */}
      <h2 className="text-xl font-semibold mt-8">Installation</h2>

      <div className="not-prose mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm font-semibold mb-1">npm <span className="text-xs font-normal text-muted-foreground">— all platforms</span></p>
          <div className="rounded bg-muted p-3 font-mono text-xs">
            npm install -g @gitintel/cli
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Works on macOS, Linux, and Windows. No build tools required.</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm font-semibold mb-1">curl <span className="text-xs font-normal text-muted-foreground">— macOS / Linux</span></p>
          <div className="rounded bg-muted p-3 font-mono text-xs">
            curl -fsSL https://gitintel.com/install | sh
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Detects OS and arch, installs to <code className="font-mono">~/.local/bin/</code>.</p>
        </div>
      </div>

      <div className="not-prose mt-3 space-y-2">
        <details className="rounded-lg border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">curl options</summary>
          <div className="border-t px-4 py-3 font-mono text-xs space-y-1">
            <p className="text-muted-foreground"># Pin a specific version</p>
            <p>GITINTEL_VERSION=v0.1.0 curl -fsSL https://gitintel.com/install | sh</p>
            <br />
            <p className="text-muted-foreground"># Install to a custom directory</p>
            <p>GITINTEL_INSTALL_DIR=/usr/local/bin curl -fsSL https://gitintel.com/install | sh</p>
          </div>
        </details>
        <details className="rounded-lg border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Windows (direct download)</summary>
          <div className="border-t px-4 py-3 font-mono text-xs space-y-1">
            <p className="text-muted-foreground"># Download gitintel-windows-amd64.exe from:</p>
            <p>https://github.com/gitintel-ai/gitintel/releases/latest</p>
            <br />
            <p className="text-muted-foreground"># Copy to PATH (PowerShell)</p>
            <p>{"Copy-Item gitintel-windows-amd64.exe \"$env:USERPROFILE\\.local\\bin\\gitintel.exe\""}</p>
          </div>
        </details>
        <details className="rounded-lg border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Build from source (requires Rust 1.82+)</summary>
          <div className="border-t px-4 py-3 font-mono text-xs space-y-1">
            <p>git clone https://github.com/gitintel-ai/gitintel.git</p>
            <p>cd gitintel</p>
            <p>cargo build --release --manifest-path packages/cli/Cargo.toml</p>
            <p>cp packages/cli/target/release/gitintel ~/.local/bin/</p>
          </div>
        </details>
      </div>

      <h3 className="text-base font-semibold mt-6">Verify</h3>
      <div className="not-prose rounded-lg bg-muted p-4 font-mono text-sm">
        <p>gitintel --version</p>
        <p className="text-muted-foreground"># gitintel 0.1.0</p>
      </div>

      {/* Initialize */}
      <h2 className="text-xl font-semibold mt-8">Initializing a Repository</h2>
      <p className="text-muted-foreground">Run this once per repository. It installs git hooks and creates a local config directory.</p>
      <div className="not-prose rounded-lg bg-muted p-4 font-mono text-sm">
        <p>cd your-project</p>
        <p>gitintel init</p>
      </div>
      <div className="not-prose rounded-lg border bg-muted/40 p-4 font-mono text-sm mt-2">
        <p className="text-muted-foreground">Expected output:</p>
        <p>Initializing GitIntel...</p>
        <p>  ✓ Created ~/.gitintel/</p>
        <p>  ✓ Configuration saved</p>
        <p>  ✓ Database initialized</p>
        <p>  ✓ Installed pre-commit</p>
        <p>  ✓ Installed post-commit</p>
        <p>  ✓ Installed prepare-commit-msg</p>
        <p>  ✓ Git hooks installed</p>
      </div>

      {/* Core Workflow */}
      <h2 className="text-xl font-semibold mt-8">The Core Workflow</h2>
      <p className="text-muted-foreground">The full loop from AI-assisted coding to tracked commit takes four steps.</p>

      <div className="not-prose space-y-4 mt-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
            <h3 className="font-semibold">AI agent writes code</h3>
          </div>
          <p className="text-sm text-muted-foreground">Use your AI coding agent (Claude Code, Cursor, etc.) as you normally would. Nothing changes here.</p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
            <h3 className="font-semibold">Record the checkpoint</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Before committing, call <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">gitintel checkpoint</code> to record which lines the agent wrote.</p>
          <div className="rounded bg-muted p-3 font-mono text-xs">
            <p>gitintel checkpoint \</p>
            <p>  --agent    "Claude Code" \</p>
            <p>  --model    "claude-sonnet-4-6" \</p>
            <p>  --session-id "sess_abc123" \</p>
            <p>  --file     "src/auth/login.ts" \</p>
            <p>  --lines    "12-45,78-103" \</p>
            <p>  --tokens-in  1240 \</p>
            <p>  --tokens-out  890 \</p>
            <p>  --cost-usd  0.0234</p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
            <h3 className="font-semibold">Commit normally</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Run git commit as usual. The post-commit hook fires automatically.</p>
          <div className="rounded bg-muted p-3 font-mono text-xs">
            <p>git add src/auth/login.ts</p>
            <p>git commit -m "feat: add OAuth2 login"</p>
            <br />
            <p className="text-muted-foreground"># Hook output:</p>
            <p className="text-green-600 dark:text-green-400">✓ Commit: 45% AI (Claude Code · claude-sonnet-4-6), 55% Human</p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">4</span>
            <h3 className="font-semibold">Query the data</h3>
          </div>
          <div className="rounded bg-muted p-3 font-mono text-xs">
            <p className="text-muted-foreground"># Repo-level AI% breakdown</p>
            <p>gitintel stats</p>
            <br />
            <p className="text-muted-foreground"># Line-level attribution for a file</p>
            <p>gitintel blame src/auth/login.ts</p>
            <br />
            <p className="text-muted-foreground"># Cost breakdown for the last week</p>
            <p>gitintel cost --since 7d</p>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <h2 className="text-xl font-semibold mt-10">Next Steps</h2>
      <div className="not-prose grid gap-3 sm:grid-cols-2">
        <Link href="/docs/how-it-works" className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted">
          <div>
            <p className="font-medium">How It Works</p>
            <p className="text-sm text-muted-foreground">Understand the attribution architecture</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
        </Link>
        <Link href="/docs/commands" className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted">
          <div>
            <p className="font-medium">Commands Reference</p>
            <p className="text-sm text-muted-foreground">Full CLI command documentation</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
        </Link>
        <Link href="/docs/agent-integrations" className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted">
          <div>
            <p className="font-medium">Agent Integrations</p>
            <p className="text-sm text-muted-foreground">Claude Code, Cursor, Copilot, Gemini</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
        </Link>
        <Link href="/docs/team-setup" className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted">
          <div>
            <p className="font-medium">Team Setup</p>
            <p className="text-sm text-muted-foreground">Share attribution with your team</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
        </Link>
      </div>
    </article>
  );
}
