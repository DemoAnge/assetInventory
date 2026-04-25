export interface UserProfileType {
  first_name:     string;
  last_name:      string;
  email:          string;
  cedula:         string | null;
  phone:          string | null;
  bio:            string;
  theme:          "light" | "dark";
  avatar_url:     string | null;
  background_url: string | null;
  updated_at:     string;
}

export interface SystemInfoType {
  name:        string;
  version:     string;
  description: string;
  license:     string;
  author:      string;
  year:        string;
  repository:  string;
  stack:       Record<string, string>;
}
