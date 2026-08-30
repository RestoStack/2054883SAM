import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { signInWithGoogle } from "@/lib/oauth";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [{ title: "Accept invite — RestoStack" }],
  }),
  component: InviteAcceptPage,
});

/**
 * Invite entry: forced auth (Google prominent, email/password secondary)
 * → accept → /billing/setup (owners) or /app (team).
 */
function InviteAcceptPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { session, loading: authLoading, refreshStaff } = useAuth();
  const [status, setStatus] = useState<"loading" | "need_auth" | "ready" | "error">("loading");
  const [kind, setKind] = useState<"owner_onboarding" | "team" | null>(null);
  const [message, setMessage] = useState("Checking invite…");
  const [busy, setBusy] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem("restostack:invite_token", token);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authLoading) return;
      const { data, error } = await (supabase as any).rpc("app_peek_invite", {
        _token: token,
      });
      if (cancelled) return;
      if (error) {
        setStatus(session ? "ready" : "need_auth");
        setMessage(
          error.message.includes("app_peek_invite")
            ? "Invite system is installing. Sign in to continue once migrations are applied."
            : error.message,
        );
        return;
      }
      if (!data?.ok) {
        setStatus("error");
        setMessage(data?.error ?? "This invite is invalid or expired.");
        return;
      }
      setKind(data.kind === "team" ? "team" : "owner_onboarding");
      setMessage(
        data.kind === "team"
          ? `Join ${data.organization_name ?? "the team"} as ${data.role ?? "host"}.`
          : `Set up ${data.organization_name ?? "your restaurant"}.`,
      );
      if (data.email && typeof data.email === "string") setEmail(data.email);
      setStatus(session ? "ready" : "need_auth");
    })();
    return () => {
      cancelled = true;
    };
  }, [token, session, authLoading]);

  // Auto-accept once authenticated.
  useEffect(() => {
    if (status !== "ready" || !session || busy) return;
    void accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  const accept = async () => {
    setBusy(true);
    setAuthError(null);
    const { data, error } = await (supabase as any).rpc("app_accept_invite", {
      _token: token,
    });
    if (error || !data?.ok) {
      setBusy(false);
      setStatus("error");
      setMessage(error?.message ?? data?.error ?? "Could not accept invite.");
      return;
    }
    await refreshStaff();
    setBusy(false);
    if (data.needs_payment) {
      navigate({ to: "/billing/setup", replace: true });
      return;
    }
    if (data.needs_onboarding) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    navigate({ to: "/app", replace: true });
  };

  const emailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setBusy(true);
    // Prefer sign-in; fall back to sign-up for brand-new owners.
    const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
    if (!siErr) {
      setBusy(false);
      return;
    }
    const { error: suErr } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/invite/${token}` },
    });
    setBusy(false);
    if (suErr) setAuthError(suErr.message);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_50%,_#ffffff_100%)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          {kind === "team" ? "Team invite" : "Owner invite"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">You’re invited</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>

        {status === "loading" && (
          <Loader2 className="size-5 animate-spin mx-auto mt-8 text-slate-400" />
        )}

        {status === "need_auth" && (
          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void signInWithGoogle()}
              className="w-full h-12 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {!showEmail ? (
              <button
                type="button"
                onClick={() => setShowEmail(true)}
                className="w-full h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Use email instead
              </button>
            ) : (
              <form onSubmit={(e) => void emailAuth(e)} className="space-y-3 pt-2 border-t border-slate-100">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  autoComplete="email"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (8+ characters)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  autoComplete="new-password"
                />
                {authError && <p className="text-xs text-rose-700">{authError}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-11 rounded-xl border border-slate-200 text-sm font-semibold disabled:opacity-60"
                >
                  {busy ? "Working…" : "Continue with email"}
                </button>
              </form>
            )}
          </div>
        )}

        {status === "ready" && (
          <div className="mt-8 flex justify-center">
            <Loader2 className="size-5 animate-spin text-slate-400" />
          </div>
        )}

        {status === "error" && (
          <Link to="/login" className="mt-6 inline-block text-sm font-semibold underline">
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
