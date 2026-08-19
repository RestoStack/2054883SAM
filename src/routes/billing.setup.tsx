import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { activateFakeSubscription } from "@/lib/org";
import { billingVerify } from "@/lib/onboarding-api";
import { PLANS, readSelectedPlan, saveSelectedPlan, type PlanId } from "@/lib/plans";
import { billingSetupSchema } from "@/lib/schemas/onboarding";
import { supabase } from "@/integrations/supabase/client";

type SetupSearch = { session_id?: string; return?: string };

export const Route = createFileRoute("/billing/setup")({
  validateSearch: (s: Record<string, unknown>): SetupSearch => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
    return: typeof s.return === "string" ? s.return : undefined,
  }),
  head: () => ({ meta: [{ title: "Choose a plan — RestoStack" }] }),
  component: BillingSetupPage,
});

/**
 * Plan picker → Checkout (Stripe when billing_provider=stripe) → return URL
 * verifies via subscriptions row (app_billing_verify_subscription), never a client claim.
 * Default provider remains `fake` per docs/DECISIONS.md until Stripe keys are live.
 */
function BillingSetupPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { session, loading, org, refreshStaff, needsPayment, subscriptionLive } = useAuth();
  const [plan, setPlan] = useState<PlanId>(readSelectedPlan());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(!!search.session_id || search.return === "1");

  const orgId = org.activeOrganizationId;
  const provider = org.billingProvider ?? "fake";

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (org.available && subscriptionLive && !needsPayment && !verifying) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, session, org.available, subscriptionLive, needsPayment, verifying, navigate]);

  // Return URL: poll mirrored subscription row (webhook or fake RPC writes it).
  useEffect(() => {
    if (!verifying || !orgId) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      const res = await billingVerify(orgId);
      if (cancelled) return;
      if (res.ok && res.live) {
        await refreshStaff();
        navigate({ to: "/onboarding", replace: true });
        return;
      }
      if (attempts >= 12) {
        setVerifying(false);
        setError(
          "Payment not confirmed yet. If you completed Checkout, wait a moment and refresh — we only unlock after the subscription row is mirrored.",
        );
        return;
      }
      setTimeout(() => void tick(), 1500);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [verifying, orgId, refreshStaff, navigate]);

  const startCheckout = async () => {
    setError(null);
    if (!orgId) {
      setError("Accept your owner invite before choosing a plan.");
      return;
    }
    const parsed = billingSetupSchema.safeParse({ plan_id: plan, organization_id: orgId });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid plan");
      return;
    }
    saveSelectedPlan(plan);
    setBusy(true);

    if (provider === "stripe") {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-checkout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
            },
            body: JSON.stringify({
              organization_id: orgId,
              plan_id: plan,
              success_url: `${window.location.origin}/billing/setup?return=1`,
              cancel_url: `${window.location.origin}/billing/setup`,
            }),
          },
        );
        const json = await res.json();
        if (!res.ok || !json.url) {
          throw new Error(json.error ?? "Could not start Stripe Checkout");
        }
        window.location.href = json.url;
        return;
      } catch (e) {
        setBusy(false);
        setError((e as Error).message);
        return;
      }
    }

    // Fake provider: write the same subscriptions row the webhook would mirror.
    const result = await activateFakeSubscription(orgId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Activation failed");
      return;
    }
    // Verify from DB — never unlock on client claim alone.
    const verified = await billingVerify(orgId);
    if (!verified.ok || !verified.live) {
      setError("Subscription row not active yet. Try again.");
      return;
    }
    await refreshStaff();
    navigate({ to: "/onboarding", replace: true });
  };

  if (loading || verifying) {
    return (
      <div className="min-h-screen grid place-items-center gap-3">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        {verifying && (
          <p className="text-sm text-muted-foreground">Confirming subscription…</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_50%,_#ffffff_100%)] text-slate-900">
      <header className="mx-auto max-w-5xl px-4 py-5 flex items-center justify-between">
        <span className="font-semibold tracking-tight">RestoStack</span>
        <span className="text-xs font-medium text-emerald-800 bg-emerald-500/10 px-2 py-1 rounded-full inline-flex items-center gap-1">
          <CreditCard className="size-3.5" />
          {provider === "stripe" ? "Stripe Checkout" : "Demo checkout (fake)"}
        </span>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Choose your plan</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-xl">
          Access unlocks only after the <code className="text-xs">subscriptions</code> row is{" "}
          <strong>trialing</strong> or <strong>active</strong>
          {provider === "stripe"
            ? " (mirrored by the Stripe webhook)."
            : " (written by the fake checkout RPC until Stripe is enabled)."}
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`text-left rounded-3xl border bg-white/90 p-6 shadow-sm ${
                plan === p.id
                  ? "border-emerald-400 ring-2 ring-emerald-400/30"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <h2 className="text-xl font-semibold">{p.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{p.description}</p>
              <div className="mt-4 text-3xl font-semibold">
                {p.price}
                <span className="text-sm font-normal text-slate-500">{p.priceNote}</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center">
          <button
            type="button"
            disabled={busy || !orgId}
            onClick={() => void startCheckout()}
            className="w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {provider === "stripe" ? "Continue to Stripe Checkout" : "Complete demo payment"}
          </button>
          <Link to="/billing/locked" className="text-sm text-slate-500 underline">
            Having trouble?
          </Link>
        </div>
      </main>
    </div>
  );
}
