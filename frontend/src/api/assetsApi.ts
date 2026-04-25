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

  getById: (id: number, params?: Record<string, unknown>) =>
    axiosClient.get<AssetType>(`/assets/${id}/`, { params }),

  reactivate: (id: number, data: { status: string; reason: string }) =>
    axiosClient.post(`/assets/${id}/reactivate/`, data),

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

  createBrand: (data: { name: string; website?: string }) =>
    axiosClient.post<BrandType>("/assets/brands/", data),

  updateBrand: (id: number, data: Partial<{ name: string; website: string }>) =>
    axiosClient.patch<BrandType>(`/assets/brands/${id}/`, data),

  deleteBrand: (id: number) =>
    axiosClient.delete(`/assets/brands/${id}/`),

  getAssetTypes: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AssetTypeType>>("/assets/asset-types/", { params }),

  createAssetType: (data: { name: string; category: string; code_prefix?: string; is_it_managed?: boolean; description?: string }) =>
    axiosClient.post<AssetTypeType>("/assets/asset-types/", data),

  updateAssetType: (id: number, data: Partial<{ name: string; category: string; code_prefix: string; is_it_managed: boolean; description: string }>) =>
    axiosClient.patch<AssetTypeType>(`/assets/asset-types/${id}/`, data),

  deleteAssetType: (id: number) =>
    axiosClient.delete(`/assets/asset-types/${id}/`),

  getAssetModels: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AssetModelType>>("/assets/asset-models/", { params }),

  createAssetModel: (data: { name: string; brand: number }) =>
    axiosClient.post<AssetModelType>("/assets/asset-models/", data),

  updateAssetModel: (id: number, data: Partial<{ name: string; brand: number }>) =>
    axiosClient.patch<AssetModelType>(`/assets/asset-models/${id}/`, data),

  deleteAssetModel: (id: number) =>
    axiosClient.delete(`/assets/asset-models/${id}/`),

  // Código automático
  nextCode: (assetTypeId: number) =>
    axiosClient.get<NextCodeType>(`/assets/asset-types/${assetTypeId}/next-code/`),

  // Choices (ComponentType, AssetCategory, AssetStatus) desde el backend
  getChoices: () =>
    axiosClient.get<{
      component_types:  { value: string; label: string }[];
      asset_categories: { value: string; label: string }[];
      asset_statuses:   { value: string; label: string }[];
    }>("/assets/choices/"),
};
