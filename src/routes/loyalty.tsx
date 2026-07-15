import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { Heart, Users, DollarSign, Plus, Award, Gift, Repeat } from "lucide-react";
import { useLoyaltyStats } from "@/lib/v2-data";

export const Route = createFileRoute("/loyalty")({
  head: () => ({ meta: [{ title: "Loyalty — RestoStack" }] }),
  component: Loyalty,
});

function Loyalty() {
  const { data, isLoading } = useLoyaltyStats();
  const members = data?.members ?? 0;
  const totalVisits = data?.totalVisits ?? 0;
  const creditEarned = data?.creditEarned ?? 0;
  const creditRedeemed = data?.creditRedeemed ?? 0;
  const topMembers = data?.topMembers ?? [];
  const recentTx = data?.recentTx ?? [];

  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40">
        <nav className="text-sm text-muted-foreground mb-3">
          Marketing › <span className="text-foreground font-medium">Loyalty</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-accent flex items-center justify-center">
              <Heart className="size-6 text-primary fill-primary/30" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Loyalty Program</h1>
              <p className="text-sm text-muted-foreground mt-1">Points and visits for guests of this restaurant only</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Plus className="size-4" /> Add New Member
          </button>
        </div>
      </div>

      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Members", v: String(members), i: Users, bg: "bg-accent text-primary" },
            { l: "Total Visits", v: String(totalVisits), i: Repeat, bg: "bg-success/15 text-success" },
            { l: "Points Earned", v: String(creditEarned), i: DollarSign, bg: "bg-warning/20 text-warning" },
            { l: "Points Redeemed", v: String(creditRedeemed), i: Gift, bg: "bg-info/15 text-info" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full flex items-center justify-center ${s.bg}`}>
                  <s.i className="size-5" />
                </div>
                <div className="text-sm text-muted-foreground">{s.l}</div>
              </div>
              <div className="mt-2 text-2xl font-bold">{isLoading ? "…" : s.v}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Top Members</h3>
              <Link to="/customers" className="text-xs text-primary font-medium hover:underline">
                View customers →
              </Link>
            </div>
            {topMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No loyalty activity yet for this restaurant.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topMembers.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="size-8 rounded-full bg-accent flex items-center justify-center">
                      <Award className="size-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.visits} visits · {m.points} pts</div>
                    </div>
                    <div className="font-semibold">{m.spent}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            {recentTx.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No point transactions yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentTx.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{t.date}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
