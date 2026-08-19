import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { PLANS, isPlanId, type PlanId } from "@/lib/plans";
import { openBillingPortal, settingsGetBilling } from "@/lib/settings-api";

type InvoiceRow = {
  id: string;
  date: string;
  amount: string;
  status: string;
  note: string;
};

export function SettingsBilling() {
  const { org, needsPayment, subscriptionLive } = useAuth();
  const orgId = org.activeOrganizationId;
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState<PlanId>("starter");
  const [status, setStatus] = useState<string>("—");
  const [provider, setProvider] = useState<"fake" | "stripe">("fake");
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    (async () => {
      const res = await settingsGetBilling(orgId);
      if (res.ok) {
        if (isPlanId(res.plan_id)) setPlanId(res.plan_id);
        setStatus(String(res.status ?? "—"));
        setProvider(res.billing_provider === "stripe" ? "stripe" : "fake");
        setPeriodEnd(
          res.current_period_end ? String(res.current_period_end) : null,
        );
        // Fake invoices until Stripe invoice list is wired through portal/API.
        if (res.billing_provider === "fake" && res.status === "active") {
          setInvoices([
            {
              id: "demo-1",
              date: new Date().toISOString().slice(0, 10),
              amount: "$0.00",
              status: "paid",
              note: "Demo activation (no charge)",
            },
          ]);
        } else if (res.billing_provider === "stripe") {
          setInvoices([
            {
              id: "stripe-portal",
              date: "—",
              amount: "—",
              status: "see portal",
              note: "Open Customer Portal for invoices & payment methods",
            },
          ]);
        }
      }
      setLoading(false);
    })();
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading billing…
      </div>
    );
  }

  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-muted-foreground">Plan, status, portal, and invoices.</p>
      </div>

      <div className="rounded-xl border border-border p-5 bg-gradient-to-br from-accent/40 to-transparent space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Current plan</div>
            <div className="text-2xl font-bold">{plan.name}</div>
            <div className="text-xs text-muted-foreground mt-1 capitalize">
              Status: {status}
              {" · "}
              provider={provider}
            </div>
            {periodEnd && (
              <div className="text-xs text-muted-foreground mt-0.5">
                Period ends {new Date(periodEnd).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {needsPayment && (
              <Link
                to="/billing/setup"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground text-center"
              >
                Complete activation
              </Link>
            )}
            {provider === "stripe" ? (
              <button
                type="button"
                disabled={portalBusy || !orgId}
                onClick={async () => {
                  if (!orgId) return;
                  setPortalBusy(true);
                  const res = await openBillingPortal(orgId);
                  setPortalBusy(false);
                  if (!res.ok || !res.url) {
                    toast.error(res.error ?? "Portal unavailable");
                    return;
                  }
                  window.location.href = res.url;
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted/60 disabled:opacity-60"
              >
                {portalBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ExternalLink className="size-4" />
                )}
                Stripe Customer Portal
              </button>
            ) : (
              <span className="rounded-lg border border-success/30 bg-success/10 px-4 py-2 text-sm font-semibold text-success text-center">
                Demo payment on file
              </span>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {plan.price}
          {plan.priceNote}
        </div>
        {!subscriptionLive && (
          <Link to="/billing/locked" className="inline-block text-xs font-semibold underline">
            Subscription locked
          </Link>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Invoices</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border">
                  <td className="px-3 py-2">{inv.date}</td>
                  <td className="px-3 py-2">{inv.amount}</td>
                  <td className="px-3 py-2 capitalize">{inv.status}</td>
                  <td className="px-3 py-2 text-muted-foreground">{inv.note}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
