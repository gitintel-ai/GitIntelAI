import { useQuery } from "@tanstack/react-query";
import { fetchCostSummary, fetchCostDaily } from "../api";

export function useCostSummary(period = "30d") {
  return useQuery({
    queryKey: ["cost-summary", period],
    queryFn: () => fetchCostSummary(period),
  });
}

export function useCostDaily(period = "30d") {
  return useQuery({
    queryKey: ["cost-daily", period],
    queryFn: () => fetchCostDaily(period),
  });
}
