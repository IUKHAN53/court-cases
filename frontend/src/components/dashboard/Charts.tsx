"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LabelCount } from "@/lib/types";

const STATUS_COLORS: { match: RegExp; color: string }[] = [
  { match: /^disposed/i, color: "#10b981" },
  { match: /^statement/i, color: "#0ea5e9" },
  { match: /^pending/i, color: "#f59e0b" },
  { match: /^adjourn/i, color: "#8b5cf6" },
  { match: /^reserved/i, color: "#06b6d4" },
];
function statusColor(label: string, i: number): string {
  const m = STATUS_COLORS.find((s) => s.match.test(label));
  return m ? m.color : ["#6366f1", "#64748b", "#f43f5e", "#14b8a6"][i % 4];
}

const BAR_PALETTE = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"];

function Tip({ active, payload, suffix = "" }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lift">
      <div className="text-xs font-semibold text-slate-700">{p.payload.label}</div>
      <div className="text-xs text-slate-500">
        {p.value} case{p.value === 1 ? "" : "s"}
        {suffix}
      </div>
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function StatusDonut({ data }: { data: LabelCount[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const TOP = 8;
  const sorted = [...data].sort((a, b) => b.count - a.count);
  let display = sorted;
  if (sorted.length > TOP) {
    const other = sorted.slice(TOP).reduce((s, d) => s + d.count, 0);
    display = [...sorted.slice(0, TOP), { label: "Other", count: other }];
  }
  data = display;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={d.label} fill={statusColor(d.label, i)} />
              ))}
            </Pie>
            <Tooltip content={<Tip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-slate-900">{total}</div>
            <div className="text-[11px] font-medium text-slate-400">Total</div>
          </div>
        </div>
      </div>
      <ul className="flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor(d.label, i) }} />
            <span className="flex-1 truncate text-slate-600">{d.label}</span>
            <span className="font-semibold text-slate-900">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({ data, suffix }: { data: LabelCount[]; suffix?: string }) {
  const rows = data.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={Math.max(rows.length * 38, 120)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#475569" }}
        />
        <Tooltip cursor={{ fill: "rgba(99,102,241,0.06)" }} content={<Tip suffix={suffix} />} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
          {rows.map((_, i) => (
            <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function YearBars({ data }: { data: LabelCount[] }) {
  const rows = [...data].sort((a, b) => Number(a.label) - Number(b.label));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#475569" }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} allowDecimals={false} />
        <Tooltip cursor={{ fill: "rgba(99,102,241,0.06)" }} content={<Tip />} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={28} fill="#6366f1" />
      </BarChart>
    </ResponsiveContainer>
  );
}
