export type Role = "ADMIN" | "TI" | "CONTABILIDAD" | "AUDITOR";

export interface UserType {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  cedula: string | null;
  phone: string | null;
  role: Role;
  is_active: boolean;
  mfa_enabled: boolean;
  mfa_required: boolean;
  agency: number | null;
  agency_name: string | null;
  date_joined: string;
  last_login: string | null;
  last_login_ip: string | null;
}

export interface LoginRequestType {
  email: string;
  password: string;
}

export interface LoginResponseType {
  access: string;
  refresh: string;
  user: UserType;
}

export interface AuthStateType {
  user: UserType | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  // actions
  setAuth: (user: UserType, access: string, refresh: string) => void;
  setUser: (user: UserType) => void;
  logout: () => void;
}
