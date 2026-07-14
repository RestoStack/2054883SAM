import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { UserPlus, Send, Mail, Users, DollarSign, Calendar, Filter, Plus, FileText, MessageSquare, CheckCircle2, Utensils } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import { relapsedCampaigns } from "@/lib/mock-data";

export const Route = createFileRoute("/marketing/catch-back")({
  head: () => ({ meta: [{ title: "Catch Back Relapsed Customers — RestoStack" }] }),
  component: CatchBack,
});

const decay = [
  { d: "7 - 14 days", v: 1024, sub: "1,024 (31.2%)" },
  { d: "15 - 30 days", v: 895, sub: "895 (27.2%)" },
  { d: "31 - 60 days", v: 742, sub: "742 (22.6%)" },
  { d: "61 - 90 days", v: 351, sub: "351 (10.7%)" },
  { d: "90+ days", v: 272, sub: "272 (8.3%)" },
];

const usedToDine = [
  { n: "Dine-in", v: 1842, pct: "56.1%", c: "var(--color-success)" },
  { n: "Delivery", v: 892, pct: "27.1%", c: "var(--color-chart-2)" },
  { n: "Takeaway", v: 352, pct: "10.7%", c: "oklch(0.75 0.10 290)" },
  { n: "Catering", v: 198, pct: "6.1%", c: "var(--color-warning)" },
];

const reasons = [
  { n: "Price sensitive", v: "28%" }, { n: "Found another place", v: "24%" }, { n: "Infrequent visits", v: "19%" },
  { n: "Moved / Location", v: "12%" }, { n: "Service issues", v: "8%" }, { n: "Other", v: "9%" },
];

