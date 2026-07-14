import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { Tag, Send, Users, TrendingUp, DollarSign, Plus, FileText, Calendar, Filter, ArrowRight, Utensils, ChevronDown } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Line, LineChart, PieChart, Pie, Cell } from "recharts";
import { revenueData, promotions } from "@/lib/mock-data";

export const Route = createFileRoute("/marketing/promotions")({
  head: () => ({ meta: [{ title: "Promotions & Offers — RestoStack" }] }),
  component: Promotions,
});

const status = [
  { n: "Active", v: 8, pct: "44.4%", c: "var(--color-success)" },
  { n: "Scheduled", v: 5, pct: "27.8%", c: "var(--color-chart-2)" },
  { n: "Completed", v: 4, pct: "22.2%", c: "var(--color-warning)" },
  { n: "Paused", v: 1, pct: "5.6%", c: "var(--color-chart-4)" },
];

const types = [
  { n: "Discount", v: 7, pct: "38.9%", c: "var(--color-success)" },
  { n: "Free Item", v: 5, pct: "27.8%", c: "var(--color-chart-2)" },
  { n: "BOGO", v: 3, pct: "16.7%", c: "var(--color-warning)" },
  { n: "Combo", v: 2, pct: "11.1%", c: "var(--color-chart-4)" },
  { n: "Other", v: 1, pct: "5.6%", c: "var(--color-chart-3)" },
];

const actions = [
  { i: "+", l: "Create New Promotion", s: "Build a new offer from scratch" },
  { i: "T", l: "Use Offer Template", s: "Choose from proven templates" },
  { i: "📅", l: "Schedule Promotion", s: "Set start and end dates" },
  { i: "👥", l: "Manage Segments", s: "Target the right audience" },
  { i: "📊", l: "View Reports", s: "Analyze promotion performance" },
];

