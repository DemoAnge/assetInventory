export interface AreaType {
  id: number;
  code: string;
  name: string;
  floor: string;
  description: string;
  is_active: boolean;
  department: number;
}

export interface DepartmentType {
  id: number;
  agency: number;
  agency_name: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  areas: AreaType[];
}

export interface AgencyType {
  id: number;
  code: string;
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  is_main: boolean;
  is_active: boolean;
  departments: DepartmentType[];
  total_assets: number;
  created_at: string;
  updated_at: string;
}
