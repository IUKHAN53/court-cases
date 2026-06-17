"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FolderOpen,
  Wifi,
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import type { CaseRecord, Summary } from "@/lib/types";
import { StatCard } from "@/components/dashboard/StatCard";
import { DeadlineAlerts } from "@/components/dashboard/DeadlineAlerts";
import { ChartCard, HBars, StatusDonut, YearBars } from "@/components/dashboard/Charts";

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [upcoming, setUpcoming] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, u] = await Promise.all([api.summary(), api.upcoming(30)]);
        if (!alive) return;
        setSummary(s);
        setUpcoming(u);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-rose-500">
          <Wifi className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-bold text-slate-900">Can&apos;t reach the API</h2>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <p className="mt-3 text-xs text-slate-400">
          Expected backend at <code className="rounded bg-slate-100 px-1.5 py-0.5">{API_BASE}</code>.
          Start it, or set <code className="rounded bg-slate-100 px-1.5 py-0.5">NEXT_PUBLIC_API_URL</code>.
        </p>
      </div>
    );
  }

  const s = summary;

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard index={0} label="Total Cases" value={s?.total ?? "—"} icon={FolderOpen} hint="All records" />
        <StatCard index={1} label="Active" value={s?.active ?? "—"} icon={Activity} tone="brand" hint="Not disposed" />
        <StatCard
          index={2}
          label="Overdue"
          value={s?.overdue_count ?? "—"}
          icon={AlertTriangle}
          tone="danger"
          hint="Hearing date passed"
          href="/cases?deadline=overdue"
        />
        <StatCard
          index={3}
          label="Upcoming (30d)"
          value={s?.upcoming_count ?? "—"}
          icon={CalendarClock}
          tone="gold"
          hint="Hearings ahead"
          href="/cases?deadline=upcoming"
        />
        <StatCard index={4} label="Disposed" value={s?.disposed ?? "—"} icon={CheckCircle2} tone="emerald" hint="Closed" />
      </div>

      {/* Alerts + status */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DeadlineAlerts items={upcoming} loading={loading} />
        </div>
        <ChartCard title="By Status" subtitle="Distribution of all cases">
          {s ? (
            <StatusDonut data={s.by_status} />
          ) : (
            <div className="skeleton h-[180px] w-full" />
          )}
        </ChartCard>
      </div>

      {/* Wing + City */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="By Wing" subtitle="Top departments by case count">
          {s ? <HBars data={s.by_wing} /> : <div className="skeleton h-[200px] w-full" />}
        </ChartCard>
        <ChartCard title="By City" subtitle="Court bench location">
          {s ? <HBars data={s.by_city} /> : <div className="skeleton h-[200px] w-full" />}
        </ChartCard>
      </div>

      {/* Year */}
      <ChartCard title="By Case Year" subtitle="Filing year distribution">
        {s ? <YearBars data={s.by_year} /> : <div className="skeleton h-[200px] w-full" />}
      </ChartCard>
    </div>
  );
}
