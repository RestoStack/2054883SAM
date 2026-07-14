import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Share2, Users, Gift, DollarSign, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/marketing/referral")({
  head: () => ({ meta: [{ title: "Referral Program — RestoStack" }] }),
  component: ReferralPage,
});

const top = [
  { name: "Sarah Johnson", invites: 18, joined: 12, revenue: "$1,420" },
  { name: "Michael Brown", invites: 14, joined: 9, revenue: "$986" },
  { name: "Emily Davis", invites: 11, joined: 8, revenue: "$842" },
  { name: "James Wilson", invites: 9, joined: 6, revenue: "$612" },
  { name: "Jessica Lee", invites: 7, joined: 5, revenue: "$498" },
];

function ReferralPage() {
  return (
    <AppShell>
      <PageHeader
        title="Referral Program"
        description="Reward customers for bringing friends."
        crumbs={[{ label: "Marketing", to: "/marketing" }, { label: "Referral Program" }]}
        icon={Share2}
        iconBg="bg-success/15"
        iconColor="text-success"
      />
      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Total Invites", v: "1,284", i: Users, c: "bg-accent text-primary" },
            { l: "Friends Joined", v: "682", i: Gift, c: "bg-success/15 text-success" },
            { l: "Revenue Generated", v: "$24,860", i: DollarSign, c: "bg-info/15 text-info" },
            { l: "Conversion", v: "53.1%", i: TrendingUp, c: "bg-warning/15 text-warning" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full flex items-center justify-center ${s.c}`}><s.i className="size-5" /></div>
                <div className="text-sm text-muted-foreground">{s.l}</div>
              </div>
              <div className="mt-2 text-2xl font-bold">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border font-semibold">Top Referrers</div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b border-border">
                {["Customer", "Invites", "Joined", "Revenue"].map((h) => <th key={h} className="text-left font-medium px-5 py-3">{h}</th>)}
              </tr></thead>
              <tbody>
                {top.map((c, i) => (
                  <tr key={c.name} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="size-9 rounded-full bg-gradient-to-br from-accent to-primary/30 flex items-center justify-center text-xs font-bold">#{i + 1}</div><span className="font-medium">{c.name}</span></div></td>
                    <td className="px-5 py-4">{c.invites}</td>
                    <td className="px-5 py-4">{c.joined}</td>
                    <td className="px-5 py-4 font-semibold text-success">{c.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 h-fit space-y-4">
            <h3 className="font-semibold">Program Settings</h3>
            <div className="rounded-lg bg-accent/40 p-4">
              <div className="text-xs text-muted-foreground">Referrer reward</div>
              <div className="font-bold text-success">$20 credit per friend</div>
            </div>
            <div className="rounded-lg bg-accent/40 p-4">
              <div className="text-xs text-muted-foreground">Friend reward</div>
              <div className="font-bold text-success">15% off first visit</div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Referral link</label>
              <input readOnly value="italianbistro.com/r/alex24" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" />
            </div>
            <button className="w-full rounded-lg bg-success py-2 text-sm font-semibold text-success-foreground">Edit Program</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
