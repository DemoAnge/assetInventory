export interface ITComponent {
  id: number;
  asset_code: string;
  name: string;
  component_type: string | null;
  component_type_display: string | null;
  serial_number: string | null;
  status: string;
}

export interface ITAssetProfile {
  id: number;
  asset: number;
  asset_code: string;
  asset_name: string;
  asset_category: string;
  asset_status: string;
  asset_brand: string | null;
  asset_model_name: string | null;
  asset_type_name: string | null;
  asset_serial: string | null;
  agency_name: string | null;
  custodian_name: string | null;
  components_count: number;
  components: ITComponent[];
  software_count: number;
  hostname: string;
  ip_address: string | null;
  mac_address: string;
  os_name: string;
  os_version: string;
  processor: string;
  ram_gb: number | null;
  storage_gb: number | null;
  risk_level: string;
  risk_level_display: string;
  is_server: boolean;
  is_network_device: boolean;
  last_scan_date: string | null;
  antivirus: string;
  notes: string;
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
