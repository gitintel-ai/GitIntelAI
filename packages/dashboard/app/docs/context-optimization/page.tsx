import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Context Optimization — GitIntel AI Docs",
  description:
    "Optimize your CLAUDE.md files to reduce token burn by 30–60%. Generate, prune, and compress AI context files.",
};

export default function ContextOptimizationPage() {
  return (
    <article className="max-w-none">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-3">
          Documentation
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">Context Optimization</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Reduce token burn by 30–60% by generating optimized CLAUDE.md files and pruning stale
          context sections.
        </p>
      </div>

      {/* Generate */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Generate an Optimized CLAUDE.md</h2>
        <p className="text-sm text-muted-foreground mb-4">
          <code className="rounded bg-muted px-1 font-mono text-xs">gitintel context init</code>{" "}
          scans your repo and produces a CLAUDE.md structured around what the AI actually needs:
          stack, file structure, key exports, conventions, and coding patterns. It skips boilerplate
          that wastes tokens.
        </p>
        <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre mb-4">{`cd your-project
gitintel context init

# Force overwrite existing CLAUDE.md
gitintel context init --force

# For monorepos — generate per-package
gitintel context init --output packages/api/CLAUDE.md
gitintel context init --output packages/dashboard/CLAUDE.md`}</div>
        <p className="text-sm text-muted-foreground">
          GitIntel detects your stack from{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">package.json</code>,{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">Cargo.toml</code>,{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">requirements.txt</code>,{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">go.mod</code>, etc.
        </p>
      </section>

      {/* Optimize */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Optimize an Existing CLAUDE.md</h2>
        <p className="text-sm text-muted-foreground mb-4">
          <code className="rounded bg-muted px-1 font-mono text-xs">gitintel context optimize</code>{" "}
          analyzes which sections were referenced in recent sessions, scores them by reference
          frequency, and prunes zero-reference sections.
        </p>
        <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre mb-4">{`# Preview what would be pruned (safe — no changes made)
gitintel context optimize

# Apply the optimizations
gitintel context optimize --apply

# Check the token savings
gitintel context diff`}</div>
        <div className="rounded-lg border bg-muted/40 p-4 font-mono text-xs whitespace-pre">{`CLAUDE.md Context Diff
────────────────────────────────────────
Before:  4,230 tokens
After:   1,840 tokens
Saved:   2,390 tokens  (56.5%)

Pruned sections (0 references in last 30 sessions):
  - "Database Migration History" (340 tokens)
  - "Legacy API Endpoints" (280 tokens)
  - "Sprint Planning Notes" (190 tokens)

Compressed sections (< 3 references):
  - "CI/CD Pipeline Details" (520 → 85 tokens)`}</div>
      </section>

      {/* Memory */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Persistent Memory Store</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Store codebase facts that would otherwise need to be re-explained to the AI every session.
        </p>
        <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre mb-4">{`# Add a fact
gitintel memory add \\
  --key    "auth-pattern" \\
  --value  "All protected routes use requireAuth() from src/middleware/auth.ts" \\
  --category "architecture"

# List all facts
gitintel memory list

# Export as a CLAUDE.md section
gitintel memory export --format markdown`}</div>
        <p className="text-sm text-muted-foreground">
          Memory facts are tracked by{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">use_count</code> and{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">last_used_at</code>. Facts that
          are never referenced expire automatically when you run{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">gitintel memory prune</code>.
        </p>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Best Practices</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Run context init on new repos",
              desc: "Generate a CLAUDE.md before starting any significant AI-assisted work. It saves tokens from day one.",
            },
            {
              title: "Optimize monthly",
              desc: "Run context optimize --apply monthly to prune sections that have become stale as the codebase evolves.",
            },
            {
              title: "Use per-directory files in monorepos",
              desc: "Generate separate CLAUDE.md files per package so each AI session loads only the relevant context.",
            },
            {
              title: "Export memory to CLAUDE.md",
              desc: "Run gitintel memory export --format markdown periodically and append the output to your CLAUDE.md.",
            },
          ].map((tip) => (
            <div key={tip.title} className="rounded-lg border p-4">
              <p className="font-semibold text-sm">{tip.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{tip.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
