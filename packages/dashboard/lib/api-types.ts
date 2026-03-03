// Types matching actual server JSON responses

export interface TeamStatsResponse {
  period: string;
  totalCommits: number;
  totalLines: number;
  aiLines: number;
  humanLines: number;
  aiPercentage: number;
  totalCostUsd: number;
  developers: DeveloperSummary[];
}

export interface DeveloperSummary {
  email: string;
  commits: number;
  aiLines: number;
  humanLines: number;
  aiPercentage: number;
  costUsd: number;
}

export interface DevelopersListResponse {
  period: string;
  developers: DeveloperSummary[];
}

export interface DeveloperStatsResponse {
  email: string;
  period: string;
  commits: number;
  aiLines: number;
  humanLines: number;
  totalLines: number;
  totalCost: number;
  aiPercentage: number;
  recentCommits: RecentCommit[];
}

export interface RecentCommit {
  sha: string;
  authorEmail?: string;
  authoredAt: string;
  aiLines: number;
  humanLines: number;
  aiPct: number;
  costUsd: number;
}

export interface CostSummaryResponse {
  period: string;
  totalCostUsd: number;
  byModel: CostBreakdown[];
  byAgent: CostBreakdown[];
}

export interface CostBreakdown {
  model?: string;
  agent?: string;
  costUsd: number;
  percentage: number;
  sessions: number;
}

export interface CostDailyResponse {
  period: string;
  days: { date: string; costUsd: number; sessions: number }[];
}

export interface BudgetAlert {
  id: string;
  orgId: string;
  type: "daily" | "weekly" | "monthly";
  thresholdUsd: number;
  channelsJson: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAlertsResponse {
  alerts: BudgetAlert[];
}

export interface RepositorySummary {
  id: string;
  name: string;
  remoteUrl: string | null;
  defaultBranch: string | null;
  createdAt: string;
  commits: number;
  aiLines: number;
  humanLines: number;
  totalLines: number;
  aiPct: number;
  totalCostUsd: number;
  developers: number;
}

export interface RepositoriesResponse {
  repositories: RepositorySummary[];
}

export interface RepositoryDetailResponse {
  id: string;
  name: string;
  remoteUrl: string | null;
  defaultBranch: string | null;
  createdAt: string;
  commits: number;
  aiLines: number;
  humanLines: number;
  totalLines: number;
  aiPct: number;
  totalCostUsd: number;
  developerCount: number;
  recentCommits: RecentCommit[];
  topContributors: {
    email: string;
    commits: number;
    aiLines: number;
    humanLines: number;
    aiPct: number;
    costUsd: number;
  }[];
  dailyCosts: { date: string; costUsd: number }[];
}