function CatchBack() {
  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-warning/20 flex items-center justify-center"><UserPlus className="size-6 text-warning" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Catch Back Relapsed Customers</h1>
            <p className="text-sm text-muted-foreground mt-1">Re-engage customers who haven't visited in a while and bring them back.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"><Calendar className="size-4" /> May 13 – Jun 12, 2024</button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"><Filter className="size-4" /> Filter</button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"><FileText className="size-4" /> Campaign Templates</button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground"><Plus className="size-4" /> New Campaign</button>
        </div>
      </div>

      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {[
            { l: "Relapsed Customers", v: "3,284", d: "8.6%", up: false, i: UserPlus, bg: "bg-warning/20 text-warning" },
            { l: "Re-engagement Sent", v: "2,156", d: "12.4%", up: true, i: Send, bg: "bg-accent text-primary" },
            { l: "Response Rate", v: "21.7%", d: "4.3%", up: true, i: Mail, bg: "bg-info/15 text-info" },
            { l: "Customers Returned", v: "698", d: "16.8%", up: true, i: Users, bg: "bg-success/15 text-success" },
            { l: "Revenue Recovered", v: "$12,430", d: "22.3%", up: true, i: DollarSign, bg: "bg-destructive/15 text-destructive" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2.5"><div className={`size-10 rounded-full ${s.bg} flex items-center justify-center`}><s.i className="size-5" /></div><div className="text-sm text-muted-foreground">{s.l}</div></div>
              <div className="mt-2 text-2xl font-bold">{s.v}</div>
              <div className={`text-xs font-semibold ${s.up ? "text-success" : "text-destructive"}`}>{s.up ? "▲" : "▼"} {s.d}</div>
              <div className="text-xs text-muted-foreground">vs Apr 13 – May 12, 2024</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-1"><h3 className="font-semibold">Relapsed Customers Overview</h3><button className="text-xs rounded-md border border-border px-2 py-1">Last 30 Days ▾</button></div>
            <div className="text-xs text-muted-foreground mb-3">By days since last visit</div>
            <div className="h-60">
              <ResponsiveContainer>
                <AreaChart data={decay}>
                  <defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="d" fontSize={10} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="v" stroke="var(--color-success)" strokeWidth={2.5} fill="url(#dg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-5 text-[10px] text-muted-foreground text-center">{decay.map((d) => <div key={d.d}>{d.sub}</div>)}</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Where They Used to Dine</h3>
            <div className="flex items-center gap-4">
              <div className="relative size-40">
                <ResponsiveContainer><PieChart><Pie data={usedToDine} dataKey="v" innerRadius={48} outerRadius={70} paddingAngle={2}>{usedToDine.map((u, i) => <Cell key={i} fill={u.c} />)}</Pie></PieChart></ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center"><div className="text-xl font-bold">3,284</div><div className="text-[10px] text-muted-foreground text-center">Relapsed<br />Customers</div></div>
              </div>
              <ul className="flex-1 space-y-2.5 text-sm">
                {usedToDine.map((u) => (<li key={u.n} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: u.c }} /><span className="flex-1">{u.n}</span><span className="font-semibold">{u.v.toLocaleString()}</span><span className="text-muted-foreground text-xs">({u.pct})</span></li>))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Top Reasons (AI Insights)</h3>
            <ul className="space-y-3 text-sm">
              {reasons.map((r, i) => (
                <li key={r.n} className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs">{["💰", "📍", "📉", "🚚", "⚠️", "•"][i]}</div>
                  <span className="flex-1">{r.n}</span><span className="font-semibold">{r.v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border"><h3 className="font-semibold">Recent Re-engagement Campaigns</h3><button className="text-xs text-success font-medium">View All</button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b border-border">{["Campaign", "Channel", "Audience", "Sent", "Response Rate", "Returned", "Revenue", "Status"].map((h) => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {relapsedCampaigns.map((c) => (
                  <tr key={c.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="size-10 rounded-lg bg-gradient-to-br from-warning/30 to-accent flex items-center justify-center"><Utensils className="size-4 text-warning" /></div><div><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.sub}</div></div></div></td>
                    <td className="px-4 py-3"><div className={`size-8 rounded-md flex items-center justify-center ${c.channel === "email" ? "bg-info/15 text-info" : "bg-success/15 text-success"}`}>{c.channel === "email" ? <Mail className="size-4" /> : <MessageSquare className="size-4" />}</div></td>
                    <td className="px-4 py-3 text-xs"><div>{c.audience}</div><div className="text-muted-foreground">{c.count}</div></td>
                    <td className="px-4 py-3 text-xs">{c.sent}</td>
                    <td className="px-4 py-3 font-semibold">{c.rate}</td>
                    <td className="px-4 py-3">{c.returned}</td>
                    <td className="px-4 py-3 font-semibold">{c.revenue}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-success/15 text-success text-xs font-semibold px-2.5 py-1">{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <div className="p-4"><button className="w-full rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/30"><Plus className="size-4 inline mr-1" /> Create New Campaign</button></div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-4">Re-engagement Performance Funnel</h3>
              <div className="flex items-end gap-4">
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  {[{ w: "100%", c: "bg-chart-4" }, { w: "85%", c: "bg-chart-2" }, { w: "60%", c: "bg-info" }, { w: "40%", c: "bg-success" }, { w: "30%", c: "bg-warning" }].map((s, i) => (
                    <div key={i} className={`h-7 ${s.c} rounded`} style={{ width: s.w }} />
                  ))}
                </div>
                <ul className="text-xs space-y-2 w-32">
                  <li>Relapsed Customers <b className="block">3,284 (100%)</b></li>
                  <li>Re-engagement Sent <b className="block">2,156 (65.6%)</b></li>
                  <li>Responded <b className="block">468 (21.7%)</b></li>
                  <li>Returned <b className="block">698 (32.3%)</b></li>
                </ul>
              </div>
              <div className="mt-4 flex justify-between items-center rounded-lg bg-success/10 px-3 py-2 text-sm"><span className="text-success font-medium">Revenue Recovered</span><span className="font-bold text-success">$12,430</span></div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-4">Tips to Win Back Customers</h3>
              <ul className="space-y-3 text-sm">
                {[
                  "Offer personalized incentives based on their past behavior.",
                  "Remind them about new menu items or seasonal offers.",
                  "Use SMS for higher open rates and quick responses.",
                  "Send at optimal times (11AM – 2PM or 5PM – 8PM).",
                  "A/B test offers and messages to improve results.",
                ].map((t) => (<li key={t} className="flex items-start gap-2"><CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" /> {t}</li>))}
              </ul>
              <button className="mt-4 w-full rounded-lg border border-border py-2 text-sm font-medium">📖 View Best Practices Guide</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
