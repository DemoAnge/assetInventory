import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { movementsApi } from "@/api/movementsApi";
import type { MovementFormType } from "@/@types/movement.types";

export const MOVEMENT_KEYS = {
  all: ["movements"] as const,
  lists: () => [...MOVEMENT_KEYS.all, "list"] as const,
  detail: (id: number) => [...MOVEMENT_KEYS.all, id] as const,
};

export function useMovements(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...MOVEMENT_KEYS.lists(), params],
    queryFn: () => movementsApi.getAll(params).then((r) => r.data),
  });
}

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MovementFormType) => movementsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MOVEMENT_KEYS.all });
      toast.success("Movimiento registrado.");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err?.response?.data?.detail ?? "Error al registrar el movimiento.");
    },
  });
}
