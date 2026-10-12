import type { ITAssetProfileFormData } from "@/@types/it.types";

export interface ITAssetFormData {
  asset_code: string;
  name: string;
  category: "COMPUTO" | "TELECOMUNICACION";
  asset_model: number | null;
  serial_number: string;
  color: string;
  observations: string;
  warranty_expiry: string;
  agency: number | null;
  department: number | null;
  area: number | null;
  custodian: number | null;
  is_critical_it: boolean;
  purchase_value: string;
  purchase_date: string;
}

const TODAY = new Date().toISOString().slice(0, 10);

export const ASSET_INITIAL: ITAssetFormData = {
  asset_code: "", name: "", category: "COMPUTO",
  asset_model: null, serial_number: "", color: "", observations: "",
  warranty_expiry: "", agency: null, department: null, area: null,
  custodian: null, is_critical_it: false,
  purchase_value: "0.00", purchase_date: TODAY,
};

export const IT_INITIAL: Omit<ITAssetProfileFormData, "asset"> = {
  hostname: "", ip_address: "", mac_address: "",
  os_name: "", os_version: "", processor: "",
  ram_gb: undefined, storage_gb: undefined,
  risk_level: "BAJO", is_server: false, is_network_device: false,
  last_scan_date: "", antivirus: "", notes: "",
};
