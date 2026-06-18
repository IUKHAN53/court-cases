"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Scale,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "Cases", icon: FolderOpen },
  { href: "/import", label: "Import", icon: Upload, perm: "import_cases" },
  { href: "/users", label: "Users & Roles", icon: Users, perm: "manage_users" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useAuth();
  const items = NAV.filter((n) => !n.perm || can(n.perm));
  return (
    <nav className="flex flex-col gap-1.5 px-3">
      {items.map(({ href, label, icon: Icon }) => {
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

function UserCard() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const initials = (user.full_name || user.username)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="m-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{user.full_name || user.username}</div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-brand-300">
            <ShieldCheck className="h-3 w-3" /> {user.role}
          </div>
        </div>
        <button
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-rose-300"
        >
          <LogOut className="h-4 w-4" />
        </button>
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
      <UserCard />
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] lg:block">
        <Panel />
      </aside>

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
