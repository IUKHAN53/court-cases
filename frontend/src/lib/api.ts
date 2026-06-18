import type {
  AuthUser,
  CaseInput,
  CaseQuery,
  CaseRecord,
  CasesResponse,
  FiltersData,
  ImportResult,
  RoleInfo,
  RolesResponse,
  Summary,
  TokenResponse,
  UserInput,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

const TOKEN_KEY = "court_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const hadToken = !!getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(hadToken ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
    ...init,
  });
  if (res.status === 401 && hadToken) {
    // Token expired/invalid — force re-login.
    clearToken();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // ---- auth ----
  getToken,
  setToken,
  clearToken,
  async login(username: string, password: string): Promise<TokenResponse> {
    const res = await req<TokenResponse>(`/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setToken(res.access_token);
    return res;
  },
  async bootstrap(data: { username: string; password: string; full_name: string }) {
    return req<{ ok: boolean }>(`/api/auth/bootstrap`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  me: () => req<AuthUser>(`/api/auth/me`),

  // ---- users & roles (admin) ----
  listUsers: () => req<AuthUser[]>(`/api/users`),
  createUser: (data: UserInput) =>
    req<AuthUser>(`/api/users`, { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: number, data: UserInput) =>
    req<AuthUser>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUser: (id: number) => req<void>(`/api/users/${id}`, { method: "DELETE" }),
  getRoles: () => req<RolesResponse>(`/api/roles`),
  updateRole: (id: number, permissions: string[]) =>
    req<RoleInfo>(`/api/roles/${id}`, { method: "PUT", body: JSON.stringify({ permissions }) }),
  createRole: (name: string, permissions: string[]) =>
    req<RoleInfo>(`/api/roles`, { method: "POST", body: JSON.stringify({ name, permissions }) }),

  // ---- cases ----
  listCases: (query: CaseQuery = {}) =>
    req<CasesResponse>(`/api/cases${qs(query as Record<string, unknown>)}`),
  createCase: (data: CaseInput) =>
    req<CaseRecord>(`/api/cases`, { method: "POST", body: JSON.stringify(data) }),
  updateCase: (id: number, data: Partial<CaseInput>) =>
    req<CaseRecord>(`/api/cases/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCase: (id: number) => req<void>(`/api/cases/${id}`, { method: "DELETE" }),

  // ---- reports ----
  summary: () => req<Summary>(`/api/reports/summary`),
  upcoming: (days = 30) => req<CaseRecord[]>(`/api/reports/upcoming${qs({ days })}`),
  filters: () => req<FiltersData>(`/api/filters`),

  // ---- import / export ----
  async importFile(file: File): Promise<ImportResult> {
    const form = new FormData();
    form.append("file", file);
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/import`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    return res.json();
  },

  // Export is gated, so fetch it with the auth header and trigger a download.
  async downloadExport(query: CaseQuery = {}): Promise<void> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/export${qs(query as Record<string, unknown>)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "court_cases_export.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
