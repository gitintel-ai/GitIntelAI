import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GitBranch, Github, BookOpen, Terminal, Zap, Users, Settings, Code2 } from "lucide-react";

const docsSections = [
  {
    title: "Introduction",
    links: [
      { href: "/docs/getting-started", label: "Getting Started", icon: BookOpen },
      { href: "/docs/how-it-works", label: "How It Works", icon: Zap },
    ],
  },
  {
    title: "CLI Reference",
    links: [
      { href: "/docs/commands", label: "Commands", icon: Terminal },
      { href: "/docs/agent-integrations", label: "Agent Integrations", icon: Code2 },
    ],
  },
  {
    title: "Team & Cloud",
    links: [
      { href: "/docs/team-setup", label: "Team Setup", icon: Users },
      { href: "/docs/context-optimization", label: "Context Optimization", icon: Settings },
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">
              GitIntel<span className="text-muted-foreground font-normal"> AI</span>
            </span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <Link href="/#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="/docs/getting-started" className="text-sm font-medium text-foreground">
              Docs
            </Link>
            <Link href="/#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <a href="https://github.com/gitintel/gitintel" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={"/sign-in" as Route}>Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={"/sign-up" as Route}>Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      <div className="container mx-auto flex max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24 space-y-6">
            {docsSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href as Route}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <link.icon className="h-4 w-4 shrink-0" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <footer className="border-t bg-muted/40 py-6">
        <div className="container mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>
            &copy; {new Date().getFullYear()} GitIntel AI. Open source under the MIT License.{" "}
            <a href="https://github.com/gitintel/gitintel" className="underline hover:text-foreground">
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
