"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Menu, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Overview of cases, hearings & deadlines" },
  "/cases": { title: "Cases", subtitle: "Search, add, edit, export & manage cases" },
  "/import": { title: "Import", subtitle: "Bring in cases from an Excel or CSV file" },
  "/users": { title: "Users & Roles", subtitle: "Manage accounts and permissions" },
};

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const meta = TITLES[pathname] ?? TITLES["/cases"];
  const [alerts, setAlerts] = useState(0);
  const { can } = useAuth();

  useEffect(() => {
    let alive = true;
    api
      .summary()
      .then((s) => alive && setAlerts(s.overdue_count + s.upcoming_count))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-slate-100/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
            {meta.title}
          </h1>
          <p className="hidden truncate text-xs text-slate-500 sm:block">{meta.subtitle}</p>
        </div>

        <span className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 md:block">
          {todayLabel()}
        </span>

        <Link
          href="/cases?deadline=upcoming"
          aria-label="Deadline alerts"
          className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:text-brand-600"
        >
          <Bell className="h-5 w-5" />
          {alerts > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-slate-100">
              {alerts > 99 ? "99+" : alerts}
            </span>
          )}
        </Link>

        {can("create_cases") && (
          <Link
            href="/cases?new=1"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 text-sm font-semibold text-white shadow-glow transition hover:from-brand-500 hover:to-brand-400"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Case</span>
          </Link>
        )}
      </div>
    </header>
  );
}
