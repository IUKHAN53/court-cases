"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, FileText, Pencil, Trash2 } from "lucide-react";
import type { CaseRecord, CaseQuery } from "@/lib/types";
import { caseRef, formatDate, isActiveStatus, statusChip, urgency, URGENCY_STYLES } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";

function SortHeader({
  label,
  field,
  query,
  onSort,
  className = "",
}: {
  label: string;
  field: string;
  query: CaseQuery;
  onSort: (field: string) => void;
  className?: string;
}) {
  const active = query.sort === field;
  const Icon = !active ? ChevronsUpDown : query.order === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-4 py-3 ${className}`}>
      <button
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 font-semibold transition hover:text-slate-900 ${
          active ? "text-slate-900" : "text-slate-500"
        }`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}

function HearingCell({ c }: { c: CaseRecord }) {
  const active = isActiveStatus(c.status);
  const u = urgency(c.next_hearing_date, active);
  if (!c.next_hearing_date) return <span className="text-sm text-slate-300">—</span>;
  const s = URGENCY_STYLES[u.level];
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{formatDate(c.next_hearing_date)}</span>
      {active && u.level !== "none" && (
        <Badge className={s.chip}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {u.label}
        </Badge>
      )}
    </div>
  );
}

export function CasesTable({
  items,
  loading,
  query,
  onSort,
  onEdit,
  onDelete,
  onAdd,
}: {
  items: CaseRecord[];
  loading: boolean;
  query: CaseQuery;
  onSort: (field: string) => void;
  onEdit: (c: CaseRecord) => void;
  onDelete: (c: CaseRecord) => void;
  onAdd: () => void;
}) {
  const { can } = useAuth();
  const canEdit = can("edit_cases");
  const canDelete = can("delete_cases");
  const showActions = canEdit || canDelete;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <SortHeader label="Case" field="case_number" query={query} onSort={onSort} />
              <th className="px-4 py-3 font-semibold">Petitioner</th>
              <th className="px-4 py-3 font-semibold">Wing</th>
              <th className="px-4 py-3 font-semibold">City</th>
              <SortHeader label="Status" field="status" query={query} onSort={onSort} />
              <SortHeader label="Next Hearing" field="next_hearing_date" query={query} onSort={onSort} />
              {showActions && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: showActions ? 7 : 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : items.map((c) => (
                  <tr key={c.id} className="group transition hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{caseRef(c)}</div>
                      <div className="text-xs text-slate-400">{c.court}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">{c.case_title || <span className="text-slate-300">—</span>}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {c.wing || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {c.city || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusChip(c.status)}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <HearingCell c={c} />
                    </td>
                    {showActions && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                          {canEdit && (
                            <button
                              onClick={() => onEdit(c)}
                              aria-label="Edit"
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-brand-50 hover:text-brand-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => onDelete(c)}
                              aria-label="Delete"
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {!loading && items.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No cases match"
          message="Try adjusting your filters, or add a new case to get started."
          action={
            <button
              onClick={onAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-glow"
            >
              <Pencil className="h-4 w-4" /> Add Case
            </button>
          }
        />
      )}
    </div>
  );
}
