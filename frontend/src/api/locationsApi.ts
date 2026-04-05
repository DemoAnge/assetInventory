import axiosClient from "./axiosClient";
import type { AgencyType, DepartmentType, AreaType } from "@/types/location.types";
import type { PaginatedResponseType } from "@/types/common.types";

export const locationsApi = {
  // Agencias
  getAgencies: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AgencyType>>("/locations/agencies/", { params }),
  getAgency: (id: number) =>
    axiosClient.get<AgencyType>(`/locations/agencies/${id}/`),
  createAgency: (data: Partial<AgencyType>) =>
    axiosClient.post<AgencyType>("/locations/agencies/", data),
  updateAgency: (id: number, data: Partial<AgencyType>) =>
    axiosClient.patch<AgencyType>(`/locations/agencies/${id}/`, data),

  // Departamentos
  getDepartments: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<DepartmentType>>("/locations/departments/", { params }),
  createDepartment: (data: Partial<DepartmentType>) =>
    axiosClient.post<DepartmentType>("/locations/departments/", data),
  updateDepartment: (id: number, data: Partial<DepartmentType>) =>
    axiosClient.patch<DepartmentType>(`/locations/departments/${id}/`, data),

  // Áreas
  getAreas: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<AreaType>>("/locations/areas/", { params }),
  createArea: (data: Partial<AreaType>) =>
    axiosClient.post<AreaType>("/locations/areas/", data),
  updateArea: (id: number, data: Partial<AreaType>) =>
    axiosClient.patch<AreaType>(`/locations/areas/${id}/`, data),
};
