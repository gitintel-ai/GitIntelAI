"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitBranch, GitCommit, DollarSign, Bot, Search } from "lucide-react";
import { LoadingCard } from "@/components/loading-card";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useRepositories } from "@/lib/hooks";
import { FolderGit2 } from "lucide-react";

function getAIBadgeVariant(pct: number): "default" | "secondary" | "destructive" {
  if (pct >= 50) return "default";
  if (pct >= 30) return "secondary";
  return "destructive";
}

export default function ReposPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("commits");
  const { data, isLoading, isError, error, refetch } = useRepositories();

  const repos = data?.repositories ?? [];

  const filteredRepos = repos
    .filter((repo) => repo.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case "aiPct":
          return b.aiPct - a.aiPct;
        case "cost":
          return b.totalCostUsd - a.totalCostUsd;
        case "commits":
        default:
          return b.commits - a.commits;
      }
    });

  const totalRepos = repos.length;
  const totalCost = repos.reduce((sum, r) => sum + r.totalCostUsd, 0);
  const avgAIPct =
    repos.length > 0
      ? repos.reduce((sum, r) => sum + r.aiPct, 0) / repos.length
      : 0;
  const totalCommits = repos.reduce((sum, r) => sum + r.commits, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Repositories</h1>
        <p className="text-muted-foreground">
          AI adoption and cost breakdown by repository
        </p>
      </div>

      {isError && (
        <ErrorState
          message={error?.message || "Failed to load repositories"}
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
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Repos</CardTitle>
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRepos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Commits</CardTitle>
              <GitCommit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalCommits.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg AI %</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgAIPct.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="commits">Commit Count</SelectItem>
            <SelectItem value="aiPct">AI Adoption %</SelectItem>
            <SelectItem value="cost">Total Cost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Repository Table */}
      {isLoading ? (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredRepos.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repository</TableHead>
                  <TableHead>AI Adoption</TableHead>
                  <TableHead className="text-right">Commits</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Developers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepos.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell>
                      <Link
                        href={`/repos/${repo.id}`}
                        className="font-medium hover:underline"
                      >
                        {repo.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={repo.aiPct} className="w-16" />
                        <Badge variant={getAIBadgeVariant(repo.aiPct)}>
                          {repo.aiPct.toFixed(1)}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {repo.commits.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${repo.totalCostUsd.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {repo.developers}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        !isError && (
          <EmptyState
            icon={FolderGit2}
            title="Repository Insights"
            description="Track AI adoption and costs per repository."
            steps={[
              "Run `gitintel init` in your repository",
              "Sync with `gitintel sync`",
              "Repo data appears here automatically",
            ]}
          />
        )
      )}
    </div>
  );
}
