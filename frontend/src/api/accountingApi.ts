import axiosClient from "./axiosClient";
import type { DepreciationSimulationResponseType, SalePreviewType, AssetSaleType, AssetSaleFormType } from "@/types/accounting.types";

export const accountingApi = {
  // Depreciación
  getSchedules: (params?: Record<string, unknown>) =>
    axiosClient.get("/accounting/depreciation/", { params }),

  generateSchedule: (assetId: number) =>
    axiosClient.post("/accounting/depreciation/generate/", { asset_id: assetId }),

  simulate: (data: { purchase_value: string; residual_value?: string; useful_life_years: number; purchase_date: string }) =>
    axiosClient.post<DepreciationSimulationResponseType>("/accounting/depreciation/simulate/", data),

  processMonth: () =>
    axiosClient.post("/accounting/depreciation/process-month/"),

  // Ventas
  getSales: () =>
    axiosClient.get<AssetSaleType[]>("/accounting/sales/"),

  getSale: (id: number) =>
    axiosClient.get<AssetSaleType>(`/accounting/sales/${id}/`),

  createSale: (data: AssetSaleFormType) =>
    axiosClient.post<AssetSaleType>("/accounting/sales/", data),

  previewSale: (assetId: number, salePrice: string) =>
    axiosClient.post<SalePreviewType>("/accounting/sales/preview/", { asset_id: assetId, sale_price: salePrice }),
};
