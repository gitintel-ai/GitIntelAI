import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GitBranch,
  DollarSign,
  Brain,
  Trophy,
  Bell,
  Shield,
  Terminal,
  ArrowRight,
  Check,
  X,
  Minus,
  Code2,
  BarChart3,
  Zap,
} from "lucide-react";
import { FaqSection } from "./faq-section";

export const metadata: Metadata = {
  title: "GitIntel AI - Git-Native AI Adoption Tracking & Cost Intelligence",
  description:
    "Track AI-generated code, measure development costs, and optimize context across your team. Works with Claude Code, Cursor, Copilot, Codex, and Gemini Code Assist. Open source, local-first, enterprise-ready.",
  keywords: [
    "AI code tracking",
    "AI adoption metrics",
    "AI coding costs",
    "AI attribution",
    "developer analytics",
    "Claude Code",
    "Cursor",
    "Copilot",
    "AI generated code percentage",
    "development cost intelligence",
    "context optimization",
    "CLAUDE.md",
  ],
  openGraph: {
    title: "GitIntel AI - Know How Much AI Code You Ship",
    description:
      "Git-native AI adoption tracking, cost intelligence, and context optimization for development teams.",
    type: "website",
    url: "https://gitintel.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitIntel AI - Git-Native AI Adoption Tracking",
    description:
      "Track AI-generated code, measure development costs, and optimize context. Open source.",
  },
};

const jsonLdSoftwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GitIntel AI",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Linux, macOS, Windows",
  description:
    "Git-native AI adoption tracking, cost intelligence, and context optimization for development teams. Tracks line-level AI/Human/Mixed code attribution per developer, repo, and sprint.",
  url: "https://gitintel.com",
  downloadUrl: "https://github.com/gitintel/gitintel/releases",
  softwareVersion: "1.0.0",
  author: {
    "@type": "Organization",
    name: "GitIntel AI",
    url: "https://gitintel.com",
  },
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Open Source - Free forever",
    },
    {
      "@type": "Offer",
      price: "12",
      priceCurrency: "USD",
      description: "Team plan per developer per month",
    },
  ],
  featureList: [
    "Line-level AI/Human code attribution",
    "Token usage and cost tracking per commit",
    "Context and memory optimization",
    "Developer leaderboard and analytics",
    "Budget alerts and spending controls",
    "Enterprise SSO, RBAC, and self-hosting",
  ],
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I track AI-generated code in my repository?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GitIntel AI automatically tracks AI-generated code at the line level using git hooks. Install the CLI with a single command, and it intercepts your normal git commit workflow to detect which lines were written by AI assistants like Claude Code, Cursor, Copilot, or Codex. Attribution data is stored in git refs alongside your commits, requiring no workflow changes.",
      },
    },
    {
      "@type": "Question",
      name: "How do I measure AI coding costs per developer or project?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GitIntel AI captures token usage metrics (input, output, cache read, cache write) from AI coding tools via OpenTelemetry and maps them to USD costs per commit, per feature branch, per developer, and per team. You get a real-time dashboard showing exactly how much each AI-assisted feature costs to build.",
      },
    },
    {
      "@type": "Question",
      name: "What percentage of my codebase is AI-generated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GitIntel AI provides precise AI attribution percentages at every level: per file, per commit, per developer, per repository, and across your entire organization. Each line is classified as AI-written, human-written, or mixed (human-edited AI output), giving you a clear picture of AI adoption across your team.",
      },
    },
    {
      "@type": "Question",
      name: "Does GitIntel AI work with Claude Code, Cursor, and Copilot?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. GitIntel AI is vendor-agnostic and works with all major AI coding assistants including Claude Code, Cursor, GitHub Copilot, Codex, and Gemini Code Assist. It detects AI-authored code regardless of which tool was used to generate it.",
      },
    },
    {
      "@type": "Question",
      name: "Is my code and data sent to the cloud?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. GitIntel AI is local-first and privacy-first. All tracking and attribution happens on your machine. Code, prompts, and transcripts never leave your environment unless you explicitly configure cloud sync. The tool uses a local SQLite database and stores attribution in git refs within your repository.",
      },
    },
    {
      "@type": "Question",
      name: "How does GitIntel AI compare to gitai (usegitai.com)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GitIntel AI is an open-source alternative to gitai that provides deeper attribution (line-level vs file-level), built-in cost tracking, context optimization, and full enterprise features including self-hosting and air-gapped deployment. Unlike gitai, GitIntel AI is local-first and does not require sending your code to a third-party cloud service.",
      },
    },
    {
      "@type": "Question",
      name: "Can I self-host GitIntel AI for my enterprise?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. GitIntel AI is designed for enterprise self-hosting from day one. It ships as a single Docker image or Helm chart for Kubernetes, supports air-gapped deployment, SSO via SAML/OIDC, role-based access control, and audit logging. Your data stays entirely within your infrastructure.",
      },
    },
    {
      "@type": "Question",
      name: "What is the GitIntel attribution standard?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The GitIntel attribution standard (v1.0) is an open specification for storing AI authorship metadata in git. Attribution data is stored at refs/ai/authorship/{commit-sha} and includes per-file line ranges for AI-written and human-written code, token usage, cost, model information, and agent session details. It is designed to be vendor-neutral and interoperable.",
      },
    },
  ],
};

