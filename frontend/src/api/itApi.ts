import axiosClient from "./axiosClient";
import type { PaginatedResponseType } from "@/types/common.types";

export interface ITAssetProfile {
  id: number;
  asset: number;
  asset_code: string;
  asset_name: string;
  hostname: string;
  ip_address: string | null;
  mac_address: string;
  os_name: string;
  os_version: string;
  processor: string;
  ram_gb: number | null;
  storage_gb: number | null;
  risk_level: string;
  is_server: boolean;
  is_network_device: boolean;
  last_scan_date: string | null;
  antivirus: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ITAssetProfileFormData {
  asset: number;
  hostname?: string;
  ip_address?: string;
  mac_address?: string;
  os_name?: string;
  os_version?: string;
  processor?: string;
  ram_gb?: number;
  storage_gb?: number;
  risk_level: string;
  is_server?: boolean;
  is_network_device?: boolean;
  last_scan_date?: string;
  antivirus?: string;
  notes?: string;
}

export interface SoftwareLicense {
  id: number;
  software_name: string;
  version: string;
  license_key: string;
  license_type: string;
  license_type_display: string;
  seats: number;
  used_seats: number;
  available_seats: number;
  vendor: string;
  purchase_date: string | null;
  expiry_date: string | null;
  cost: string;
  assets: number[];
  asset_codes: string[];
  notes: string;
  is_expired: boolean;
  created_at: string;
}

export interface SoftwareLicenseFormData {
  software_name: string;
  version?: string;
  license_key?: string;
  license_type: string;
  seats: number;
  used_seats?: number;
  vendor?: string;
  purchase_date?: string;
  expiry_date?: string;
  cost?: string;
  assets?: number[];
  notes?: string;
}

export const itApi = {
  // IT Asset Profiles
  getAllProfiles: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<ITAssetProfile>>("/it/profiles/", { params }),

  getProfileById: (id: number) =>
    axiosClient.get<ITAssetProfile>(`/it/profiles/${id}/`),

  createProfile: (data: ITAssetProfileFormData) =>
    axiosClient.post<ITAssetProfile>("/it/profiles/", data),

  updateProfile: (id: number, data: Partial<ITAssetProfileFormData>) =>
    axiosClient.patch<ITAssetProfile>(`/it/profiles/${id}/`, data),

  deleteProfile: (id: number) =>
    axiosClient.delete(`/it/profiles/${id}/`),

  getCritical: () =>
    axiosClient.get<ITAssetProfile[]>("/it/profiles/critical/"),

  getPendingScan: () =>
    axiosClient.get<ITAssetProfile[]>("/it/profiles/pending-scan/"),

  // Software Licenses
  getAllLicenses: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<SoftwareLicense>>("/it/licenses/", { params }),

  getLicenseById: (id: number) =>
    axiosClient.get<SoftwareLicense>(`/it/licenses/${id}/`),

  createLicense: (data: SoftwareLicenseFormData) =>
    axiosClient.post<SoftwareLicense>("/it/licenses/", data),

  updateLicense: (id: number, data: Partial<SoftwareLicenseFormData>) =>
    axiosClient.patch<SoftwareLicense>(`/it/licenses/${id}/`, data),

  deleteLicense: (id: number) =>
    axiosClient.delete(`/it/licenses/${id}/`),

  getExpiring: () =>
    axiosClient.get<SoftwareLicense[]>("/it/licenses/expiring/"),

  getExpired: () =>
    axiosClient.get<SoftwareLicense[]>("/it/licenses/expired/"),
};
