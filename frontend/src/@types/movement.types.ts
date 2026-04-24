export type MovementType =
  | "TRASLADO" | "PRESTAMO" | "DEVOLUCION"
  | "REASIGNACION" | "INGRESO" | "BAJA";

export interface AssetMovementType {
  id: number;
  asset: number;
  asset_code: string;
  asset_name: string;
  asset_serial_number: string | null;
  movement_type: MovementType;
  movement_type_display: string;
  movement_date: string;
  origin_agency: number | null;
  origin_agency_name: string | null;
  origin_department: number | null;
  origin_area: number | null;
  origin_custodian: number | null;
  origin_custodian_name: string | null;
  dest_agency: number | null;
  dest_agency_name: string | null;
  dest_department: number | null;
  dest_area: number | null;
  dest_custodian: number | null;
  dest_custodian_name: string | null;
  reason: string;
  authorized_by: number | null;
  authorized_by_name: string | null;
  observations: string;
  document_ref: string;
  parent_movement: number | null;
  is_cascade: boolean;
  component_movements: { id: number; asset_code: string; asset_name: string }[];
  created_at: string;
}

export interface MovementFormType {
  asset: number;
  movement_type: MovementType;
  movement_date: string;
  origin_agency?: number | null;
  origin_department?: number | null;
  origin_area?: number | null;
  origin_custodian?: number | null;
  dest_agency?: number | null;
  dest_department?: number | null;
  dest_area?: number | null;
  dest_custodian?: number | null;
  reason: string;
  authorized_by?: number | null;
  observations?: string;
  has_delivery_act?: boolean;
  document_ref?: string;
}