const features = [
  {
    icon: GitBranch,
    title: "AI Attribution Tracking",
    description:
      "Line-level classification of every code change as AI-written, human-written, or mixed. Stored in git refs using an open standard that works with any AI coding tool.",
  },
  {
    icon: DollarSign,
    title: "Cost Intelligence",
    description:
      "Track token usage and map it to real USD costs per commit, feature branch, developer, and team. Set budget alerts before costs spiral out of control.",
  },
  {
    icon: Brain,
    title: "Context Optimization",
    description:
      "Automatically optimize CLAUDE.md and context files. Prune redundant instructions, detect stale context, and reduce token burn across your repositories.",
  },
  {
    icon: Trophy,
    title: "Developer Leaderboard",
    description:
      "See which developers are most effectively leveraging AI tools. Track AI adoption rates, productivity multipliers, and cost efficiency across your team.",
  },
  {
    icon: Bell,
    title: "Budget Alerts",
    description:
      "Set spending thresholds per developer, team, or project. Get notified before AI tool costs exceed your budget with real-time usage monitoring.",
  },
  {
    icon: Shield,
    title: "Enterprise Ready",
    description:
      "Self-hostable with air-gapped deployment support. SSO via SAML and OIDC, role-based access control, audit logging, and SOC 2 compliance ready.",
  },
];

const steps = [
  {
    step: 1,
    icon: Terminal,
    title: "Install the CLI",
    description:
      "Build the gitintel CLI from source with Cargo. It installs as a transparent git proxy that hooks into your existing workflow with zero configuration.",
    code: "cargo build --release --manifest-path packages/cli/Cargo.toml",
  },
  {
    step: 2,
    icon: Code2,
    title: "Write Code Normally",
    description:
      "Keep using your favorite AI coding assistant. GitIntel detects AI-authored code automatically when you commit. No workflow changes, no extra steps.",
    code: "git commit -m \"Add auth flow\" # gitintel tracks automatically",
  },
  {
    step: 3,
    icon: BarChart3,
    title: "See Insights",
    description:
      "Run gitintel stats to see AI adoption and cost breakdowns in your terminal, or open the dashboard for team-wide analytics.",
    code: "gitintel stats --since 7d --format json",
  },
];

const comparisonFeatures = [
  { feature: "Line-level AI attribution", gitintel: true, gitai: false, manual: false },
  { feature: "File-level AI attribution", gitintel: true, gitai: true, manual: "partial" },
  { feature: "Cost tracking (tokens to USD)", gitintel: true, gitai: false, manual: false },
  { feature: "Context/memory optimization", gitintel: true, gitai: false, manual: false },
  { feature: "Multi-vendor support", gitintel: true, gitai: "partial", manual: true },
  { feature: "Local-first / offline", gitintel: true, gitai: false, manual: true },
  { feature: "Open source", gitintel: true, gitai: false, manual: "n/a" },
  { feature: "Self-hostable", gitintel: true, gitai: false, manual: "n/a" },
  { feature: "Open attribution standard", gitintel: true, gitai: false, manual: false },
  { feature: "Budget alerts", gitintel: true, gitai: false, manual: false },
  { feature: "Enterprise SSO/RBAC", gitintel: true, gitai: true, manual: false },
];

