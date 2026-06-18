"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogIn, Scale, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
      router.replace("/");
    } catch {
      setError("Invalid username or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#020617] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
            <Scale className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-white">CourtTrack</h1>
          <p className="text-sm text-slate-400">Sign in to manage court cases</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur"
        >
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Username
          </label>
          <div className="relative mb-4">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/20"
              placeholder="e.g. admin"
            />
          </div>

          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Password
          </label>
          <div className="relative mb-2">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/20"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="mb-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">
              {error}
            </p>
          )}

          <Button type="submit" loading={busy} className="mt-3 w-full" disabled={!username || !password}>
            <LogIn className="h-4 w-4" /> Sign in
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Agriculture Department · Court Case Management
        </p>
      </div>
    </div>
  );
}
