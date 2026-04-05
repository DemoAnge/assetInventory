import axiosClient from "./axiosClient";

export interface DashboardStats {
  total_assets: number;
  total_components: number;
  critical_it: number;
  fully_deprecated: number;
  needs_maintenance: number;
  alerts_unresolved: number;
  by_category: { category: string; count: number }[];
  by_status: { status: string; count: number }[];
  by_agency: { agency__name: string; count: number }[];
  recent_activity: {
    object_code: string;
    object_name: string;
    user_email: string;
    action_date: string;
  }[];
  financial: {
    total_assets_with_value?: number;
    fully_depreciated_count?: number;
    sales_count?: number;
  };
  generated_at: string;
}

export interface AssetsByMonth {
  month: string;
  count: number;
}

export const reportsApi = {
  getDashboard: () =>
    axiosClient.get<DashboardStats>("/reports/dashboard/"),

  getAssetsByMonth: () =>
    axiosClient.get<AssetsByMonth[]>("/reports/assets-by-month/"),
};
