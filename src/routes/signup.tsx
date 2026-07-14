import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { signInWithGoogle } from "@/lib/oauth";
import { isPlanId, PLANS, readSelectedPlan, saveSelectedPlan, type PlanId } from "@/lib/plans";

type SignupSearch = { plan?: string };

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearch => ({
    plan: typeof search.plan === "string" ? search.plan : undefined,
  }),
  head: () => ({ meta: [{ title: "Create your account — RestoStack" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, staff, loading, refreshStaff } = useAuth();
  const { plan: planParam } = Route.useSearch();
  const [plan, setPlan] = useState<PlanId>("starter");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPlanId(planParam)) {
      saveSelectedPlan(planParam);
      setPlan(planParam);
    } else {
      setPlan(readSelectedPlan());
    }
  }, [planParam]);

  useEffect(() => {
    if (loading) return;
    if (session && staff) {
      navigate({ to: "/onboarding", replace: true });
    } else if (session && !staff) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, session, staff, navigate]);

  const selected = PLANS.find((p) => p.id === plan) ?? PLANS[0];

  const onGoogle = async () => {
    setError(null);
    setBusy("google");
    try {
      await signInWithGoogle(plan);
    } catch (e) {
      setError((e as Error).message || "Google sign-in failed. Try email instead.");
      setBusy(null);
    }
  };

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setBusy("email");
    saveSelectedPlan(plan);
    try {
      const { data: signUp, error: suErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: fullName },
        },
      });

      if (suErr) {
        const msg = suErr.message ?? "";
        if (/already|registered|exists/i.test(msg)) {
          const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
          if (siErr) throw new Error(`This email is already registered. ${siErr.message}`);
        } else {
          throw suErr;
        }
      } else if (!signUp.session) {
        const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
        if (siErr) throw siErr;
      }

      await refreshStaff();
      navigate({ to: "/onboarding", replace: true });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_50%,_#ffffff_100%)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Utensils className="size-5" />
            </span>
            RestoStack
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">
            Plan: <span className="font-medium text-slate-800">{selected.name}</span> · 14-day free trial
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
          <button
            type="button"
            onClick={onGoogle}
            disabled={!!busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            {busy === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-xs text-slate-400">or use email</span>
            </div>
          </div>

          <form onSubmit={onEmail} className="space-y-3">
            <Field label="Your full name" value={fullName} onChange={setFullName} required autoComplete="name" />
            <Field label="Work email" value={email} onChange={setEmail} type="email" required autoComplete="email" />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              required
              autoComplete="new-password"
            />

            {error && (
              <div className="rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2 border border-rose-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!!busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-emerald-500"
            >
              {busy === "email" && <Loader2 className="size-4 animate-spin" />}
              Continue to setup
            </button>
          </form>

          <p className="text-xs text-center text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-700 font-medium hover:underline">
              Sign in
            </Link>
            {" · "}
            <Link to="/start" className="text-slate-600 hover:underline">
              Change plan
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      />
    </label>
  );
}
