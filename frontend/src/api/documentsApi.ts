import axiosClient from "./axiosClient";
import type { PaginatedResponseType } from "@/@types/common.types";

export interface AssetDocument {
  id: number;
  asset: number;
  asset_code: string;
  asset_name: string;
  asset_serial_number: string | null;
  title: string;
  document_type: string;
  document_type_display: string;
  file: string;
  file_url: string | null;
  file_size: number;
  file_size_kb: number;
  notes: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  updated_by_name: string | null;
  updated_at: string;
  created_at: string;
}

export const documentsApi = {
  getAll: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AssetDocument>>("/documents/", { params }),

  getByAsset: (assetId: number) =>
    axiosClient.get<AssetDocument[]>(`/documents/by-asset/?asset_id=${assetId}`),

  upload: (data: FormData) =>
    axiosClient.post<AssetDocument>("/documents/", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (id: number, data: FormData | Record<string, string>) => {
    if (data instanceof FormData) {
      return axiosClient.patch<AssetDocument>(`/documents/${id}/`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    return axiosClient.patch<AssetDocument>(`/documents/${id}/`, data);
  },

  delete: (id: number) => axiosClient.delete(`/documents/${id}/`),
};