function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="h-5 w-5 text-green-600" aria-label="Yes" />;
  }
  if (value === false) {
    return <X className="h-5 w-5 text-red-500" aria-label="No" />;
  }
  if (value === "partial") {
    return <Minus className="h-5 w-5 text-yellow-500" aria-label="Partial" />;
  }
  return <span className="text-sm text-muted-foreground">{value}</span>;
}

const pricingPlans = [
  {
    name: "Open Source",
    price: "Free",
    period: "forever",
    description: "For individual developers and small teams getting started with AI tracking.",
    features: [
      "Unlimited local tracking",
      "CLI with git proxy",
      "Local SQLite database",
      "AI attribution (line-level)",
      "Cost tracking per commit",
      "Basic dashboard",
      "Community support",
    ],
    cta: "Get Started",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
  {
    name: "Team",
    price: "$12",
    period: "per developer / month",
    description: "For teams that need centralized analytics, collaboration, and alerts.",
    features: [
      "Everything in Open Source",
      "Cloud sync and aggregation",
      "Team dashboard and leaderboard",
      "Budget alerts and notifications",
      "Context optimization engine",
      "PostgreSQL cloud database",
      "Email support",
    ],
    cta: "Start Free Trial",
    ctaVariant: "default" as const,
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact sales",
    description: "For organizations that need self-hosting, compliance, and dedicated support.",
    features: [
      "Everything in Team",
      "Self-hosted deployment",
      "Air-gapped support",
      "SSO (SAML / OIDC)",
      "Role-based access control",
      "Audit logging",
      "Dedicated support and SLA",
    ],
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdSoftwareApplication),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdFaq),
        }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/40">
        <div className="container mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-6">
              <Zap className="mr-1 h-3 w-3" />
              Open Source &middot; Local-First &middot; Enterprise Ready
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Know Exactly How Much{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                AI Code
              </span>{" "}
              You Ship
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              GitIntel AI provides git-native AI adoption tracking, cost
              intelligence, and context optimization for development teams.
              Track every line, measure every dollar, optimize every token.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href={"/sign-up" as Route}>
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href="https://github.com/gitintel/gitintel"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>

          {/* Terminal Mockup */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="overflow-hidden rounded-lg border bg-card shadow-2xl">
              <div className="flex items-center gap-2 border-b bg-muted/60 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-muted-foreground">
                  terminal
                </span>
              </div>
              <div className="bg-[hsl(222,84%,4.9%)] p-6 font-mono text-sm leading-relaxed text-[hsl(210,40%,98%)]">
                <p>
                  <span className="text-green-400">$</span> gitintel stats
                </p>
                <p className="mt-3">
                  <span className="text-yellow-400">AI Adoption Stats: Repository</span>
                </p>
                <p className="text-muted-foreground">Period: last 30d</p>
                <p className="text-muted-foreground">────────────────────────────────────────</p>
                <p className="mt-2">
                  Total Commits:{" "}
                  <span className="text-blue-400">142</span>{"   "}Total Lines:{" "}
                  <span className="text-blue-400">18,340</span>
                </p>
                <p className="mt-2">
                  <span className="text-green-400">AI-Generated:</span>{"   "}
                  <span className="text-green-400">43.2%</span> (7,923 lines)
                </p>
                <p>
                  Human-Written:{"  "}
                  <span className="text-blue-400">56.8%</span> (10,417 lines)
                </p>
                <p className="mt-2">
                  Total Cost:{" "}
                  <span className="text-yellow-400">$47.23</span>{"  "}Avg/Commit:{" "}
                  <span className="text-yellow-400">$0.33</span>
                </p>
                <p className="mt-3 text-muted-foreground">────────────────────────────────────────</p>
                <p>
                  <span className="text-green-400">$</span>{" "}
                  <span className="animate-pulse">_</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="border-b py-20 sm:py-28">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              The AI Adoption Blindspot
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Your team is shipping AI-generated code every day, but you have no
              idea how much. Engineering leaders cannot answer basic questions
              about their AI investment.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-3">
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-5xl font-extrabold text-primary">
                  ???
                </CardTitle>
                <CardDescription className="text-base">
                  What percentage of your codebase is AI-generated?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Most teams cannot tell you whether 10% or 80% of their shipped
                  code was written by AI. Without measurement, there is no
                  management.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-5xl font-extrabold text-primary">
                  $???
                </CardTitle>
                <CardDescription className="text-base">
                  How much are you spending on AI coding tools?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Token costs add up fast. A single developer can burn through
                  hundreds of dollars a month without anyone noticing until the
                  invoice arrives.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-5xl font-extrabold text-primary">
                  ~40%
                </CardTitle>
                <CardDescription className="text-base">
                  Of context tokens are wasted on redundant instructions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Bloated CLAUDE.md files and unoptimized context means you are
                  paying for tokens that do not improve output quality.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="border-b py-20 sm:py-28">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to Track AI Adoption
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              GitIntel AI gives engineering leaders complete visibility into how
              AI tools are being used across their organization.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="relative overflow-hidden">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-b py-20 sm:py-28">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Get Started in Three Steps
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              GitIntel AI integrates seamlessly into your existing git workflow.
              No new tools to learn, no workflow changes required.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-5xl gap-8 lg:grid-cols-3">
            {steps.map((step) => (
              <div key={step.step} className="relative">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  {step.description}
                </p>
                <div className="overflow-hidden rounded-md border bg-[hsl(222,84%,4.9%)] px-4 py-3 font-mono text-sm text-[hsl(210,40%,98%)]">
                  <span className="text-green-400">$</span> {step.code}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="border-b py-20 sm:py-28">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How GitIntel AI Compares
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              See how GitIntel AI stacks up against other approaches to AI code
              tracking.
            </p>
          </div>
          <div className="mx-auto mt-14 max-w-4xl">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Feature</TableHead>
                      <TableHead className="text-center">
                        <span className="font-bold text-foreground">
                          GitIntel AI
                        </span>
                      </TableHead>
                      <TableHead className="text-center">gitai</TableHead>
                      <TableHead className="text-center">
                        Manual Tracking
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonFeatures.map((row) => (
                      <TableRow key={row.feature}>
                        <TableCell className="font-medium">
                          {row.feature}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <ComparisonCell value={row.gitintel} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <ComparisonCell value={row.gitai} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <ComparisonCell value={row.manual} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b py-20 sm:py-28">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              Start free with the open-source CLI. Upgrade when you need team
              collaboration and enterprise features.
            </p>
          </div>
          <div className="mx-auto mt-14 grid max-w-6xl gap-8 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted
                    ? "relative border-primary shadow-lg"
                    : "relative"
                }
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold">
                      {plan.price}
                    </span>
                    {plan.period !== "forever" && (
                      <span className="ml-1 text-sm text-muted-foreground">
                        / {plan.period}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.ctaVariant}
                    asChild
                  >
                    {plan.name === "Enterprise" ? (
                      <a href="mailto:sales@gitintel.com">{plan.cta}</a>
                    ) : (
                      <Link href={"/sign-up" as Route}>{plan.cta}</Link>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="border-b py-20 sm:py-28">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              Everything you need to know about GitIntel AI. Can&apos;t find the
              answer you&apos;re looking for? Reach out to our team.
            </p>
          </div>
          <div className="mx-auto mt-14 max-w-3xl">
            <FaqSection />
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start Tracking Your AI Code Today
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              Join thousands of developers who use GitIntel AI to understand
              their AI adoption, control costs, and optimize their workflow.
              Open source and free to get started.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href={"/sign-up" as Route}>
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href="https://github.com/gitintel/gitintel"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Star on GitHub
                </a>
              </Button>
            </div>
            <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <div className="inline-flex items-center gap-2 rounded-lg border bg-muted px-4 py-2 font-mono text-sm text-muted-foreground">
                <span className="text-green-600 dark:text-green-400">$</span>
                <span>curl -fsSL https://gitintel.com/install | sh</span>
              </div>
              <span className="text-xs text-muted-foreground">or</span>
              <div className="inline-flex items-center gap-2 rounded-lg border bg-muted px-4 py-2 font-mono text-sm text-muted-foreground">
                <span className="text-green-600 dark:text-green-400">$</span>
                <span>npm install -g @gitintel-cli/gitintel</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
