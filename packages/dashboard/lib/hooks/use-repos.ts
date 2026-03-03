import { useQuery } from "@tanstack/react-query";
import { fetchRepositories, fetchRepositoryDetail } from "../api";

export function useRepositories() {
  return useQuery({
    queryKey: ["repositories"],
    queryFn: fetchRepositories,
  });
}

export function useRepositoryDetail(id: string) {
  return useQuery({
    queryKey: ["repository", id],
    queryFn: () => fetchRepositoryDetail(id),
    enabled: !!id,
  });
}
