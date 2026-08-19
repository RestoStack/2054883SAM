import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { signInWithGoogle } from "@/lib/oauth";
import { isDemoAccessEnabled } from "@/lib/ship-mode";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — RestoStack" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
    ],
  }),
  component: LoginPage,
});

/** MVP: Google or email+password only — no staff PIN login (docs/DECISIONS.md). */
function LoginPage() {
  const navigate = useNavigate();
  const { session, staff, loading, needsOnboarding, needsPayment, subscriptionLive } = useAuth();
  const demo = isDemoAccessEnabled();
  const [email, setEmail] = useState(demo ? "admin@jukebox.com" : "");
  const [password, setPassword] = useState(demo ? "admin1234" : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) return;
    if (needsPayment) {
      navigate({ to: "/billing/setup", replace: true });
      return;
    }
    if (!subscriptionLive) {
      navigate({ to: "/billing/locked", replace: true });
      return;
    }
    if (needsOnboarding) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (staff) {
      try {
        sessionStorage.setItem("restostack:portal", "restaurant");
      } catch {
        /* ignore */
      }
      const isMobile =
        typeof window !== "undefined" &&
        (window.matchMedia("(max-width: 768px)").matches ||
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
      const home = isMobile
        ? "/app"
        : staff.role === "hostess"
          ? "/host-stand"
          : "/dashboard";
      navigate({ to: home, replace: true });
    }
  }, [loading, session, staff, needsOnboarding, needsPayment, subscriptionLive, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) setError(err.message);
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError((err as Error).message || "Google sign-in failed");
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">RestoStack</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in with Google or email</p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGoogle()}
            className="w-full h-11 rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted/50 disabled:opacity-50"
          >
            Continue with Google
          </button>

          <div className="relative text-center text-xs text-muted-foreground">
            <span className="bg-card px-2 relative z-10">or email</span>
            <div className="absolute inset-x-0 top-1/2 border-t border-border" />
          </div>

          <form onSubmit={(e) => void handleEmailLogin(e)} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Have an invite?{" "}
            <Link to="/signup" className="underline underline-offset-2 font-medium text-foreground">
              Continue from your invite link
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
