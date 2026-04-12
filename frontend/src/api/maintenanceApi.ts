import axiosClient from "./axiosClient";
import type { PaginatedResponseType } from "@/@types/common.types";

export interface MaintenanceRecord {
  id: number;
  asset: number;
  asset_code: string;
  asset_name: string;
  maintenance_type: string;
  maintenance_type_display: string;
  status: string;
  status_display: string;
  scheduled_date: string;
  completed_date: string | null;
  next_maintenance: string | null;
  technician: string;
  supplier: string;
  work_order: string;
  description: string;
  findings: string;
  parts_replaced: Record<string, unknown>[];
  cost: string;
  downtime_hours: string;
  created_at: string;
}

export interface MaintenanceFormData {
  asset: number;
  maintenance_type: string;
  status: string;
  scheduled_date: string;
  completed_date?: string;
  next_maintenance?: string;
  technician: string;
  supplier?: string;
  work_order?: string;
  description: string;
  findings?: string;
  parts_replaced?: Record<string, unknown>[];
  cost?: string;
  downtime_hours?: string;
}

export const maintenanceApi = {
  getAll: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<MaintenanceRecord>>("/maintenance/", { params }),

  getById: (id: number) =>
    axiosClient.get<MaintenanceRecord>(`/maintenance/${id}/`),

  create: (data: MaintenanceFormData) =>
    axiosClient.post<MaintenanceRecord>("/maintenance/", data),

  update: (id: number, data: Partial<MaintenanceFormData>) =>
    axiosClient.patch<MaintenanceRecord>(`/maintenance/${id}/`, data),

  delete: (id: number) =>
    axiosClient.delete(`/maintenance/${id}/`),

  getUpcoming: () =>
    axiosClient.get<MaintenanceRecord[]>("/maintenance/upcoming/"),

  getOverdue: () =>
    axiosClient.get<MaintenanceRecord[]>("/maintenance/overdue/"),

  getAssetHistory: (assetId: number) =>
    axiosClient.get<MaintenanceRecord[]>(`/maintenance/asset-history/?asset_id=${assetId}`),
};
