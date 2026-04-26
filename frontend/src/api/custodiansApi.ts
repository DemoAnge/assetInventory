import axiosClient from "./axiosClient";
import type { CustodianType, CustodianFormType } from "@/@types/custodian.types";
import type { PaginatedResponseType } from "@/@types/common.types";

export const custodiansApi = {
  getAll: (params?: Record<string, unknown>) =>
    axiosClient.get<PaginatedResponseType<CustodianType>>("/custodians/", { params }),

  getById: (id: number) =>
    axiosClient.get<CustodianType>(`/custodians/${id}/`),

  create: (data: CustodianFormType) =>
    axiosClient.post<CustodianType>("/custodians/", data),

  update: (id: number, data: Partial<CustodianFormType>) =>
    axiosClient.patch<CustodianType>(`/custodians/${id}/`, data),

  deactivate: (id: number) =>
    axiosClient.post<{ detail: string }>(`/custodians/${id}/deactivate/`),

  activate: (id: number) =>
    axiosClient.post<{ detail: string }>(`/custodians/${id}/activate/`),
};
