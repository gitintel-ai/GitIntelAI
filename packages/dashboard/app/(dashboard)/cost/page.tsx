"use client";

import { CostTrendChart } from "@/components/charts/cost-trend-chart";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { KpiCard } from "@/components/kpi-card";
import { LoadingCard } from "@/components/loading-card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCostDaily, useCostSummary } from "@/lib/hooks";
import { DollarSign as DollarSignIcon } from "lucide-react";
import { useState } from "react";

export default function CostPage() {
  const [period, setPeriod] = useState("30d");
  const summary = useCostSummary(period);
  const daily = useCostDaily(period);

  const isLoading = summary.isLoading || daily.isLoading;
  const isError = summary.isError || daily.isError;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cost Intelligence</h1>
          <p className="text-muted-foreground">
            Track development costs by model, developer, and time
          </p>
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
          message="Failed to load cost data"
          onRetry={() => {
            summary.refetch();
            daily.refetch();
          }}
        />
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : summary.data && summary.data.totalCostUsd > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard title="Total Spend" value={`$${summary.data.totalCostUsd.toFixed(2)}`} />
            <KpiCard title="Models Used" value={String(summary.data.byModel.length)} />
            <KpiCard
              title="Total Sessions"
              value={summary.data.byModel.reduce((s, m) => s + m.sessions, 0).toLocaleString()}
            />
          </div>

          {/* Cost Trend Chart */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Daily Spend</h2>
            <CostTrendChart data={daily.data?.days} />
          </div>

          {/* Model Breakdown Table */}
          {summary.data.byModel.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-xl font-semibold mb-4">Cost by Model</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.data.byModel.map((m) => (
                    <TableRow key={m.model}>
                      <TableCell>
                        <Badge variant="outline">{m.model}</Badge>
                      </TableCell>
                      <TableCell className="text-right">${m.costUsd.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{m.percentage.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{m.sessions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      ) : (
        !isError &&
        !isLoading && (
          <EmptyState
            icon={DollarSignIcon}
            title="Cost Intelligence"
            description="AI development costs are recorded automatically when commits flow through GitIntel."
            steps={[
              "Install the GitIntel CLI",
              "Enable telemetry with CLAUDE_CODE_ENABLE_TELEMETRY=1",
              "Costs appear here as commits are tracked",
            ]}
          />
        )
      )}
    </div>
  );
}
