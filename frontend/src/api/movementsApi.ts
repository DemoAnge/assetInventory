import axiosClient from "./axiosClient";
import type { AssetMovementType, MovementFormType } from "@/@types/movement.types";
import type { PaginatedResponseType } from "@/@types/common.types";

export const movementsApi = {
  getAll: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AssetMovementType>>("/movements/", { params }),

  getById: (id: number) =>
    axiosClient.get<AssetMovementType>(`/movements/${id}/`),

  create: (data: MovementFormType) =>
    axiosClient.post<AssetMovementType>("/movements/", data),

  update: (id: number, data: { reason?: string; observations?: string; document_ref?: string }) =>
    axiosClient.patch<AssetMovementType>(`/movements/${id}/`, data),

  getAssetHistory: (assetId: number) =>
    axiosClient.get<AssetMovementType[]>(`/movements/asset-history/?asset_id=${assetId}`),
};
