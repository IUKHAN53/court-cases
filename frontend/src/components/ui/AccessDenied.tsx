import Link from "next/link";
import { Lock } from "lucide-react";

export function AccessDenied({ feature = "this page" }: { feature?: string }) {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400">
        <Lock className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-base font-bold text-slate-900">No access</h2>
      <p className="mt-1 text-sm text-slate-500">
        You don&apos;t have permission to view {feature}. Contact an administrator if you
        need access.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-glow"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
