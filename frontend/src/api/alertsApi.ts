import axiosClient from "./axiosClient";
import type { PaginatedResponseType } from "@/types/common.types";

export interface AlertType {
  id: number;
  alert_type: string;
  alert_type_display: string;
  severity: string;
  severity_display: string;
  title: string;
  message: string;
  asset: number | null;
  asset_code: string;
  resolved_by: number | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  resolution_note: string;
  is_read: boolean;
  is_resolved: boolean;
  target_roles: string[];
  extra_data: Record<string, unknown>;
  created_at: string;
}

export interface AlertSummary {
  total_unresolved: number;
  critica: number;
  alta: number;
  media: number;
  baja: number;
  unread: number;
}

export const alertsApi = {
  getAll: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AlertType>>("/alerts/", { params }),

  getSummary: () =>
    axiosClient.get<AlertSummary>("/alerts/summary/"),

  markRead: (id: number) =>
    axiosClient.post(`/alerts/${id}/mark-read/`),

  markAllRead: () =>
    axiosClient.post("/alerts/mark-all-read/"),

  resolve: (id: number, data: { resolution_note?: string }) =>
    axiosClient.post(`/alerts/${id}/resolve/`, data),

  runEngine: () =>
    axiosClient.post("/alerts/run-engine/"),
};
