import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { Heart, Users, DollarSign, Plus, UserPlus, ChevronRight, Award, Gift, Repeat, Pizza, UtensilsCrossed, Wine, Cake, Crown, Sparkles } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from "recharts";
import { pointsActivity } from "@/lib/mock-data";

export const Route = createFileRoute("/loyalty")({
  head: () => ({ meta: [{ title: "Loyalty — RestoStack" }] }),
  component: Loyalty,
});

const milestones = [
  { visits: 3, reward: "Free appetizer", icon: Sparkles, color: "text-emerald-600", bg: "bg-emerald-500/15", bar: "#10b981", reached: 1840 },
  { visits: 6, reward: "Free pizza", icon: Pizza, color: "text-orange-600", bg: "bg-orange-500/15", bar: "#f97316", reached: 1120 },
  { visits: 9, reward: "Free main meal", icon: UtensilsCrossed, color: "text-rose-600", bg: "bg-rose-500/15", bar: "#f43f5e", reached: 680 },
  { visits: 12, reward: "Free dessert platter", icon: Cake, color: "text-pink-600", bg: "bg-pink-500/15", bar: "#ec4899", reached: 410 },
  { visits: 15, reward: "Bottle of house wine", icon: Wine, color: "text-purple-600", bg: "bg-purple-500/15", bar: "#a855f7", reached: 245 },
  { visits: 18, reward: "Dinner for two", icon: Gift, color: "text-indigo-600", bg: "bg-indigo-500/15", bar: "#6366f1", reached: 132 },
  { visits: 21, reward: "VIP chef's table", icon: Crown, color: "text-amber-600", bg: "bg-amber-500/15", bar: "#f59e0b", reached: 58 },
];

const topMembers = [
  { n: "Sarah Johnson", visits: 24, tier: "Platinum", earned: "$120" },
  { n: "Michael Brown", visits: 21, tier: "Platinum", earned: "$105" },
  { n: "Emily Davis", visits: 18, tier: "Gold", earned: "$90" },
  { n: "James Wilson", visits: 15, tier: "Gold", earned: "$75" },
  { n: "Jessica Lee", visits: 12, tier: "Gold", earned: "$60" },
];

const recentTx = [
  { n: "Emily Davis", a: "Visit – earned $5", d: "Jun 12, 2:30 PM", pos: true },
  { n: "Michael Brown", a: "Redeemed $10 credit", d: "Jun 12, 1:15 PM", pos: false },
  { n: "Sarah Johnson", a: "Visit – earned $5", d: "Jun 11, 6:45 PM", pos: true },
  { n: "James Wilson", a: "Visit – earned $5", d: "Jun 11, 3:20 PM", pos: true },
  { n: "Jessica Lee", a: "Redeemed free dessert", d: "Jun 10, 8:10 PM", pos: false },
];

