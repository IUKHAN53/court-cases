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

export interface CaseQuery {
  search?: string;
  wing?: string;
  status?: string;
  city?: string;
  court?: string;
  case_year?: number | string;
  deadline?: "upcoming" | "overdue" | "none" | "";
  active?: string;
  sort?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}
