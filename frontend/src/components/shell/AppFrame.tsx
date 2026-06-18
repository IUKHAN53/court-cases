"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Scale } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Shell } from "./Shell";

function FullScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-100">
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
          <Scale className="h-6 w-6 text-white" />
        </div>
        <div className="text-sm font-medium text-slate-400">Loading…</div>
      </div>
    </div>
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (loading) return;
    if (!user && !isLogin) router.replace("/login");
    if (user && isLogin) router.replace("/");
  }, [loading, user, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (loading || !user) return <FullScreen />;
  return <Shell>{children}</Shell>;
}
