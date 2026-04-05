import axiosClient from "./axiosClient";
import type { PaginatedResponseType } from "@/types/common.types";

export interface AuditLogEntry {
  id: number;
  user: number | null;
  user_email: string;
  user_role: string;
  action: string;
  action_display: string;
  model: string;
  object_id: number | null;
  object_code: string;
  object_name: string;
  module: string;
  ip_address: string;
  extra_data: Record<string, unknown>;
  action_date: string;
}

export interface AuditSummary {
  periodo: { desde: string; hasta: string };
  total_eventos: number;
  por_accion: { action: string; total: number }[];
  ingresos: number;
  bajas: number;
  modificaciones: number;
  ventas: number;
  traslados: number;
}

export const auditApi = {
  getAll: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AuditLogEntry>>("/audit/", { params }),

  getResumen: (params?: Record<string, unknown>) =>
    axiosClient.get<AuditSummary>("/audit/resumen/", { params }),

  getIngresos: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AuditLogEntry>>("/audit/ingresos/", { params }),

  getBajas: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AuditLogEntry>>("/audit/bajas/", { params }),

  getModificaciones: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AuditLogEntry>>("/audit/modificaciones/", { params }),

  getTimeline: (assetId: number) =>
    axiosClient.get<AuditLogEntry[]>(`/audit/timeline/${assetId}/`),
};
