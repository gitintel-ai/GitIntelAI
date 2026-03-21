"use client";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingCard } from "@/components/loading-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRepositoryDetail } from "@/lib/hooks";
import { ArrowLeft, Bot, DollarSign, GitCommit, Users } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function RepoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, error, refetch } = useRepositoryDetail(id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/repos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {isLoading ? "Loading..." : (data?.name ?? "Repository")}
          </h1>
          {data?.remoteUrl && <p className="text-muted-foreground">{data.remoteUrl}</p>}
        </div>
      </div>

      {isError && (
        <ErrorState
          message={error?.message || "Failed to load repository"}
          onRetry={() => refetch()}
        />
      )}

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">AI Adoption</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.aiPct.toFixed(1)}%</div>
                <Progress value={data.aiPct} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {data.aiLines.toLocaleString()} AI / {data.totalLines.toLocaleString()} total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${data.totalCostUsd.toFixed(2)}</div>
                {data.commits > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ${(data.totalCostUsd / data.commits).toFixed(2)} avg per commit
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Commits</CardTitle>
                <GitCommit className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.commits}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Contributors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.developerCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="commits">Commits</TabsTrigger>
              <TabsTrigger value="contributors">Contributors</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.dailyCosts.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.dailyCosts}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          formatter={(v: number) => [`$${v.toFixed(2)}`, "Cost"]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="costUsd"
                          stroke="#6366f1"
                          strokeWidth={2}
                          name="Cost ($)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No cost data yet" />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commits">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Commits</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.recentCommits.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SHA</TableHead>
                          <TableHead>Author</TableHead>
                          <TableHead>AI %</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.recentCommits.map((commit) => (
                          <TableRow key={commit.sha}>
                            <TableCell>
                              <code className="text-xs bg-muted px-1 rounded">
                                {commit.sha.slice(0, 8)}
                              </code>
                            </TableCell>
                            <TableCell>{commit.authorEmail}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={commit.aiPct ?? 0} className="w-12" />
                                <span className="text-sm">{(commit.aiPct ?? 0).toFixed(0)}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              ${(commit.costUsd ?? 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(commit.authoredAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState message="No commits yet" />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contributors">
              <Card>
                <CardHeader>
                  <CardTitle>Top Contributors</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.topContributors.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Developer</TableHead>
                          <TableHead className="text-right">Commits</TableHead>
                          <TableHead>AI Adoption</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topContributors.map((dev) => (
                          <TableRow key={dev.email}>
                            <TableCell>
                              <Link
                                href={`/developers/${encodeURIComponent(dev.email)}`}
                                className="hover:underline"
                              >
                                {dev.email}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right">{dev.commits}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={dev.aiPct} className="w-16" />
                                <span className="text-sm">{dev.aiPct.toFixed(0)}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">${dev.costUsd.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState message="No contributors yet" />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
