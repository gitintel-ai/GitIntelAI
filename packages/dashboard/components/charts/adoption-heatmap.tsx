"use client";

import { Progress } from "@/components/ui/progress";

interface Developer {
  email: string;
  aiPercentage: number;
  commits: number;
}

interface AdoptionHeatmapProps {
  developers?: Developer[];
}

export function AdoptionHeatmap({ developers }: AdoptionHeatmapProps) {
  if (!developers || developers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No developer data available
      </div>
    );
  }

  const sorted = [...developers].sort((a, b) => b.aiPercentage - a.aiPercentage);

  return (
    <div className="space-y-3">
      {sorted.map((dev) => (
        <div key={dev.email} className="flex items-center gap-4">
          <div className="w-40 text-sm truncate text-muted-foreground" title={dev.email}>
            {dev.email}
          </div>
          <Progress value={dev.aiPercentage} className="flex-1" />
          <div className="w-16 text-right text-sm font-medium">
            {dev.aiPercentage.toFixed(1)}%
          </div>
          <div className="w-20 text-right text-xs text-muted-foreground">
            {dev.commits} commits
          </div>
        </div>
      ))}
    </div>
  );
}
