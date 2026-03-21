import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team Setup — GitIntel AI Docs",
  description:
    "How to share AI attribution with your team using git notes, cloud sync, and the self-hosted dashboard.",
};

export default function TeamSetupPage() {
  return (
    <article className="max-w-none">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-3">
          Documentation
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">Team Setup</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Share attribution data with your team using git notes sync, optional cloud sync, and the
          self-hosted dashboard.
        </p>
      </div>

      {/* Git Notes */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Sharing Attribution via Git Notes</h2>
        <p className="text-sm text-muted-foreground mb-4">
          By default, git notes do not push/fetch automatically. Configure your remote to sync
          attribution notes alongside code:
        </p>
        <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre mb-4">{`# Configure fetch to pull attribution notes from origin
git config --add remote.origin.fetch '+refs/ai/authorship/*:refs/ai/authorship/*'

# Configure push to include attribution notes
git config --add remote.origin.push 'refs/ai/authorship/*'

# Push attribution for the current branch
git push origin refs/ai/authorship/*`}</div>
        <p className="text-sm text-muted-foreground mb-2">
          Or add this to your{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">.git/config</code> (or{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">~/.gitconfig</code> for all
          repos):
        </p>
        <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre">{`[remote "origin"]
    fetch = +refs/ai/authorship/*:refs/ai/authorship/*
    push  = refs/ai/authorship/*`}</div>
        <p className="text-sm text-muted-foreground mt-3">
          Once configured, <code className="rounded bg-muted px-1 font-mono text-xs">git push</code>{" "}
          and <code className="rounded bg-muted px-1 font-mono text-xs">git fetch</code> will
          automatically sync attribution data. Team members running{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">gitintel stats</code> will see
          attribution for all commits.
        </p>
      </section>

      {/* Cloud Sync */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Cloud Sync (Optional)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          GitIntel can sync attribution and cost data to a central API server for team dashboards.
          This is <strong>off by default</strong>.
        </p>
        <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre mb-3">{`# Enable cloud sync
gitintel config --set cloudSync.enabled=true
gitintel config --set cloudSync.endpoint=https://your-gitintel-server.example.com/api/v1
gitintel config --set cloudSync.apiKey=your-api-key

# Push all local data
gitintel sync

# Dry run to see what would be synced
gitintel sync --dry-run`}</div>
      </section>

      {/* Self-hosted dashboard */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Self-Hosted Dashboard</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The dashboard provides team-level views: adoption heatmaps, cost trend charts, PR cost
          annotations, and budget alerts.
        </p>
        <div className="rounded-lg bg-muted p-4 font-mono text-xs whitespace-pre mb-4">{`# Start the full stack locally (requires Docker)
cd infra/docker
docker compose up -d

# Dashboard: http://localhost:3000
# API server: http://localhost:3001`}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-semibold">Service</th>
                <th className="py-2 text-left font-semibold">URL</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Dashboard", "http://localhost:3000"],
                ["API Server", "http://localhost:3001"],
                ["OTel Collector (gRPC)", "http://localhost:4317"],
                ["OTel Collector (HTTP)", "http://localhost:4318"],
                ["ClickHouse", "http://localhost:8123"],
              ].map(([service, url]) => (
                <tr key={service} className="border-b">
                  <td className="py-2 font-medium">{service}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">{url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Budget alerts */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Budget Alerts</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure budget alerts via the dashboard UI or the API. Alerts can be set per team, per
          developer, or per repository.
        </p>
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <p className="font-medium mb-1">Alert conditions</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Daily spend exceeds threshold</li>
            <li>• Weekly spend exceeds threshold</li>
            <li>• Per-developer spend exceeds threshold</li>
            <li>• AI% adoption drops below minimum</li>
          </ul>
        </div>
      </section>
    </article>
  );
}
