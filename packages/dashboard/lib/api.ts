import type {
  TeamStatsResponse,
  DeveloperStatsResponse,
  DevelopersListResponse,
  CostSummaryResponse,
  CostDailyResponse,
  BudgetAlertsResponse,
  BudgetAlert,
  RepositoriesResponse,
  RepositoryDetailResponse,
} from "./api-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer mock_jwt_dashboard",
      "X-Organization-Id": "test-org",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json();
}

// ── Stats ────────────────────────────────────────────────────────

export function fetchTeamStats(period = "30d") {
  return apiFetch<TeamStatsResponse>(
    `/api/v1/stats/team?period=${encodeURIComponent(period)}`
  );
}

export function fetchDevelopersList(period = "30d") {
  return apiFetch<DevelopersListResponse>(
    `/api/v1/stats/developers?period=${encodeURIComponent(period)}`
  );
}

export function fetchDeveloperStats(email: string, period = "30d") {
  return apiFetch<DeveloperStatsResponse>(
    `/api/v1/stats/developer/${encodeURIComponent(email)}?period=${encodeURIComponent(period)}`
  );
}

// ── Cost ─────────────────────────────────────────────────────────

export function fetchCostSummary(period = "30d") {
  return apiFetch<CostSummaryResponse>(
    `/api/v1/cost/summary?period=${encodeURIComponent(period)}`
  );
}

export function fetchCostDaily(period = "30d") {
  return apiFetch<CostDailyResponse>(
    `/api/v1/cost/daily?period=${encodeURIComponent(period)}`
  );
}

// ── Alerts ───────────────────────────────────────────────────────

export function fetchBudgetAlerts() {
  return apiFetch<BudgetAlertsResponse>("/api/v1/alerts/budget");
}

export function createBudgetAlert(body: {
  type: string;
  thresholdUsd: number;
  channels?: Record<string, unknown>;
  enabled?: boolean;
}) {
  return apiFetch<{ success: boolean; alert: BudgetAlert }>(
    "/api/v1/alerts/budget",
    { method: "POST", body: JSON.stringify(body) }
  );
}

export function updateBudgetAlert(
  id: string,
  body: Partial<{ type: string; thresholdUsd: number; enabled: boolean }>
) {
  return apiFetch<{ success: boolean; alert: BudgetAlert }>(
    `/api/v1/alerts/budget/${id}`,
    { method: "PUT", body: JSON.stringify(body) }
  );
}

export function deleteBudgetAlert(id: string) {
  return apiFetch<{ success: boolean }>(
    `/api/v1/alerts/budget/${id}`,
    { method: "DELETE" }
  );
}

// ── Repos ────────────────────────────────────────────────────────

export function fetchRepositories() {
  return apiFetch<RepositoriesResponse>("/api/v1/repos");
}

export function fetchRepositoryDetail(id: string) {
  return apiFetch<RepositoryDetailResponse>(`/api/v1/repos/${id}`);
}
