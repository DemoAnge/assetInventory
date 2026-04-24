import axiosClient from "./axiosClient";
import type { PaginatedResponseType } from "@/@types/common.types";

export interface MaintenanceStatusLog {
  id: number;
  record: number;
  status: string;
  status_display: string;
  notes: string;
  changed_by: number | null;
  changed_by_name: string | null;
  changed_at: string;
}

export interface Technician {
  id: number;
  name: string;
  is_external: boolean;
  user: number | null;
  user_name: string | null;
  company: string;
  phone: string;
  email: string;
  specialty: string;
  is_active: boolean;
}

export interface TechnicianFormData {
  name: string;
  is_external: boolean;
  user?: number;
  company?: string;
  phone?: string;
  email?: string;
  specialty?: string;
}

export interface MaintenanceRecord {
  id: number;
  asset: number;
  asset_code: string;
  asset_name: string;
  asset_serial_number: string | null;
  maintenance_type: string;
  maintenance_type_display: string;
  status: string;
  status_display: string;
  scheduled_date: string;
  completed_date: string | null;
  next_maintenance: string | null;
  technician: string;
  technician_ref: number | null;
  technician_name: string | null;
  supplier: string;
  work_order: string;
  description: string;
  findings: string;
  parts_replaced: Record<string, unknown>[];
  cost: string;
  downtime_hours: string;
  created_at: string;
  status_logs: MaintenanceStatusLog[];
}

export interface MaintenanceFormData {
  asset: number;
  maintenance_type: string;
  status: string;
  scheduled_date: string;
  completed_date?: string;
  next_maintenance?: string;
  technician?: string;
  technician_ref?: number | null;
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

  // OT auto-generada
  getNextOT: () =>
    axiosClient.get<{ work_order: string }>("/maintenance/next-ot/"),

  // Log de estado
  addStatusLog: (id: number, data: { status: string; notes: string }) =>
    axiosClient.post<MaintenanceStatusLog>(`/maintenance/${id}/add-status-log/`, data),

  // Técnicos
  getTechnicians: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<Technician>>("/maintenance/technicians/", { params }),

  createTechnician: (data: TechnicianFormData) =>
    axiosClient.post<Technician>("/maintenance/technicians/", data),
};
