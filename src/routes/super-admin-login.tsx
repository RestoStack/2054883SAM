import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/super-admin-login")({
  head: () => ({ meta: [{ title: "Super Admin Login — RestoStack" }] }),
  component: SuperAdminLoginPage,
});

function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const { session, platformAdmin, loading, signOut, refreshStaff } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (session && platformAdmin) {
      try {
        sessionStorage.setItem("restostack:portal", "platform");
      } catch {
        /* ignore */
      }
      navigate({ to: "/platform/restaurants", replace: true });
    }
  }, [loading, session, platformAdmin, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setBusy(false);
      setError(signInError.message);
      return;
    }

    // Confirm this account is a platform super admin (not just a restaurant owner).
    const { data: claimed } = await supabase.rpc("v2_claim_platform_admin");
    const { data: isAdmin } = claimed
      ? { data: true }
      : await supabase.rpc("v2_is_platform_admin");

    if (!isAdmin) {
      await supabase.auth.signOut();
      setBusy(false);
      setError("This account is not authorized for Super Admin access.");
      return;
    }

    try {
      sessionStorage.setItem("restostack:portal", "platform");
    } catch {
      /* ignore */
    }
    await refreshStaff();
    setBusy(false);
    navigate({ to: "/platform/restaurants", replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto size-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
            <Shield className="size-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Super Admin</h1>
          <p className="text-sm text-slate-400 mt-2">
            Platform access only — separate from restaurant owner login.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-semibold text-sm py-2.5 transition-colors"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Signing in…
              </>
            ) : (
              "Sign in to Super Admin"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Restaurant owners should use{" "}
          <Link to="/login" className="text-slate-300 underline underline-offset-2 hover:text-white">
            restaurant login
          </Link>
          .
        </p>

        {session && !platformAdmin && (
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-4 w-full text-xs text-slate-500 hover:text-slate-300"
          >
            Sign out current session
          </button>
        )}
      </div>
    </div>
  );
}
