import axiosClient from "./axiosClient";
import type {
  AssetType, AssetFormType, AssetDeactivateFormType, ValidateDeactivationType,
  AssetTypeType, AssetModelType, BrandType, NextCodeType,
} from "@/@types/asset.types";
import type { PaginatedResponseType } from "@/@types/common.types";

export const assetsApi = {
  // CRUD
  getAll: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AssetType>>("/assets/", { params }),

  getById: (id: number) =>
    axiosClient.get<AssetType>(`/assets/${id}/`),

  create: (data: AssetFormType) =>
    axiosClient.post<AssetType>("/assets/", data),

  update: (id: number, data: Partial<AssetFormType>) =>
    axiosClient.patch<AssetType>(`/assets/${id}/`, data),

  delete: (id: number) =>
    axiosClient.delete(`/assets/${id}/`),

  // Componentes
  getComponents: (id: number) =>
    axiosClient.get(`/assets/${id}/components/`),

  addComponent: (parentId: number, data: AssetFormType) =>
    axiosClient.post<AssetType>(`/assets/${parentId}/components/`, data),

  removeComponent: (parentId: number, compId: number) =>
    axiosClient.delete(`/assets/${parentId}/components/${compId}/`),

  attachComponent: (parentId: number, data: { component_id: number; component_type: string }) =>
    axiosClient.post<AssetType>(`/assets/${parentId}/attach-component/`, data),

  // Baja
  validateDeactivation: (id: number) =>
    axiosClient.get<ValidateDeactivationType>(`/assets/${id}/validate-deactivation/`),

  deactivate: (id: number, data: AssetDeactivateFormType) =>
    axiosClient.post(`/assets/${id}/deactivate/`, data),

  // QR
  getQr: (id: number) =>
    axiosClient.get<{ asset_code: string; qr_uuid: string; qr_base64: string; qr_data: string }>(`/assets/${id}/qr/`),

  getByQr: (uuid: string) =>
    axiosClient.get<AssetType>(`/assets/by-qr/?uuid=${uuid}`),

  // Catálogos
  getBrands: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<BrandType>>("/assets/brands/", { params }),

  createBrand: (data: { name: string; country?: string; website?: string }) =>
    axiosClient.post<BrandType>("/assets/brands/", data),

  getAssetTypes: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AssetTypeType>>("/assets/asset-types/", { params }),

  getAssetModels: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AssetModelType>>("/assets/asset-models/", { params }),

  createAssetModel: (data: { name: string; brand: number; asset_type: number; specs?: string }) =>
    axiosClient.post<AssetModelType>("/assets/asset-models/", data),

  // Código automático
  nextCode: (assetTypeId: number) =>
    axiosClient.get<NextCodeType>(`/assets/asset-types/${assetTypeId}/next-code/`),
};
