import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchBudgetAlerts,
  createBudgetAlert,
  updateBudgetAlert,
  deleteBudgetAlert,
} from "../api";

export function useBudgetAlerts() {
  return useQuery({
    queryKey: ["budget-alerts"],
    queryFn: fetchBudgetAlerts,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBudgetAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget-alerts"] }),
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; type?: string; thresholdUsd?: number; enabled?: boolean }) =>
      updateBudgetAlert(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget-alerts"] }),
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBudgetAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget-alerts"] }),
  });
}
