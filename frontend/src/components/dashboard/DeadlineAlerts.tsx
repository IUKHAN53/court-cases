"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BellRing, CalendarClock, ChevronRight } from "lucide-react";
import type { CaseRecord } from "@/lib/types";
import { caseRef, formatDate, urgency, URGENCY_STYLES } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";

const ACCENT: Record<string, string> = {
  overdue: "border-l-rose-500",
  today: "border-l-gold-500",
  soon: "border-l-brand-500",
  upcoming: "border-l-slate-300",
  none: "border-l-slate-200",
};

function Row({ c, index }: { c: CaseRecord; index: number }) {
  const u = urgency(c.next_hearing_date, true);
  const s = URGENCY_STYLES[u.level];
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        href={`/cases?focus=${c.id}`}
        className={`flex items-center gap-3 border-l-[3px] ${ACCENT[u.level]} rounded-r-xl bg-white px-4 py-3 transition hover:bg-slate-50`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{caseRef(c)}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          </div>
          <div className="truncate text-xs text-slate-500">
            {c.case_title || "Untitled petitioner"}
            {c.city ? ` · ${c.city}` : ""}
            {c.wing ? ` · ${c.wing}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xs font-bold ${s.text}`}>{u.label}</div>
          <div className="text-[11px] text-slate-400">{formatDate(c.next_hearing_date)}</div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      </Link>
    </motion.div>
  );
}

export function DeadlineAlerts({ items, loading }: { items: CaseRecord[]; loading: boolean }) {
  const overdue = items.filter((c) => urgency(c.next_hearing_date).level === "overdue").length;

  return (
    <section className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-rose-500">
            <BellRing className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Deadline Alerts</h2>
            <p className="text-xs text-slate-500">Overdue &amp; upcoming hearings</p>
          </div>
        </div>
        {overdue > 0 && (
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 ring-1 ring-inset ring-rose-600/20">
            {overdue} overdue
          </span>
        )}
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto p-3" style={{ maxHeight: 420 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-[58px] w-full" />
          ))
        ) : items.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No pending deadlines"
            message="No active cases have an upcoming or overdue hearing date."
          />
        ) : (
          items.map((c, i) => <Row key={c.id} c={c} index={i} />)
        )}
      </div>

      {items.length > 0 && (
        <Link
          href="/cases?deadline=upcoming"
          className="flex items-center justify-center gap-1 border-t border-slate-100 px-5 py-3 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
        >
          View all in Cases <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </section>
  );
}
