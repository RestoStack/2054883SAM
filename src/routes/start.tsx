import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { PLANS, saveSelectedPlan, type PlanId } from "@/lib/plans";
import { signInWithGoogle } from "@/lib/oauth";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start free trial — RestoStack" },
      { name: "description", content: "Choose a plan and create your RestoStack account." },
    ],
  }),
  component: StartPaywallPage,
});

function StartPaywallPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<PlanId | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choosePlan = (plan: PlanId) => {
    saveSelectedPlan(plan);
    navigate({ to: "/signup", search: { plan } as never, replace: false });
  };

  const google = async (plan: PlanId) => {
    setError(null);
    setBusy("google");
    try {
      saveSelectedPlan(plan);
      await signInWithGoogle(plan);
    } catch (e) {
      setError((e as Error).message || "Google sign-in is not available yet. Use email signup.");
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_45%,_#ffffff_100%)] text-slate-900">
      <header className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link to="/" className="font-semibold tracking-tight text-lg">
          RestoStack
        </Link>
        <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-20 pt-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 text-emerald-800 px-3 py-1 text-xs font-semibold">
            <Sparkles className="size-3.5" /> 14-day free trial · cancel anytime
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
            Unlock RestoStack for your restaurant.
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-xl">
            Pick a plan to continue. You’ll create an account next — Google signup takes a few seconds —
            then we’ll walk you through setup one step at a time.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl border bg-white/90 p-6 shadow-sm flex flex-col ${
                plan.highlighted
                  ? "border-emerald-400 ring-2 ring-emerald-400/30"
                  : "border-slate-200"
              }`}
            >
              {plan.highlighted && (
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">
                  Most popular
                </div>
              )}
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                <span className="pb-1 text-sm text-slate-500">{plan.priceNote}</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-slate-600 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => choosePlan(plan.id)}
                  disabled={!!busy}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold ${
                    plan.highlighted
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  Start free trial — Sign up
                </button>
                <button
                  type="button"
                  onClick={() => google(plan.id)}
                  disabled={!!busy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                >
                  {busy === "google" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  Continue with Google
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          No charge today. After signup we’ll guide you through a short onboarding.
        </p>
      </main>
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
