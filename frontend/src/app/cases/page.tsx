"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { CaseQuery, CaseRecord, CasesResponse, FiltersData } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FiltersBar } from "@/components/cases/FiltersBar";
import { CasesTable } from "@/components/cases/CasesTable";
import { CaseFormDrawer } from "@/components/cases/CaseFormDrawer";
import { caseRef } from "@/lib/format";

const PAGE_SIZE = 25;

function CasesView() {
  const params = useSearchParams();
  const toast = useToast();

  const [query, setQuery] = useState<CaseQuery>({
    sort: "next_hearing_date",
    order: "asc",
    limit: PAGE_SIZE,
    offset: 0,
    deadline: (params.get("deadline") as CaseQuery["deadline"]) || "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [data, setData] = useState<CasesResponse>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersData | null>(null);
  const [refresh, setRefresh] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CaseRecord | null>(null);
  const [confirm, setConfirm] = useState<CaseRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // dropdown options
  useEffect(() => {
    api.filters().then(setFilters).catch(() => {});
  }, [refresh]);

  // deep links: ?new=1 (add) or ?focus=<id> (edit)
  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing(null);
      setDrawerOpen(true);
    } else if (params.get("focus")) {
      const id = Number(params.get("focus"));
      api
        .listCases({ limit: 2000 })
        .then((r) => {
          const found = r.items.find((c) => c.id === id);
          if (found) {
            setEditing(found);
            setDrawerOpen(true);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(query.search ?? ""), 350);
    return () => clearTimeout(t);
  }, [query.search]);

  const fetchKey = useMemo(
    () => JSON.stringify({ ...query, search: debouncedSearch, refresh }),
    [query, debouncedSearch, refresh]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .listCases({ ...query, search: debouncedSearch })
      .then((r) => alive && setData(r))
      .catch((e) => alive && toast(e instanceof Error ? e.message : "Failed to load cases", "error"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  function patch(p: Partial<CaseQuery>) {
    setQuery((q) => ({ ...q, ...p, offset: p.offset !== undefined ? p.offset : 0 }));
  }

  function onSort(field: string) {
    setQuery((q) => ({
      ...q,
      sort: field,
      order: q.sort === field && q.order === "asc" ? "desc" : "asc",
      offset: 0,
    }));
  }

  async function doDelete() {
    if (!confirm) return;
    setDeleting(true);
    try {
      await api.deleteCase(confirm.id);
      toast("Case deleted", "success");
      setConfirm(null);
      setRefresh((r) => r + 1);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  }

  const offset = query.offset ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const from = data.total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, data.total);

  const exportHref = api.exportUrl({
    search: debouncedSearch,
    wing: query.wing,
    status: query.status,
    city: query.city,
    case_year: query.case_year,
    deadline: query.deadline,
    sort: query.sort,
    order: query.order,
  });

  return (
    <div className="space-y-5">
      <FiltersBar
        query={query}
        onChange={patch}
        filters={filters}
        total={data.total}
        exportHref={exportHref}
        onAdd={() => {
          setEditing(null);
          setDrawerOpen(true);
        }}
      />

      <CasesTable
        items={data.items}
        loading={loading}
        query={query}
        onSort={onSort}
        onEdit={(c) => {
          setEditing(c);
          setDrawerOpen(true);
        }}
        onDelete={(c) => setConfirm(c)}
        onAdd={() => {
          setEditing(null);
          setDrawerOpen(true);
        }}
      />

      {pages > 1 && (
        <div className="card flex items-center justify-between px-5 py-3">
          <span className="text-xs font-medium text-slate-500">
            Showing <b className="text-slate-700">{from}</b>–<b className="text-slate-700">{to}</b> of{" "}
            <b className="text-slate-700">{data.total}</b>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => patch({ offset: Math.max(0, offset - PAGE_SIZE) })}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="px-1 text-xs font-semibold text-slate-600">
              {page} / {pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pages}
              onClick={() => patch({ offset: offset + PAGE_SIZE })}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CaseFormDrawer
        open={drawerOpen}
        initial={editing}
        filters={filters}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setRefresh((r) => r + 1)}
      />

      <ConfirmDialog
        open={!!confirm}
        loading={deleting}
        title="Delete this case?"
        message={
          confirm ? (
            <>
              <b className="text-slate-700">{caseRef(confirm)}</b>
              {confirm.case_title ? ` — ${confirm.case_title}` : ""} will be permanently removed.
            </>
          ) : (
            ""
          )
        }
        onConfirm={doDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={<div className="skeleton h-40 w-full" />}>
      <CasesView />
    </Suspense>
  );
}
