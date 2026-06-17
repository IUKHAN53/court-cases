"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, Scale, FolderOpen, Upload, X } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "Cases", icon: FolderOpen },
  { href: "/import", label: "Import", icon: Upload },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1.5 px-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-400 to-gold-400"
              />
            )}
            <Icon className={`h-[18px] w-[18px] ${active ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300"}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-6 py-6">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
        <Scale className="h-5 w-5 text-white" />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-tight text-white">CourtTrack</div>
        <div className="text-[11px] font-medium text-slate-400">Case Management</div>
      </div>
    </div>
  );
}

function Panel() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#0f172a] to-[#020617]">
      <Brand />
      <div className="mt-2 flex-1">
        <NavLinks />
      </div>
      <div className="m-3 rounded-xl border border-white/5 bg-white/[0.03] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-300">
          Internal Demo
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Agriculture Dept. court-case tracking, reporting &amp; deadline alerts.
        </p>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Desktop: fixed rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] lg:block">
        <Panel />
      </aside>

      {/* Mobile: slide-over */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] lg:hidden"
            >
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="absolute -right-11 top-4 grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <Panel />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
