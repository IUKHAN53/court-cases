"use client";

import { Download, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import type { CaseQuery, FiltersData } from "@/lib/types";

const DEADLINE_OPTIONS = [
  { value: "", label: "Any deadline" },
  { value: "overdue", label: "Overdue" },
  { value: "upcoming", label: "Upcoming (30d)" },
  { value: "none", label: "No hearing date" },
];

export function FiltersBar({
  query,
  onChange,
  filters,
  total,
  exportHref,
  onAdd,
}: {
  query: CaseQuery;
  onChange: (patch: Partial<CaseQuery>) => void;
  filters: FiltersData | null;
  total: number;
  exportHref: string;
  onAdd: () => void;
}) {
  const hasFilters =
    query.search ||
    query.wing ||
    query.status ||
    query.city ||
    query.case_year ||
    query.deadline ||
    query.active;
  const activeLabel =
    query.active === "1" ? "Active only" : query.active === "0" ? "Disposed only" : null;

  return (
    <div className="card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query.search ?? ""}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search by title, case number or wing…"
            className="input pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="md" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Add Case
          </Button>
          <Link href={exportHref}>
            <Button variant="secondary" size="md">
              <Download className="h-4 w-4" /> Export
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Select value={query.wing ?? ""} onChange={(e) => onChange({ wing: e.target.value })}>
          <option value="">All wings</option>
          {filters?.wings.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </Select>
        <Select value={query.status ?? ""} onChange={(e) => onChange({ status: e.target.value })}>
          <option value="">All statuses</option>
          {filters?.statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={query.city ?? ""} onChange={(e) => onChange({ city: e.target.value })}>
          <option value="">All cities</option>
          {filters?.cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          value={query.case_year ? String(query.case_year) : ""}
          onChange={(e) => onChange({ case_year: e.target.value })}
        >
          <option value="">All years</option>
          {filters?.years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select value={query.deadline ?? ""} onChange={(e) => onChange({ deadline: e.target.value as CaseQuery["deadline"] })}>
          {DEADLINE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
          {total} case{total === 1 ? "" : "s"} found
          {activeLabel && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/20">
              {activeLabel}
            </span>
          )}
        </span>
        {hasFilters && (
          <button
            onClick={() =>
              onChange({
                search: "",
                wing: "",
                status: "",
                city: "",
                case_year: "",
                deadline: "",
                active: "",
              })
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-rose-600"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
