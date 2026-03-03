import { useQuery } from "@tanstack/react-query";
import { fetchTeamStats } from "../api";

export function useTeamStats(period = "30d") {
  return useQuery({
    queryKey: ["team-stats", period],
    queryFn: () => fetchTeamStats(period),
  });
}
