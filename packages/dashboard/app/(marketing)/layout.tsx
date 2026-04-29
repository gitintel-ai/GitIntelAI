"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GitBranch, Github, Menu, X } from "lucide-react";
import Link from "next/link";

// biome-ignore lint: typed routes require Route cast in client components
const href = (path: string) => path as never;

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "/docs/getting-started", label: "Docs" },
  { href: "/blog", label: "Blog" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={href(link.href)}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <a
                href="https://github.com/gitintel-ai/GitIntelAI"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
              <Link href={href("/sign-in")}>Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={href("/sign-up")}>Get Started</Link>
            </Button>
            <button
              className="ml-1 inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {mobileMenuOpen && (
          <div className="border-t bg-background px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={href(link.href)}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center gap-2 border-t pt-3">
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href="https://github.com/gitintel-ai/GitIntelAI"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={href("/sign-in")}>Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-muted/40">
        <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                <span className="font-bold">GitIntel AI</span>
              </Link>
              <p className="mt-3 text-sm text-muted-foreground">
                Git-native AI adoption tracking, cost intelligence, and context optimization for
                development teams.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Product</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">How It Works</Link>
                </li>
                <li>
                  <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Resources</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="https://github.com/gitintel-ai/GitIntelAI" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground">GitHub</a>
                </li>
                <li>
                  <Link href="/docs/getting-started" className="text-sm text-muted-foreground hover:text-foreground">Documentation</Link>
                </li>
                <li>
                  <Link href={href("/blog")} className="text-sm text-muted-foreground hover:text-foreground">Blog</Link>
                </li>
                <li>
                  <a href="https://github.com/gitintel-ai/GitIntelAI/blob/main/specs/02-attribution-std.md" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground">Attribution Standard</a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Company</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="mailto:hello@gitintel.com" className="text-sm text-muted-foreground hover:text-foreground">Contact</a>
                </li>
                <li>
                  <Link href={href("/privacy")} className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
                </li>
                <li>
                  <Link href={href("/terms")} className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
                </li>
              </ul>

              <h3 className="mt-6 text-sm font-semibold">Tools we use</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href="https://pdfmavericks.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    PDF Mavericks — fast, private PDF tools
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t pt-6">
            <p className="text-center text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} GitIntel AI. Open source under the MIT License.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
