import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, Package, CheckCircle, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Install GitIntel AI - Build from Source",
  description:
    "How to install the gitintel CLI. Build from source with Cargo. Requires Git 2.30+ and Rust 1.82+.",
};

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border bg-[hsl(222,84%,4.9%)] px-4 py-3 font-mono text-sm text-[hsl(210,40%,98%)]">
      {children}
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative pl-10">
      <div className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {n}
      </div>
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export default function InstallPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mb-12 text-center">
        <Badge variant="secondary" className="mb-4">
          <Terminal className="mr-1 h-3 w-3" />
          v0.1.0
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Install GitIntel AI
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          The gitintel CLI is built with Rust. Install from source using Cargo.
        </p>
      </div>

      {/* Requirements */}
      <Card className="mb-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <Badge variant="outline">Git</Badge>
            <span className="text-muted-foreground">2.30 or newer</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">Rust + Cargo</Badge>
            <span className="text-muted-foreground">
              1.82 or newer —{" "}
              <a
                href="https://rustup.rs"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                install via rustup.rs
              </a>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Install Steps */}
      <div className="space-y-10">
        <Step n={1} title="Clone the repository">
          <CodeBlock>
            <p>
              <span className="text-green-400">$</span> git clone
              https://github.com/gitintel-ai/GitIntelAI.git
            </p>
            <p>
              <span className="text-green-400">$</span> cd gitintel
            </p>
          </CodeBlock>
        </Step>

        <Step n={2} title="Build the CLI">
          <CodeBlock>
            <p>
              <span className="text-green-400">$</span> cargo build --release
              --manifest-path packages/cli/Cargo.toml
            </p>
          </CodeBlock>
          <p className="mt-3 text-sm text-muted-foreground">
            On Windows, if the build fails with{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              os error 32
            </code>
            , use single-threaded build:
          </p>
          <CodeBlock>
            <p>
              <span className="text-green-400">$</span> cargo build --jobs 1
              --manifest-path packages/cli/Cargo.toml
            </p>
          </CodeBlock>
        </Step>

        <Step n={3} title="Install the binary">
          <p className="mb-3 text-sm text-muted-foreground">
            Copy the compiled binary to a directory on your PATH:
          </p>
          <CodeBlock>
            <p className="text-muted-foreground"># Linux / macOS</p>
            <p>
              <span className="text-green-400">$</span> cp
              packages/cli/target/release/gitintel ~/.local/bin/
            </p>
            <p className="mt-2 text-muted-foreground"># Windows</p>
            <p>
              <span className="text-green-400">$</span> copy
              packages\cli\target\release\gitintel.exe C:\tools\
            </p>
          </CodeBlock>
        </Step>

        <Step n={4} title="Verify the installation">
          <CodeBlock>
            <p>
              <span className="text-green-400">$</span> gitintel --version
            </p>
            <p className="mt-1 text-muted-foreground">gitintel 0.1.0</p>
          </CodeBlock>
        </Step>

        <Step n={5} title="Initialize in your repository">
          <CodeBlock>
            <p>
              <span className="text-green-400">$</span> cd /path/to/your/repo
            </p>
            <p>
              <span className="text-green-400">$</span> gitintel init
            </p>
            <p className="mt-2 text-muted-foreground">
              Initializing GitIntel...
            </p>
            <p className="text-green-400">{"  "}✓ Created ~/.gitintel/</p>
            <p className="text-green-400">
              {"  "}✓ Database initialized
            </p>
            <p className="text-green-400">
              {"  "}✓ Git hooks installed
            </p>
            <p className="mt-1 text-muted-foreground">
              GitIntel initialized successfully!
            </p>
          </CodeBlock>
        </Step>

        <Step n={6} title="Enable Claude Code telemetry (optional)">
          <p className="mb-3 text-sm text-muted-foreground">
            Add these to your shell profile (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              ~/.bashrc
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              ~/.zshrc
            </code>
            ) to capture Claude Code costs automatically:
          </p>
          <CodeBlock>
            <p>
              <span className="text-blue-400">export</span>{" "}
              CLAUDE_CODE_ENABLE_TELEMETRY=1
            </p>
            <p>
              <span className="text-blue-400">export</span>{" "}
              OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
            </p>
            <p>
              <span className="text-blue-400">export</span>{" "}
              OTEL_EXPORTER_OTLP_PROTOCOL=grpc
            </p>
          </CodeBlock>
        </Step>
      </div>

      {/* Coming Soon */}
      <Card className="mt-16 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Package className="h-4 w-4 shrink-0" />
            <span>
              One-liner install script:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                curl -fsSL https://gitintel.com/install | sh
              </code>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Package className="h-4 w-4 shrink-0" />
            <span>
              Homebrew:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                brew install gitintel-ai/tap/gitintel
              </code>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Package className="h-4 w-4 shrink-0" />
            <span>
              Pre-built binaries for Linux AMD64/ARM64, macOS AMD64/ARM64,
              Windows AMD64
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-12 text-center">
        <p className="text-muted-foreground">
          Next:{" "}
          <Link
            href="/docs"
            className="font-medium text-primary underline underline-offset-4"
          >
            Read the documentation
          </Link>{" "}
          to start tracking AI adoption.
        </p>
      </div>
    </div>
  );
}
