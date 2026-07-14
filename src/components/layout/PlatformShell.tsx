import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, LogOut, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export function PlatformShell({ children }: { children: ReactNode }) {
  const { signOut, session } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem("restostack:portal");
    } catch {
      /* ignore */
    }
    await signOut();
    navigate({ to: "/super-admin-login", replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="size-4 text-emerald-400" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">RestoStack Super Admin</div>
              <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                {session?.user?.email ?? "Platform"}
              </div>
            </div>
          </div>

          <nav className="ml-6 hidden sm:flex items-center gap-1">
            <Link
              to="/platform/restaurants"
              className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-emerald-300 bg-emerald-500/10"
            >
              <Building2 className="size-4" /> All Restaurants
            </Link>
          </nav>

          <button
            type="button"
            onClick={handleSignOut}
            className="ml-auto inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-900"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
