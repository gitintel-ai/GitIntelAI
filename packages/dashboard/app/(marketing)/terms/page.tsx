import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - GitIntel AI",
  description: "Terms of Service for GitIntel AI. Open source CLI under MIT License.",
};

const EFFECTIVE_DATE = "March 3, 2026";

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-4xl font-extrabold tracking-tight">Terms of Service</h1>
      <p className="mt-3 text-sm text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>

      <div className="prose prose-neutral dark:prose-invert mt-10 max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold">1. Open Source CLI</h2>
          <p className="mt-3 text-muted-foreground">
            The GitIntel AI CLI (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">gitintel</code>) is free and open
            source software released under the <strong>MIT License</strong>. You may use, copy,
            modify, merge, publish, distribute, sublicense, and/or sell copies of the software
            subject to the terms of that license. The full license text is available in the
            repository at{" "}
            <a
              href="https://github.com/gitintel-ai/GitIntelAI/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              github.com/gitintel-ai/GitIntelAI
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Hosted Dashboard (Team Plan)</h2>
          <p className="mt-3 text-muted-foreground">
            Access to the hosted Team Plan dashboard at{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">app.gitintel.com</code> is
            subject to these terms. By creating an account, you agree to:
          </p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>Use the service only for lawful purposes and in accordance with these Terms</li>
            <li>Not attempt to access data belonging to other organizations</li>
            <li>
              Not use the service to store or transmit source code that you do not have the right to
              share
            </li>
            <li>Keep your API keys and credentials secure</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Acceptable Use</h2>
          <p className="mt-3 text-muted-foreground">You may not use GitIntel AI to:</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>Violate any applicable law or regulation</li>
            <li>Infringe the intellectual property rights of others</li>
            <li>Transmit malicious code, viruses, or disruptive content</li>
            <li>Attempt to gain unauthorized access to our systems or other users&apos; data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Data and Privacy</h2>
          <p className="mt-3 text-muted-foreground">
            Our collection and use of data is described in our{" "}
            <a href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </a>
            . The CLI operates entirely locally; no data leaves your machine unless you configure
            cloud sync.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Service Availability</h2>
          <p className="mt-3 text-muted-foreground">
            We provide the hosted service on an &ldquo;as is&rdquo; basis. We do not guarantee
            uptime or availability. The open-source CLI is fully functional offline and is not
            dependent on the hosted service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Limitation of Liability</h2>
          <p className="mt-3 text-muted-foreground">
            To the maximum extent permitted by law, GitIntel AI and its contributors are not liable
            for any indirect, incidental, special, consequential, or punitive damages arising from
            your use of the software or service. The CLI is provided under the MIT License, which
            disclaims all warranties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Changes to These Terms</h2>
          <p className="mt-3 text-muted-foreground">
            We may update these Terms from time to time. Continued use of the hosted service after
            changes take effect constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Contact</h2>
          <p className="mt-3 text-muted-foreground">
            Questions about these Terms:{" "}
            <a href="mailto:hello@gitintel.com" className="underline hover:text-foreground">
              hello@gitintel.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
