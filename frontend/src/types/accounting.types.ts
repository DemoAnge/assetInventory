export interface DepreciationPeriodType {
  period: string;
  monthly_depreciation: number;
  accumulated: number;
  book_value: number;
}

export interface DepreciationSimulationResponseType {
  purchase_value: number;
  residual_value: number;
  useful_life_years: number;
  monthly_depreciation: number;
  total_periods: number;
  schedule: DepreciationPeriodType[];
}

export type SaleResultType = "GANANCIA" | "PERDIDA";

export interface SalePreviewType {
  asset_code: string;
  asset_name: string;
  purchase_value: number;
  accumulated_dep: number;
  book_value: number;
  sale_price: number;
  sale_result: number;
  result_type: SaleResultType;
  seps_account: string;
  description: string;
}

export interface AssetSaleType {
  id: number;
  asset: number;
  asset_detail: import("./asset.types").AssetType;
  sale_date: string;
  buyer_name: string;
  buyer_id: string;
  invoice_number: string;
  sale_price: string;
  book_value_at_sale: string;
  accumulated_dep: string;
  sale_result: string;
  result_type: SaleResultType;
  result_type_display: string;
  seps_account: string;
  journal_entry_generated: boolean;
  journal_entry_data: Record<string, unknown> | null;
  observations: string;
  created_at: string;
}

export interface AssetSaleFormType {
  asset_id: number;
  sale_date: string;
  buyer_name: string;
  buyer_id: string;
  invoice_number: string;
  sale_price: string;
  observations?: string;
}
