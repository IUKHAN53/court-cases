import type {
  CaseInput,
  CaseQuery,
  CaseRecord,
  CasesResponse,
  FiltersData,
  ImportResult,
  Summary,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

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
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
    ...init,
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
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listCases: (query: CaseQuery = {}) =>
    req<CasesResponse>(`/api/cases${qs(query as Record<string, unknown>)}`),

  createCase: (data: CaseInput) =>
    req<CaseRecord>(`/api/cases`, { method: "POST", body: JSON.stringify(data) }),

  updateCase: (id: number, data: Partial<CaseInput>) =>
    req<CaseRecord>(`/api/cases/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteCase: (id: number) =>
    req<void>(`/api/cases/${id}`, { method: "DELETE" }),

  summary: () => req<Summary>(`/api/reports/summary`),

  upcoming: (days = 30) => req<CaseRecord[]>(`/api/reports/upcoming${qs({ days })}`),

  filters: () => req<FiltersData>(`/api/filters`),

  async importFile(file: File): Promise<ImportResult> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/import`, { method: "POST", body: form });
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

  exportUrl: (query: CaseQuery = {}) =>
    `${API_BASE}/api/export${qs(query as Record<string, unknown>)}`,
};
