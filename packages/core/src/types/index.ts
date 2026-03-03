// GitIntel Core Types

// ════════════════════════════════════════════════════════════════
// Attribution Types
// ════════════════════════════════════════════════════════════════

export interface Attribution {
  commitSha: string;
  repoPath: string;
  authorEmail: string;
  authoredAt: Date;
  aiLines: number;
  humanLines: number;
  totalLines: number;
  aiPct: number;
  totalCostUsd: number;
  logJson: string;
}

export interface AuthorshipLog {
  schemaVersion: string;
  commit: string;
  author: string;
  timestamp: string;
  agentSessions: AgentSession[];
  summary: AttributionSummary;
}

export interface AgentSession {
  agent: string;
  model: string;
  tokens: TokenUsage;
  costUsd: number;
  transcriptRef?: string;
  files: Record<string, FileAttribution>;
}

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface FileAttribution {
  aiLines: [number, number][];
  humanLines: [number, number][];
}

export interface AttributionSummary {
  totalLines: number;
  aiLines: number;
  humanLines: number;
  aiPct: number;
  totalCostUsd: number;
}

// ════════════════════════════════════════════════════════════════
// Cost Types
// ════════════════════════════════════════════════════════════════

export interface CostSession {
  sessionId: string;
  commitSha?: string;
  agent: string;
  model: string;
  projectPath: string;
  startedAt: Date;
  endedAt?: Date;
  tokensIn: number;
  tokensOut: number;
  tokensCache: number;
  costUsd: number;
}

export interface ModelPricing {
  model: string;
  inputPerMtok: number;
  outputPerMtok: number;
  cacheWritePerMtok: number;
  cacheReadPerMtok: number;
}

export interface CostSummary {
  period?: string;
  commit?: string;
  branch?: string;
  developer?: string;
  totalCostUsd: number;
  byModel: { model: string; costUsd: number; percentage: number }[];
  byAgent: { agent: string; costUsd: number; percentage: number }[];
  commits: number;
  aiLines: number;
  totalLines: number;
  aiPercentage: number;
}

// ════════════════════════════════════════════════════════════════
// Memory Types
// ════════════════════════════════════════════════════════════════

export interface Memory {
  key: string;
  value: string;
  category: string;
  tokenCount: number;
  lastUsedAt: Date;
  useCount: number;
  createdAt: Date;
}

export type MemoryCategory = "architecture" | "conventions" | "dependencies" | "general";

// ════════════════════════════════════════════════════════════════
// API Types
// ════════════════════════════════════════════════════════════════

export interface User {
  id: string;
  email: string;
  name?: string;
  clerkId: string;
  orgId: string;
  role: UserRole;
  createdAt: Date;
}

export type UserRole = "admin" | "manager" | "developer";

export interface Organization {
  id: string;
  name: string;
  settingsJson: Record<string, unknown>;
  createdAt: Date;
}

export interface Repository {
  id: string;
  orgId: string;
  name: string;
  remoteUrl?: string;
  defaultBranch: string;
  createdAt: Date;
}

export interface BudgetAlert {
  id: string;
  orgId: string;
  type: "daily" | "weekly" | "monthly";
  thresholdUsd: number;
  channelsJson: AlertChannels;
  enabled: boolean;
  createdAt: Date;
}

export interface AlertChannels {
  slack?: string;
  email?: string[];
}

// ════════════════════════════════════════════════════════════════
// Stats Types
// ════════════════════════════════════════════════════════════════

export interface TeamStats {
  period: string;
  totalCommits: number;
  totalLines: number;
  aiLines: number;
  humanLines: number;
  aiPercentage: number;
  totalCostUsd: number;
  developers: DeveloperStats[];
}

export interface DeveloperStats {
  email: string;
  name?: string;
  commits: number;
  aiLines: number;
  humanLines: number;
  aiPercentage: number;
  costUsd: number;
}

// ════════════════════════════════════════════════════════════════
// Checkpoint Types
// ════════════════════════════════════════════════════════════════

export interface Checkpoint {
  id: string;
  sessionId: string;
  agent: string;
  model: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  timestamp: Date;
  tokensIn: number;
  tokensOut: number;
  tokensCacheRead: number;
  tokensCacheWrite: number;
  costUsd: number;
  transcriptRef?: string;
}

// ════════════════════════════════════════════════════════════════
// API Request/Response Types
// ════════════════════════════════════════════════════════════════

export interface SyncAttributionRequest {
  commitSha: string;
  repoPath: string;
  authorEmail: string;
  authoredAt: string;
  aiLines: number;
  humanLines: number;
  totalLines: number;
  aiPct: number;
  totalCostUsd: number;
  logJson?: string;
}

export interface SyncCostRequest {
  sessionId: string;
  commitSha?: string;
  agent: string;
  model: string;
  projectPath: string;
  startedAt: string;
  endedAt?: string;
  tokensIn: number;
  tokensOut: number;
  tokensCache: number;
  costUsd: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
