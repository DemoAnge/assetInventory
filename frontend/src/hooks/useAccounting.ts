import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { accountingApi } from "@/api/accountingApi";
import type { AssetSaleFormType } from "@/types/accounting.types";

export function useDepreciationSchedules(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["depreciation", params],
    queryFn:  () => accountingApi.getSchedules(params).then((r) => r.data),
  });
}

export function useSimulateDepreciation() {
  return useMutation({
    mutationFn: accountingApi.simulate,
    onError: () => toast.error("Error al simular depreciación."),
  });
}

export function useGenerateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: number) => accountingApi.generateSchedule(assetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["depreciation"] });
      toast.success("Cronograma de depreciación generado.");
    },
    onError: () => toast.error("Error al generar cronograma."),
  });
}

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn:  () => accountingApi.getSales().then((r) => r.data),
  });
}

export function usePreviewSale() {
  return useMutation({
    mutationFn: ({ assetId, salePrice }: { assetId: number; salePrice: string }) =>
      accountingApi.previewSale(assetId, salePrice).then((r) => r.data),
    onError: () => toast.error("Error al calcular previsualización de venta."),
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssetSaleFormType) => accountingApi.createSale(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Venta registrada. Asiento contable generado.");
    },
    onError: () => toast.error("Error al registrar la venta."),
  });
}
