export interface CustodianType {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  id_number: string | null;
  phone: string | null;
  position: string;
  agency: number | null;
  agency_name: string | null;
  agency_code: string | null;
  is_active: boolean;
  assets_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustodianFormType {
  first_name: string;
  last_name: string;
  id_number: string | null;
  phone: string | null;
  position: string;
  agency: number | null;
  is_active: boolean;
}