function Promotions() {
  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-success/15 flex items-center justify-center"><Tag className="size-6 text-success" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Promotions & Offers</h1>
            <p className="text-sm text-muted-foreground mt-1">Create, manage and track promotions that drive more visits and increase revenue.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Create Promotion</button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"><FileText className="size-4" /> Offer Templates</button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"><Calendar className="size-4" /> May 13 – Jun 12, 2024</button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"><Filter className="size-4" /> Filter</button>
        </div>
      </div>

      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {[
            { l: "Total Promotions", v: "18", d: "20.0%", up: true, i: Tag, bg: "bg-success/15 text-success" },
            { l: "Redemptions", v: "2,842", d: "18.7%", up: true, i: Send, bg: "bg-accent text-primary" },
            { l: "Customers Reached", v: "24.5K", d: "23.4%", up: true, i: Users, bg: "bg-info/15 text-info" },
            { l: "Conversion Rate", v: "11.6%", d: "1.8%", up: true, i: TrendingUp, bg: "bg-warning/20 text-warning" },
            { l: "Revenue Generated", v: "$28,645", d: "27.3%", up: true, i: DollarSign, bg: "bg-destructive/15 text-destructive" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2.5"><div className={`size-10 rounded-full ${s.bg} flex items-center justify-center`}><s.i className="size-5" /></div><div className="text-sm text-muted-foreground">{s.l}</div></div>
              <div className="mt-2 text-2xl font-bold">{s.v}</div>
              <div className="text-xs"><span className="text-success font-semibold">▲ {s.d}</span> <span className="text-muted-foreground">vs Apr 13 – May 12</span></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Performance Overview</h3><button className="text-xs rounded-md border border-border px-2 py-1">Last 30 Days ▾</button></div>
            <div className="flex gap-4 text-xs mb-2">
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-2" /> Redemptions</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" /> Revenue</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" fontSize={10} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="l" fontSize={10} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="r" orientation="right" fontSize={10} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}K`} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Line yAxisId="l" dataKey="actual" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="r" dataKey="projected" stroke="var(--color-success)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Promotions by Status</h3>
            <div className="flex items-center gap-4">
              <div className="relative size-40">
                <ResponsiveContainer><PieChart><Pie data={status} dataKey="v" innerRadius={48} outerRadius={70} paddingAngle={1}>{status.map((s, i) => <Cell key={i} fill={s.c} />)}</Pie></PieChart></ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center"><div className="text-2xl font-bold">18</div><div className="text-[10px] text-muted-foreground">Total</div></div>
              </div>
              <ul className="flex-1 space-y-2 text-sm">{status.map((s) => (<li key={s.n} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: s.c }} /><span className="flex-1">{s.n}</span><span className="font-semibold">{s.v}</span><span className="text-xs text-muted-foreground">({s.pct})</span></li>))}</ul>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold mb-3 px-1">Quick Actions</h3>
            <ul className="space-y-1">
              {actions.map((a) => (
                <li key={a.l}><button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 text-left"><div className="size-9 rounded-lg bg-accent flex items-center justify-center text-primary font-bold">{a.i}</div><div className="flex-1"><div className="text-sm font-semibold">{a.l}</div><div className="text-xs text-muted-foreground">{a.s}</div></div><ArrowRight className="size-4 text-muted-foreground" /></button></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border"><h3 className="font-semibold">Top Performing Promotions</h3><button className="text-xs text-success font-medium">View All</button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b border-border">{["Promotion", "Type", "Redemptions", "Customers Reached", "Conversion Rate", "Revenue Generated", "ROI", "Status", ""].map((h) => <th key={h} className="text-left font-medium px-3 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p.name} className="border-b border-border last:border-0">
                    <td className="px-3 py-3"><div className="flex items-center gap-2.5"><div className="size-10 rounded-lg bg-gradient-to-br from-warning/30 to-destructive/20 flex items-center justify-center text-[10px] font-bold text-destructive">{p.type === "BOGO" ? "1+1" : "%"}</div><div><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.sub}</div></div></div></td>
                    <td className="px-3 py-3 text-xs">{p.type}</td>
                    <td className="px-3 py-3">{p.redemptions}</td>
                    <td className="px-3 py-3">{p.reach}</td>
                    <td className="px-3 py-3">{p.conv}</td>
                    <td className="px-3 py-3 font-semibold">{p.revenue}</td>
                    <td className="px-3 py-3 font-semibold text-success">{p.roi}</td>
                    <td className="px-3 py-3"><span className={`rounded-full text-xs font-semibold px-2.5 py-1 ${p.status === "Active" ? "bg-success/15 text-success" : p.status === "Completed" ? "bg-info/15 text-info" : "bg-warning/20 text-warning"}`}>{p.status}</span></td>
                    <td className="text-muted-foreground">⋯</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <div className="text-center py-4 text-sm text-success font-semibold cursor-pointer">View All Promotions</div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-4">Promotion Type Breakdown</h3>
              <div className="flex items-center gap-4">
                <div className="relative size-32">
                  <ResponsiveContainer><PieChart><Pie data={types} dataKey="v" innerRadius={38} outerRadius={56} paddingAngle={1}>{types.map((t, i) => <Cell key={i} fill={t.c} />)}</Pie></PieChart></ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><div className="text-xl font-bold">18</div><div className="text-[10px] text-muted-foreground">Total</div></div>
                </div>
                <ul className="flex-1 space-y-1.5 text-xs">{types.map((t) => (<li key={t.n} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: t.c }} /><span className="flex-1">{t.n}</span><span className="font-semibold">{t.v}</span><span className="text-muted-foreground">({t.pct})</span></li>))}</ul>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-4">Audience Breakdown</h3>
              <ul className="space-y-3 text-sm">
                {[["All Customers", "12.4K", "50.6%", "bg-success"], ["Loyalty Members", "6.1K", "24.9%", "bg-chart-2"], ["New Customers", "3.8K", "15.5%", "bg-warning"], ["VIP Customers", "2.2K", "9.0%", "bg-chart-4"]].map(([n, v, pct, c]) => (
                  <li key={n}>
                    <div className="flex items-center justify-between text-xs mb-1"><span>{n}</span><span><b>{v}</b> <span className="text-muted-foreground">({pct})</span></span></div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full ${c}`} style={{ width: pct as string }} /></div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-xs text-muted-foreground inline-flex items-center gap-1.5">ⓘ Data shows reach during selected date range</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
