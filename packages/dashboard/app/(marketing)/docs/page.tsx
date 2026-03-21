import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Brain,
  Database,
  DollarSign,
  ExternalLink,
  GitBranch,
  Settings,
  Terminal,
} from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation - GitIntel AI",
  description:
    "GitIntel AI documentation. CLI reference, configuration, attribution standard, and getting started guides.",
};

const sections = [
  {
    icon: Terminal,
    title: "Getting Started",
    description: "Install the CLI and set up gitintel in your first repository.",
    links: [
      { label: "Installation", href: "/install" as Route },
      {
        label: "GETTING_STARTED.md on GitHub",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/GETTING_STARTED.md",
        external: true,
      },
      {
        label: "Quick Start",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/QUICKSTART.md",
        external: true,
      },
    ],
  },
  {
    icon: GitBranch,
    title: "CLI Reference",
    description:
      "All gitintel commands: init, checkpoint, blame, stats, cost, context, memory, sync, hooks, config.",
    links: [
      {
        label: "gitintel init",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/GETTING_STARTED.md#step-1-initialize",
        external: true,
      },
      {
        label: "gitintel checkpoint",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/GETTING_STARTED.md#recording-ai-sessions",
        external: true,
      },
      {
        label: "gitintel blame",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/GETTING_STARTED.md#viewing-attribution",
        external: true,
      },
      {
        label: "gitintel stats",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/GETTING_STARTED.md#viewing-stats",
        external: true,
      },
      {
        label: "gitintel cost",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/GETTING_STARTED.md#cost-tracking",
        external: true,
      },
    ],
  },
  {
    icon: Brain,
    title: "Context & Memory",
    description:
      "Optimize CLAUDE.md files, prune redundant context, and manage AI memory across sessions.",
    links: [
      {
        label: "gitintel context init",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/GETTING_STARTED.md#context-management",
        external: true,
      },
      {
        label: "gitintel context optimize",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/GETTING_STARTED.md#context-optimization",
        external: true,
      },
      {
        label: "gitintel memory",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/GETTING_STARTED.md#memory-management",
        external: true,
      },
    ],
  },
  {
    icon: DollarSign,
    title: "Cost Tracking",
    description:
      "Capture token usage via OpenTelemetry and map to USD costs per commit, branch, and developer.",
    links: [
      {
        label: "OTel Setup (Claude Code)",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/GETTING_STARTED.md#otel-setup",
        external: true,
      },
      {
        label: "Model Pricing Table",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/packages/core/src/constants.ts",
        external: true,
      },
    ],
  },
  {
    icon: Database,
    title: "Attribution Standard",
    description:
      "Open schema v1.0 for storing AI authorship in git refs. Vendor-neutral and interoperable.",
    links: [
      {
        label: "Standard Specification",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/specs/02-attribution-std.md",
        external: true,
      },
      {
        label: "Schema Reference (YAML)",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/packages/cli/src/hooks/post_commit.rs",
        external: true,
      },
    ],
  },
  {
    icon: Settings,
    title: "Configuration",
    description: "All configuration keys, defaults, and how to set them via gitintel config.",
    links: [
      {
        label: "Config Reference",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/GETTING_STARTED.md#configuration",
        external: true,
      },
      {
        label: "Self-Hosting (Docker)",
        href: "https://github.com/gitintel-ai/GitIntelAI/blob/main/infra/docker",
        external: true,
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mb-12">
        <Badge variant="secondary" className="mb-4">
          v0.1.0
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Documentation</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Everything you need to install, configure, and use GitIntel AI. Full documentation lives
          in the GitHub repository.
        </p>
        <div className="mt-6 flex gap-4">
          <Link
            href={"/install" as Route}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Install GitIntel
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com/gitintel-ai/GitIntelAI"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            View on GitHub
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Quick CLI Reference */}
      <div className="mb-14">
        <h2 className="mb-6 text-2xl font-bold">Quick CLI Reference</h2>
        <div className="overflow-hidden rounded-lg border bg-[hsl(222,84%,4.9%)] p-6 font-mono text-sm text-[hsl(210,40%,98%)]">
          <p className="text-muted-foreground"># Initialize in a repo</p>
          <p>
            <span className="text-green-400">$</span> gitintel init
          </p>
          <p className="mt-3 text-muted-foreground"># Record an AI coding session</p>
          <p>
            <span className="text-green-400">$</span> gitintel checkpoint --agent &quot;Claude
            Code&quot; --model claude-sonnet-4-6 --session-id sess_abc123 --file src/auth.ts --lines
            12-45 --cost-usd 0.0234
          </p>
          <p className="mt-3 text-muted-foreground"># Show AI attribution for a file</p>
          <p>
            <span className="text-green-400">$</span> gitintel blame src/auth.ts
          </p>
          <p className="mt-3 text-muted-foreground"># Show adoption stats</p>
          <p>
            <span className="text-green-400">$</span> gitintel stats --since 30d
          </p>
          <p className="mt-3 text-muted-foreground"># Show cost summary</p>
          <p>
            <span className="text-green-400">$</span> gitintel cost --since 7d
          </p>
          <p className="mt-3 text-muted-foreground"># Generate CLAUDE.md from repo scan</p>
          <p>
            <span className="text-green-400">$</span> gitintel context init
          </p>
          <p className="mt-3 text-muted-foreground"># Optimize existing CLAUDE.md</p>
          <p>
            <span className="text-green-400">$</span> gitintel context optimize --apply
          </p>
        </div>
      </div>

      {/* Documentation Sections */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title} className="flex flex-col">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <section.icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href as Route}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 rounded-lg border bg-muted/40 p-8 text-center">
        <h2 className="text-xl font-semibold">Full Documentation on GitHub</h2>
        <p className="mt-2 text-muted-foreground">
          The primary documentation is{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">GETTING_STARTED.md</code> in the
          repository — 868 lines covering every feature with working examples.
        </p>
        <a
          href="https://github.com/gitintel-ai/GitIntelAI/blob/main/GETTING_STARTED.md"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Read GETTING_STARTED.md
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