function Loyalty() {
  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40">
        <nav className="text-sm text-muted-foreground mb-3">Marketing › <span className="text-foreground font-medium">Loyalty</span></nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-accent flex items-center justify-center"><Heart className="size-6 text-primary fill-primary/30" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Loyalty Program</h1>
              <p className="text-sm text-muted-foreground mt-1">Every visit earns customers $5 toward their next meal</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Add New Member</button>
        </div>
      </div>

      <div className="p-4 lg:p-5 space-y-4">
        <div className="rounded-xl border border-border bg-gradient-to-r from-accent/40 to-card p-5 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-success/15 text-success flex items-center justify-center"><Repeat className="size-5" /></div>
            <div><div className="text-xs text-muted-foreground">Every visit</div><div className="font-semibold">Customer earns $5</div></div>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-warning/20 text-warning flex items-center justify-center"><Award className="size-5" /></div>
            <div><div className="text-xs text-muted-foreground">More visits</div><div className="font-semibold">Higher tier &amp; better perks</div></div>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-info/15 text-info flex items-center justify-center"><Gift className="size-5" /></div>
            <div><div className="text-xs text-muted-foreground">Anytime</div><div className="font-semibold">Redeem credit on next meal</div></div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Members", v: "12,842", d: "+12.6%", i: Users, bg: "bg-accent text-primary" },
            { l: "Total Visits", v: "8,420", d: "+18.3%", i: Repeat, bg: "bg-success/15 text-success" },
            { l: "Credit Earned", v: "$42,100", d: "+18.3%", i: DollarSign, bg: "bg-warning/20 text-warning" },
            { l: "Credit Redeemed", v: "$28,640", d: "+21.4%", i: Gift, bg: "bg-info/15 text-info" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2.5"><div className={`size-9 rounded-full ${s.bg} flex items-center justify-center`}><s.i className="size-4" /></div><div className="text-sm text-muted-foreground">{s.l}</div></div>
              <div className="mt-2 text-2xl font-bold">{s.v} <span className="text-xs text-success font-semibold">▲ {s.d}</span></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold">Reward Milestones</h3>
                <button className="text-sm text-primary font-medium">Edit rewards</button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Customers unlock a free item every 3 visits</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {milestones.map((m) => (
                  <div key={m.visits} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className={`size-10 rounded-full ${m.bg} ${m.color} flex items-center justify-center shrink-0`}><m.icon className="size-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">After {m.visits} visits</div>
                      <div className="text-sm font-semibold truncate">{m.reward}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{m.reached.toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">reached</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">Customers Reaching Each Milestone</h3>
                  <p className="text-xs text-muted-foreground">How many regulars have unlocked each reward</p>
                </div>
                <span className="text-xs text-muted-foreground">All-time</span>
              </div>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={milestones} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="visits" fontSize={10} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(v) => `${v} visits`} />
                    <YAxis fontSize={10} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                      formatter={(v: number) => [`${v.toLocaleString()} customers`, "Reached"]}
                      labelFormatter={(l) => `Milestone: ${l} visits`}
                    />
                    <Bar dataKey="reached" radius={[6, 6, 0, 0]}>
                      {milestones.map((m) => (
                        <Cell key={m.visits} fill={m.bar} />
                      ))}
                      <LabelList dataKey="reward" position="top" fontSize={9} fill="var(--color-muted-foreground)" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Credit Activity</h3><span className="text-xs text-muted-foreground">Last 30 days</span></div>
              <div className="h-48">
                <ResponsiveContainer>
                  <AreaChart data={pointsActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="day" fontSize={10} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}K`} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="issued" name="Earned" stroke="var(--color-success)" fill="var(--color-success)" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="redeemed" name="Redeemed" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Top Regulars</h3><Link to="/customers" className="text-xs text-success font-medium hover:underline">View All</Link></div>
              <ul className="space-y-3">
                {topMembers.map((m) => (
                  <li key={m.n} className="flex items-center gap-2.5 text-sm">
                    <div className="size-8 rounded-full bg-gradient-to-br from-accent to-primary/30" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{m.n}</div>
                      <div className="text-xs text-muted-foreground">{m.visits} visits</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{m.earned}</div>
                      <span className={`text-[10px] font-semibold ${m.tier === "Platinum" ? "text-indigo-500" : m.tier === "Gold" ? "text-yellow-600" : "text-slate-500"}`}>{m.tier}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Recent Activity</h3><Link to="/customers" className="text-xs text-success font-medium hover:underline">View All</Link></div>
              <ul className="space-y-3">
                {recentTx.map((t, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <div className={`size-8 rounded-full flex items-center justify-center ${t.pos ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                      {t.pos ? <Repeat className="size-4" /> : <Gift className="size-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{t.n}</div>
                      <div className="text-xs text-muted-foreground truncate">{t.a}</div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{t.d}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <ul className="space-y-1">
                {([
                  { l: "Log a Visit", I: Repeat },
                  { l: "Give Bonus Credit", I: Gift },
                  { l: "Add New Member", I: UserPlus },
                ]).map(({ l, I }) => (
                  <li key={l}><button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 text-left"><I className="size-4 text-primary" /><span className="flex-1 text-sm">{l}</span><ChevronRight className="size-4 text-muted-foreground" /></button></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
