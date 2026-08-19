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
  const { session, staff, loading, needsOnboarding, needsInvite, needsPayment, subscriptionLive } =
    useAuth();
  const demo = isDemoAccessEnabled();
  const [email, setEmail] = useState(demo ? "admin@jukebox.com" : "");
  const [password, setPassword] = useState(demo ? "admin1234" : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) return;
    // New accounts → wizard (never billing first).
    if (needsInvite || needsOnboarding) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (needsPayment) {
      navigate({ to: "/billing/setup", replace: true });
      return;
    }
    if (!subscriptionLive) {
      navigate({ to: "/billing/locked", replace: true });
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
  }, [
    loading,
    session,
    staff,
    needsOnboarding,
    needsInvite,
    needsPayment,
    subscriptionLive,
    navigate,
  ]);

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
            className="w-full h-11 rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted/50 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
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

          <p className="text-center text-sm text-muted-foreground">
            New restaurant?{" "}
            <Link to="/signup" className="underline underline-offset-2 font-semibold text-foreground">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
