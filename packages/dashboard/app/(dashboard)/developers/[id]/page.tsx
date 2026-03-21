"use client";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { KpiCard } from "@/components/kpi-card";
import { LoadingCard } from "@/components/loading-card";
import { useDeveloperStats } from "@/lib/hooks";
import { UserX } from "lucide-react";
import { use } from "react";

export default function DeveloperProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const email = decodeURIComponent(id);
  const { data, isLoading, isError, error, refetch } = useDeveloperStats(email);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Developer Profile</h1>
        <p className="text-muted-foreground">{email}</p>
      </div>

      {isError && (
        <ErrorState
          message={error?.message || "Failed to load developer stats"}
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : data && data.commits > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard title="AI Adoption" value={`${data.aiPercentage.toFixed(1)}%`} />
            <KpiCard title="Total Cost" value={`$${data.totalCost.toFixed(2)}`} />
            <KpiCard title="Commits" value={data.commits.toLocaleString()} />
            <KpiCard title="Total Lines" value={data.totalLines.toLocaleString()} />
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Commits</h2>
            {data.recentCommits.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">SHA</th>
                    <th className="text-right p-3">AI Lines</th>
                    <th className="text-right p-3">Human Lines</th>
                    <th className="text-right p-3">AI %</th>
                    <th className="text-right p-3">Cost</th>
                    <th className="text-right p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentCommits.map((c) => (
                    <tr key={c.sha} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-3">
                        <code className="text-xs bg-muted px-1 rounded">{c.sha.slice(0, 8)}</code>
                      </td>
                      <td className="text-right p-3">{c.aiLines}</td>
                      <td className="text-right p-3">{c.humanLines}</td>
                      <td className="text-right p-3">
                        <span className="text-blue-600">{c.aiPct?.toFixed(1) ?? "0.0"}%</span>
                      </td>
                      <td className="text-right p-3">${c.costUsd?.toFixed(2) ?? "0.00"}</td>
                      <td className="text-right p-3 text-sm text-muted-foreground">
                        {new Date(c.authoredAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState message="No commits in this period" />
            )}
          </div>
        </>
      ) : (
        !isError &&
        data && (
          <EmptyState
            icon={UserX}
            title="No Activity Yet"
            description="This developer hasn't synced any commits through GitIntel yet."
          />
        )
      )}
    </div>
  );
}
