export type UrgencyLevel = "overdue" | "today" | "soon" | "upcoming" | "none";

export interface Urgency {
  level: UrgencyLevel;
  label: string;
  days: number | null; // negative = overdue, 0 = today
}

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

export function daysUntil(value: string | null): number | null {
  const d = parseDate(value);
  if (!d) return null;
  const diff = d.getTime() - startOfToday().getTime();
  return Math.round(diff / 86_400_000);
}

export function urgency(value: string | null, activeStatus = true): Urgency {
  const days = daysUntil(value);
  if (days === null || !activeStatus) return { level: "none", label: "—", days: null };
  if (days < 0) {
    const n = Math.abs(days);
    return { level: "overdue", label: `${n} day${n === 1 ? "" : "s"} overdue`, days };
  }
  if (days === 0) return { level: "today", label: "Today", days };
  if (days <= 7) return { level: "soon", label: `In ${days} day${days === 1 ? "" : "s"}`, days };
  return { level: "upcoming", label: `In ${days} days`, days };
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(value: string | null): string {
  const d = parseDate(value);
  if (!d) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function isActiveStatus(status: string): boolean {
  return !/^disposed/i.test(status.trim());
}

export const URGENCY_STYLES: Record<UrgencyLevel, { dot: string; chip: string; text: string }> = {
  overdue: { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-rose-600/20", text: "text-rose-600" },
  today: { dot: "bg-gold-500", chip: "bg-amber-50 text-amber-700 ring-amber-600/20", text: "text-amber-600" },
  soon: { dot: "bg-brand-500", chip: "bg-brand-50 text-brand-700 ring-brand-600/20", text: "text-brand-600" },
  upcoming: { dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600 ring-slate-500/15", text: "text-slate-500" },
  none: { dot: "bg-slate-300", chip: "bg-slate-50 text-slate-400 ring-slate-400/10", text: "text-slate-400" },
};

const STATUS_STYLES: { match: RegExp; chip: string }[] = [
  { match: /^disposed/i, chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  { match: /^statement/i, chip: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  { match: /^pending/i, chip: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  { match: /^adjourn/i, chip: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  { match: /^reserved/i, chip: "bg-cyan-50 text-cyan-700 ring-cyan-600/20" },
];

export function statusChip(status: string): string {
  const found = STATUS_STYLES.find((s) => s.match.test(status.trim()));
  return found ? found.chip : "bg-slate-100 text-slate-600 ring-slate-500/15";
}

export function caseRef(c: { case_type: string; case_number: number; case_year: number }): string {
  return `${c.case_type} ${c.case_number}/${c.case_year}`;
}
