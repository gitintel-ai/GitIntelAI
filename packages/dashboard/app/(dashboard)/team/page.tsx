"use client";

import { AdoptionHeatmap } from "@/components/charts/adoption-heatmap";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { KpiCard } from "@/components/kpi-card";
import { LoadingCard } from "@/components/loading-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeamStats } from "@/lib/hooks";
import { Users } from "lucide-react";
import { useState } from "react";

export default function TeamPage() {
  const [period, setPeriod] = useState("30d");
  const { data, isLoading, isError, error, refetch } = useTeamStats(period);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team AI Adoption</h1>
          <p className="text-muted-foreground">Track AI-generated code across your team</p>
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
          message={error?.message || "Failed to load team stats"}
          onRetry={() => refetch()}
        />
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : data && data.totalCommits > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard title="AI Adoption" value={`${data.aiPercentage.toFixed(1)}%`} />
            <KpiCard title="Total Commits" value={data.totalCommits.toLocaleString()} />
            <KpiCard title="AI Lines" value={data.aiLines.toLocaleString()} />
            <KpiCard title="Total Spend" value={`$${data.totalCostUsd.toFixed(2)}`} />
          </div>

          {/* Adoption Heatmap */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Developer AI Adoption</h2>
            <AdoptionHeatmap developers={data.developers} />
          </div>
        </>
      ) : (
        !isError && (
          <EmptyState
            icon={Users}
            title="Track Your Team's AI Adoption"
            description="Commit through GitIntel to see AI vs human code attribution."
            steps={[
              "Install the CLI: npm i -g gitintel",
              "Initialize in your repo: gitintel init",
              "Commit as usual — metrics appear automatically",
            ]}
          />
        )
      )}
    </div>
  );
}
