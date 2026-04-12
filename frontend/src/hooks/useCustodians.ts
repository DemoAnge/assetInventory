import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { custodiansApi } from "@/api/custodiansApi";
import type { CustodianFormType } from "@/@types/custodian.types";

const KEYS = {
  all:    ["custodians"] as const,
  lists:  () => [...KEYS.all, "list"] as const,
  detail: (id: number) => [...KEYS.all, id] as const,
};

export function useCustodians(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...KEYS.lists(), params],
    queryFn:  () => custodiansApi.getAll(params).then((r) => r.data),
  });
}

export function useCustodian(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn:  () => custodiansApi.getById(id).then((r) => r.data),
    enabled:  !!id,
  });
}

export function useCreateCustodian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CustodianFormType) =>
      custodiansApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      toast.success("Custodian registered successfully.");
    },
    onError: () => toast.error("Error registering custodian."),
  });
}

export function useUpdateCustodian(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CustodianFormType>) =>
      custodiansApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      toast.success("Custodian updated.");
    },
    onError: () => toast.error("Error updating custodian."),
  });
}

export function useDeactivateCustodian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => custodiansApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      toast.success("Custodian deactivated.");
    },
    onError: () => toast.error("Could not deactivate custodian."),
  });
}

export function useActivateCustodian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => custodiansApi.activate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      toast.success("Custodian reactivated.");
    },
    onError: () => toast.error("Error reactivating custodian."),
  });
}
