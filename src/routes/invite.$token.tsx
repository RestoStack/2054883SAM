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
 * Phase 0 stub: validates invite token via RPC when available.
 * Full accept → membership wiring completes as migrations land.
 */
function InviteAcceptPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "need_auth" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string>("Checking invite…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authLoading) return;
      // Peek invite (SECURITY DEFINER RPC added in Phase 0 migration).
      const { data, error } = await (supabase as any).rpc("app_peek_invite", {
        _token: token,
      });
      if (cancelled) return;
      if (error) {
        // RPC may not exist until migration applied — show friendly state.
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
      setMessage(
        data.kind === "team"
          ? `Join ${data.organization_name ?? "the team"} as ${data.role ?? "host"}.`
          : `Set up ${data.organization_name ?? "your restaurant"}.`,
      );
      setStatus(session ? "ready" : "need_auth");
    })();
    return () => {
      cancelled = true;
    };
  }, [token, session, authLoading]);

  const accept = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("app_accept_invite", {
      _token: token,
    });
    setBusy(false);
    if (error || !data?.ok) {
      setStatus("error");
      setMessage(error?.message ?? data?.error ?? "Could not accept invite.");
      return;
    }
    if (data.needs_payment) {
      navigate({ to: "/billing/checkout", replace: true });
      return;
    }
    if (data.needs_onboarding) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
        <h1 className="text-xl font-semibold tracking-tight">You’re invited</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>

        {status === "loading" && (
          <Loader2 className="size-5 animate-spin mx-auto mt-6 text-muted-foreground" />
        )}

        {status === "need_auth" && (
          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void signInWithGoogle()}
              className="w-full h-11 rounded-lg border border-border text-sm font-semibold"
            >
              Continue with Google
            </button>
            <Link
              to="/login"
              className="block w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold leading-[2.75rem]"
            >
              Sign in with email
            </Link>
          </div>
        )}

        {status === "ready" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void accept()}
            className="mt-6 w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Accepting…" : "Accept invite"}
          </button>
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
