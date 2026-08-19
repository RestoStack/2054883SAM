import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { activateFakeSubscription } from "@/lib/org";
import { PLANS, readSelectedPlan } from "@/lib/plans";

export const Route = createFileRoute("/billing/checkout")({
  head: () => ({ meta: [{ title: "Activate — RestoStack" }] }),
  component: BillingCheckoutPage,
});

/**
 * Fake payment wall (docs/DECISIONS.md).
 * Completing this calls app_activate_fake_subscription — no Stripe keys required.
 */
function BillingCheckoutPage() {
  const navigate = useNavigate();
  const { session, org, refreshStaff, needsPayment, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = PLANS.find((p) => p.id === readSelectedPlan()) ?? PLANS[0];

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-sm text-muted-foreground">Sign in to continue.</p>
          <Link to="/login" className="mt-4 inline-block text-sm font-semibold underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (org.available && !needsPayment) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center max-w-sm space-y-3">
          <p className="text-sm text-muted-foreground">Your subscription is already active.</p>
          <Link
            to="/dashboard"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Go to app
          </Link>
        </div>
      </div>
    );
  }

  const activate = async () => {
    setError(null);
    const orgId = org.activeOrganizationId;
    if (!orgId) {
      setError(
        "No organization found yet. Accept your owner invite first, then return here.",
      );
      return;
    }
    setBusy(true);
    const result = await activateFakeSubscription(orgId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not activate");
      return;
    }
    await refreshStaff();
    navigate({ to: "/onboarding", replace: true });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_50%,_#ffffff_100%)] text-slate-900">
      <header className="mx-auto max-w-lg px-4 py-5 flex items-center justify-between">
        <span className="font-semibold tracking-tight">RestoStack</span>
        <span className="text-xs font-medium text-emerald-800 bg-emerald-500/10 px-2 py-1 rounded-full">
          Demo checkout
        </span>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-16">
        <div className="flex items-center gap-2 text-emerald-800">
          <CreditCard className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-wide">Step B · Activate</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Confirm your plan</h1>
        <p className="mt-2 text-sm text-slate-600">
          No real charge in v1. Completing this step unlocks onboarding. Stripe can replace this wall
          later without changing your org structure.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">Selected plan</div>
          <div className="mt-1 text-2xl font-semibold">{plan.name}</div>
          <div className="text-sm text-slate-500 mt-1">
            {plan.price}
            {plan.priceNote}
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {plan.features.slice(0, 4).map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {error && (
            <p className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void activate()}
            className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? "Activating…" : "Complete demo payment"}
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">
            Payment method on file (demo) · billing_provider=fake
          </p>
        </div>
      </main>
    </div>
  );
}
