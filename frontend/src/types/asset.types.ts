export type AssetCategory =
  | "COMPUTO" | "VEHICULO" | "MAQUINARIA"
  | "MUEBLE"  | "INMUEBLE" | "TELECOMUNICACION" | "OTRO";

export type AssetStatus =
  | "ACTIVO" | "INACTIVO" | "MANTENIMIENTO"
  | "VENDIDO" | "PRESTADO" | "ROBADO";

export type ComponentType =
  | "MONITOR" | "TECLADO" | "MOUSE" | "PARLANTE"
  | "ANTENA_WIFI" | "UPS" | "DOCKING" | "PATCH_PANEL"
  | "KVM" | "RACK" | "SWITCH" | "DISCO" | "MEMORIA"
  | "IMPRESORA" | "CAMARA" | "OTRO";

export interface ComponentType_ {
  id: number;
  asset_code: string;
  name: string;
  brand: string;
  model_name: string;
  serial_number: string | null;
  component_type: ComponentType;
  component_type_display: string;
  status: AssetStatus;
  status_display: string;
  is_active: boolean;
}

export interface DepreciationInfoType {
  years: number;
  rate: number;
}

export interface AssetType {
  id: number;
  asset_code: string;
  serial_number: string | null;
  name: string;
  brand: string;
  model_name: string;
  color: string;
  observations: string;
  category: AssetCategory;
  category_display: string;
  status: AssetStatus;
  status_display: string;

  parent_asset: number | null;
  parent_code: string | null;
  component_type: ComponentType | null;
  is_component: boolean;
  components: ComponentType_[];
  components_count: number;

  agency: number | null;
  agency_name: string | null;
  department: number | null;
  department_name: string | null;
  area: number | null;
  area_name: string | null;
  custodian: number | null;
  custodian_name: string | null;

  purchase_value: string;
  residual_value: string;
  current_value: string | null;
  accumulated_depreciation: string;
  monthly_depreciation: number;
  depreciation_info: DepreciationInfoType;

  purchase_date: string;
  activation_date: string | null;
  deactivation_date: string | null;
  warranty_expiry: string | null;

  useful_life_years: number | null;
  depreciation_rate: string | null;
  is_fully_depreciated: boolean;

  invoice_number: string;
  supplier: string;
  seps_account_code: string;
  qr_uuid: string;

  is_active: boolean;
  is_critical_it: boolean;
  requires_maintenance: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetFormType {
  asset_code: string;
  serial_number?: string;
  name: string;
  brand?: string;
  model_name?: string;
  color?: string;
  observations?: string;
  category: AssetCategory;
  status?: AssetStatus;
  parent_asset?: number | null;
  component_type?: ComponentType | null;
  agency?: number | null;
  department?: number | null;
  area?: number | null;
  custodian?: number | null;
  purchase_value: string;
  residual_value?: string;
  purchase_date: string;
  activation_date?: string;
  warranty_expiry?: string;
  useful_life_years?: number;
  invoice_number?: string;
  supplier?: string;
  seps_account_code?: string;
  is_critical_it?: boolean;
}

export interface AssetDeactivateFormType {
  reason: string;
  deactivation_date: string;
}

export interface ValidateDeactivationType {
  can_deactivate: boolean;
  active_components_count: number;
  active_components: ComponentType_[];
  message: string;
}
