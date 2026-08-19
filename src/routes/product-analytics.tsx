import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyTenantState } from "@/components/EmptyTenantState";
import { BarChart3, DollarSign, Loader2, ShoppingBag, TrendingUp } from "lucide-react";
import { useProductAnalytics } from "@/lib/v2-data";

export const Route = createFileRoute("/product-analytics")({
  head: () => ({ meta: [{ title: "Product Analytics — RestoStack" }] }),
  component: ProductAnalyticsPage,
});

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function ProductAnalyticsPage() {
  const { data, isLoading } = useProductAnalytics();

  const orderCount = data?.orderCount ?? 0;
  const revenue = data?.revenue ?? 0;
  const avgTicket = data?.avgTicket ?? 0;
  const upsellRate = data?.upsellRate ?? 0;
  const topItems = data?.topItems ?? [];

  return (
    <AppShell>
      <PageHeader
        title="Product Analytics"
        description="Item and upsell performance for the last 30 days"
        icon={BarChart3}
        iconBg="bg-info/15"
        iconColor="text-info"
      />

      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Orders (30d)", v: String(orderCount), i: ShoppingBag, c: "bg-info/15 text-info" },
            { l: "Revenue", v: fmtMoney(revenue), i: DollarSign, c: "bg-success/15 text-success" },
            { l: "Avg Ticket", v: fmtMoney(avgTicket), i: TrendingUp, c: "bg-accent text-primary" },
            { l: "Upsell Rate", v: `${(upsellRate * 100).toFixed(1)}%`, i: BarChart3, c: "bg-warning/15 text-warning" },
          ].map((k) => (
            <div key={k.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full flex items-center justify-center ${k.c}`}>
                  <k.i className="size-5" />
                </div>
                <div className="text-sm text-muted-foreground">{k.l}</div>
              </div>
              <div className="mt-2 text-2xl font-bold">{isLoading ? "…" : k.v}</div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin inline mr-2" /> Loading analytics…
          </div>
        ) : orderCount === 0 ? (
          <EmptyTenantState
            title="No product analytics data yet"
            description="Item and upsell analytics appear once this restaurant records orders."
          />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-semibold">Top items by revenue</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
            </div>
            {topItems.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">No line items found for recent orders.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                      {["Item", "Qty sold", "Revenue", "Upsells"].map((h) => (
                        <th key={h} className="text-left font-medium px-5 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.map((item) => (
                      <tr key={item.name} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="px-5 py-4 font-medium">{item.name}</td>
                        <td className="px-5 py-4">{item.qty}</td>
                        <td className="px-5 py-4 font-semibold">{fmtMoney(item.revenue)}</td>
                        <td className="px-5 py-4 text-muted-foreground">{item.upsells}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
