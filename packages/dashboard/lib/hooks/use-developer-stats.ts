import { useQuery } from "@tanstack/react-query";
import { fetchDevelopersList, fetchDeveloperStats } from "../api";

export function useDevelopersList(period = "30d") {
  return useQuery({
    queryKey: ["developers-list", period],
    queryFn: () => fetchDevelopersList(period),
  });
}

export function useDeveloperStats(email: string, period = "30d") {
  return useQuery({
    queryKey: ["developer-stats", email, period],
    queryFn: () => fetchDeveloperStats(email, period),
    enabled: !!email,
  });
}
