"use client";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamStats } from "@/lib/hooks";
import { Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function DevelopersPage() {
  const [period, setPeriod] = useState("30d");
  const { data, isLoading, isError, error, refetch } = useTeamStats(period);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Developer Leaderboard</h1>
          <p className="text-muted-foreground">AI adoption and cost metrics by developer</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <ErrorState
          message={error?.message || "Failed to load developers"}
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data && data.developers.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Developer</th>
                <th className="text-right p-4">Commits</th>
                <th className="text-right p-4">AI %</th>
                <th className="text-right p-4">Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.developers
                .sort((a, b) => b.commits - a.commits)
                .map((dev) => (
                  <tr key={dev.email} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <Link
                        href={`/developers/${encodeURIComponent(dev.email)}`}
                        className="font-medium hover:underline"
                      >
                        {dev.email}
                      </Link>
                    </td>
                    <td className="text-right p-4">{dev.commits}</td>
                    <td className="text-right p-4">
                      <span className="text-blue-600 font-medium">
                        {dev.aiPercentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right p-4">${dev.costUsd.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        !isError && (
          <EmptyState
            icon={Users}
            title="Developer Leaderboard"
            description="See per-developer AI adoption and cost metrics once commits start flowing."
            steps={[
              "Install the GitIntel CLI",
              "Team members commit through GitIntel",
              "Metrics appear here automatically",
            ]}
          />
        )
      )}
    </div>
  );
}
