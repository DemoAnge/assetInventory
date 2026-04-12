import axiosClient from "./axiosClient";
import type { PaginatedResponseType } from "@/@types/common.types";

export interface UserType {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  cedula: string;
  phone: string;
  role: "ADMIN" | "TI" | "CONTABILIDAD" | "AUDITOR";
  is_active: boolean;
  mfa_enabled: boolean;
  mfa_required: boolean;
  agency: number | null;
  agency_name: string | null;
  date_joined: string;
  last_login: string | null;
  last_login_ip: string | null;
}

export interface UserCreateData {
  email: string;
  first_name: string;
  last_name: string;
  cedula?: string;
  phone?: string;
  role: string;
  agency?: number;
  password: string;
  confirm_password: string;
}

export interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  cedula?: string;
  phone?: string;
  agency?: number | null;
  role?: string;
  is_active?: boolean;
}

export const usersApi = {
  getAll: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<UserType>>("/auth/users/", { params }),

  getById: (id: number) =>
    axiosClient.get<UserType>(`/auth/users/${id}/`),

  create: (data: UserCreateData) =>
    axiosClient.post<UserType>("/auth/users/", data),

  update: (id: number, data: UserUpdateData) =>
    axiosClient.patch<UserType>(`/auth/users/${id}/`, data),

  me: () =>
    axiosClient.get<UserType>("/auth/users/me/"),
};
