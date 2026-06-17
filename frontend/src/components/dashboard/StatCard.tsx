"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type Tone = "default" | "brand" | "danger" | "gold" | "emerald";

const TONES: Record<Tone, { card: string; icon: string; value: string; label: string; hint: string }> = {
  default: {
    card: "bg-white border border-slate-200/70",
    icon: "bg-slate-100 text-slate-500",
    value: "text-slate-900",
    label: "text-slate-500",
    hint: "text-slate-400",
  },
  brand: {
    card: "bg-gradient-to-br from-brand-600 to-brand-800 border border-brand-700/40 text-white",
    icon: "bg-white/15 text-white",
    value: "text-white",
    label: "text-brand-100",
    hint: "text-brand-200/80",
  },
  danger: {
    card: "bg-gradient-to-br from-rose-500 to-rose-700 border border-rose-600/40 text-white",
    icon: "bg-white/15 text-white",
    value: "text-white",
    label: "text-rose-50",
    hint: "text-rose-100/80",
  },
  gold: {
    card: "bg-gradient-to-br from-amber-400 to-gold-600 border border-gold-500/40 text-white",
    icon: "bg-white/20 text-white",
    value: "text-white",
    label: "text-amber-50",
    hint: "text-amber-100/90",
  },
  emerald: {
    card: "bg-white border border-slate-200/70",
    icon: "bg-emerald-50 text-emerald-600",
    value: "text-slate-900",
    label: "text-slate-500",
    hint: "text-slate-400",
  },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  href,
  index = 0,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  href?: string;
  index?: number;
}) {
  const t = TONES[tone];
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className={`group relative overflow-hidden rounded-2xl p-5 shadow-card transition hover:shadow-lift ${t.card}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-[13px] font-semibold ${t.label}`}>{label}</div>
          <div className={`mt-2 text-3xl font-extrabold tracking-tight ${t.value}`}>{value}</div>
          {hint && <div className={`mt-1 text-xs font-medium ${t.hint}`}>{hint}</div>}
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${t.icon}`}>
          <Icon className="h-[22px] w-[22px]" />
        </div>
      </div>
    </motion.div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
