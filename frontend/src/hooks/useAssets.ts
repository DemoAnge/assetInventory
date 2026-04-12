import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { assetsApi } from "@/api/assetsApi";
import type { AssetFormType, AssetDeactivateFormType } from "@/@types/asset.types";

const KEYS = {
  all:    ["assets"] as const,
  lists:  () => [...KEYS.all, "list"] as const,
  detail: (id: number) => [...KEYS.all, id] as const,
  components: (id: number) => [...KEYS.all, id, "components"] as const,
  qr:     (id: number) => [...KEYS.all, id, "qr"] as const,
};

export function useAssets(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...KEYS.lists(), params],
    queryFn:  () => assetsApi.getAll(params).then((r) => r.data),
  });
}

export function useAsset(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn:  () => assetsApi.getById(id).then((r) => r.data),
    enabled:  !!id,
  });
}

export function useAssetComponents(id: number) {
  return useQuery({
    queryKey: KEYS.components(id),
    queryFn:  () => assetsApi.getComponents(id).then((r) => r.data),
    enabled:  !!id,
  });
}

export function useAssetQr(id: number) {
  return useQuery({
    queryKey: KEYS.qr(id),
    queryFn:  () => assetsApi.getQr(id).then((r) => r.data),
    enabled:  !!id,
    staleTime: Infinity,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssetFormType) => assetsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      toast.success("Activo creado correctamente.");
    },
    onError: () => toast.error("Error al crear el activo."),
  });
}

export function useUpdateAsset(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AssetFormType>) => assetsApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      toast.success("Activo actualizado.");
    },
    onError: () => toast.error("Error al actualizar el activo."),
  });
}

export function useDeactivateAsset(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssetDeactivateFormType) => assetsApi.deactivate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success("Activo dado de baja correctamente.");
    },
    onError: () => toast.error("No se pudo dar de baja el activo."),
  });
}

export function useAddComponent(parentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssetFormType) => assetsApi.addComponent(parentId, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.components(parentId) });
      qc.invalidateQueries({ queryKey: KEYS.detail(parentId) });
      toast.success("Componente agregado.");
    },
    onError: () => toast.error("Error al agregar componente."),
  });
}

export function useRemoveComponent(parentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (compId: number) => assetsApi.removeComponent(parentId, compId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.components(parentId) });
      qc.invalidateQueries({ queryKey: KEYS.detail(parentId) });
      toast.success("Componente desasociado.");
    },
  });
}
