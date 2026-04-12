export interface CustodianType {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  id_number: string;
  position: string;
  is_active: boolean;
  assets_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustodianFormType {
  first_name: string;
  last_name: string;
  id_number: string;
  position: string;
}
