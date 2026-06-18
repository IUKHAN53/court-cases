export interface CaseRecord {
  id: number;
  wing: string | null;
  case_type: string;
  case_number: number;
  case_year: number;
  court: string;
  city: string;
  case_title: string | null;
  status: string;
  next_hearing_date: string | null; // ISO "YYYY-MM-DD"
  created_at: string;
  updated_at: string;
}

export interface CaseInput {
  wing: string | null;
  case_type: string;
  case_number: number;
  case_year: number;
  court: string;
  city: string;
  case_title: string | null;
  status: string;
  next_hearing_date: string | null;
}

export interface CasesResponse {
  items: CaseRecord[];
  total: number;
}

export interface LabelCount {
  label: string;
  count: number;
}

export interface Summary {
  total: number;
  active: number;
  disposed: number;
  upcoming_count: number;
  upcoming7_count: number;
  overdue_count: number;
  by_status: LabelCount[];
  by_wing: LabelCount[];
  by_city: LabelCount[];
  by_year: LabelCount[];
}

export interface FiltersData {
  wings: string[];
  statuses: string[];
  cities: string[];
  courts: string[];
  years: number[];
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
  permissions: string[];
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface RoleInfo {
  id: number;
  name: string;
  permissions: string[];
  is_system: boolean;
}

export interface RolesResponse {
  roles: RoleInfo[];
  all_permissions: { key: string; label: string }[];
}

export interface UserInput {
  username?: string;
  full_name?: string;
  password?: string;
  role?: string;
  is_active?: boolean;
}

export interface CaseQuery {
  search?: string;
  wing?: string;
  status?: string;
  city?: string;
  court?: string;
  case_year?: number | string;
  deadline?: "upcoming" | "upcoming7" | "overdue" | "none" | "";
  active?: string;
  sort?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}
