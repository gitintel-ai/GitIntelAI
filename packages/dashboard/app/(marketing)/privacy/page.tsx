import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - GitIntel AI",
  description:
    "GitIntel AI privacy policy. Local-first, no code sent to cloud, all data stored in SQLite on your machine.",
};

const EFFECTIVE_DATE = "March 3, 2026";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>

      <div className="prose prose-neutral dark:prose-invert mt-10 max-w-none">
        <h2 className="text-xl font-semibold">1. Local-First Architecture</h2>
        <p className="mt-3 text-muted-foreground">
          GitIntel AI is designed as a local-first tool. All tracking, attribution, and cost data is
          stored exclusively on your machine in a SQLite database at{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">~/.gitintel/gitintel.db</code>. No
          data is sent to any external server unless you explicitly enable cloud sync.
        </p>

        <h2 className="mt-8 text-xl font-semibold">2. What We Collect (Locally)</h2>
        <p className="mt-3 text-muted-foreground">
          The gitintel CLI records the following data locally:
        </p>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          <li>
            <strong>Line number ranges</strong> — which line ranges in a file were produced by an AI
            coding session (e.g.,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">lines 12-45</code>)
          </li>
          <li>
            <strong>Token counts</strong> — input, output, and cache tokens reported by the AI agent
          </li>
          <li>
            <strong>Cost metadata</strong> — USD cost computed from token counts and model pricing
          </li>
          <li>
            <strong>Git metadata</strong> — commit SHA, author email, timestamp, repository path
          </li>
          <li>
            <strong>Agent and model names</strong> — which AI tool and model produced the code
            (e.g., &ldquo;Claude Code&rdquo;, &ldquo;claude-sonnet-4-6&rdquo;)
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">3. What We Never Collect</h2>
        <p className="mt-3 text-muted-foreground">
          GitIntel AI does <strong>not</strong> read, store, or transmit:
        </p>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          <li>Your source code content</li>
          <li>AI prompts or conversation transcripts</li>
          <li>File content of any kind</li>
          <li>Environment variables or secrets</li>
          <li>Any data not explicitly listed in Section 2</li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          Prompts and transcripts never leave your machine unless you explicitly pass{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">--transcript-ref</code> pointing to
          a file you control.
        </p>

        <h2 className="mt-8 text-xl font-semibold">4. Cloud Sync (Opt-In Only)</h2>
        <p className="mt-3 text-muted-foreground">
          Cloud sync is <strong>disabled by default</strong>. You can enable it by setting{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">cloud_sync.enabled = true</code> in
          your config, which requires providing an API key. When enabled, attribution and cost
          session data (but not source code) is synced to your configured endpoint. You control the
          endpoint; by default it points to{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            https://app.gitintel.com/api/v1
          </code>{" "}
          but can be changed to a self-hosted instance.
        </p>

        <h2 className="mt-8 text-xl font-semibold">5. Open Source and Auditability</h2>
        <p className="mt-3 text-muted-foreground">
          GitIntel AI is open source under the MIT License. You can inspect exactly what data is
          collected and how it is stored by reading the source code at{" "}
          <a
            href="https://github.com/gitintel-ai/GitIntelAI"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            github.com/gitintel-ai/GitIntelAI
          </a>
          . The SQLite schema is documented in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            packages/cli/src/store/sqlite.rs
          </code>
          .
        </p>

        <h2 className="mt-8 text-xl font-semibold">6. Dashboard (SaaS — Team Plan)</h2>
        <p className="mt-3 text-muted-foreground">
          If you use the hosted Team Plan dashboard, we collect:
        </p>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          <li>Account email address and authentication tokens (via Clerk)</li>
          <li>Attribution and cost data synced from your team&apos;s CLI instances</li>
          <li>Audit logs of dashboard actions</li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          We do not sell your data. We do not share your data with third parties except as required
          to operate the service (e.g., authentication providers).
        </p>

        <h2 className="mt-8 text-xl font-semibold">7. Self-Hosted Deployments</h2>
        <p className="mt-3 text-muted-foreground">
          Enterprise customers who self-host GitIntel AI retain complete control over all data. No
          data is transmitted to Anthropic or GitIntel AI servers from self-hosted deployments.
        </p>

        <h2 className="mt-8 text-xl font-semibold">8. Contact</h2>
        <p className="mt-3 text-muted-foreground">
          Questions about this policy:{" "}
          <a href="mailto:hello@gitintel.com" className="underline hover:text-foreground">
            hello@gitintel.com
          </a>
        </p>
      </div>
    </div>
  );
}
