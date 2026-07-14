import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { Mail, Send, MousePointerClick, User, DollarSign, FileText, Plus, Calendar, Filter, ChevronDown, ChevronLeft, ChevronRight, Utensils } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { emailCampaigns, sparkData } from "@/lib/mock-data";

export const Route = createFileRoute("/marketing/email")({
  head: () => ({ meta: [{ title: "Email Marketing — RestoStack" }] }),
  component: EmailMarketing,
});

const stats = [
  { l: "Emails Sent", v: "18,642", d: "18.6%", i: Send, color: "var(--color-chart-2)", bg: "bg-accent text-primary" },
  { l: "Open Rate", v: "41.8%", d: "6.2%", i: Mail, color: "var(--color-info)", bg: "bg-info/15 text-info" },
  { l: "Click Rate", v: "7.6%", d: "1.3%", i: MousePointerClick, color: "var(--color-chart-4)", bg: "bg-chart-4/15 text-chart-4" },
  { l: "Conversion Rate", v: "3.9%", d: "0.9%", i: User, color: "var(--color-warning)", bg: "bg-warning/20 text-warning" },
  { l: "Revenue from Email", v: "$4,280.50", d: "22.4%", i: DollarSign, color: "var(--color-success)", bg: "bg-success/15 text-success" },
];

const perf = Array.from({ length: 30 }, (_, i) => ({ x: i, open: 35 + Math.sin(i / 3) * 8 + i / 5, click: 5 + Math.sin(i / 4) * 2, conv: 3 + Math.cos(i / 5) * 1 }));

function EmailMarketing() {
  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-accent flex items-center justify-center"><Mail className="size-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Email Marketing</h1>
            <p className="text-sm text-muted-foreground mt-1">Create, send and track email campaigns.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"><FileText className="size-4" /> Email Templates</button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Create Campaign</button>
        </div>
      </div>

      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.map((s, i) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2.5"><div className={`size-10 rounded-full ${s.bg} flex items-center justify-center`}><s.i className="size-5" /></div><div className="text-sm text-muted-foreground">{s.l}</div></div>
              <div className="mt-2 flex items-baseline gap-2"><div className="text-2xl font-bold">{s.v}</div><div className="text-xs text-success font-semibold">▲ {s.d}</div></div>
              <div className="text-xs text-muted-foreground">vs Apr 13 – May 12, 2024</div>
              <div className="h-10 -mx-1 mt-1"><ResponsiveContainer><AreaChart data={sparkData(i+5)}><Area type="monotone" dataKey="y" stroke={s.color} strokeWidth={1.5} fill={s.color} fillOpacity={0.15} /></AreaChart></ResponsiveContainer></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 pt-3">
              <div className="flex items-center gap-4 overflow-x-auto">
                {["All Campaigns", "Scheduled", "Sent", "Drafts", "Automations"].map((t, i) => (
                  <button key={t} className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap ${i === 0 ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{t}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 pb-2">
                <button className="text-xs inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5">All Campaign Types <ChevronDown className="size-3" /></button>
                <button className="text-xs inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5"><Calendar className="size-3" /> May 13 – Jun 12, 2024 <ChevronDown className="size-3" /></button>
                <button className="text-xs inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5"><Filter className="size-3" /> Filter <ChevronDown className="size-3" /></button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground border-b border-border">{["Campaign", "Type", "Audience", "Sent", "Open Rate", "Click Rate", "Revenue", "Status", ""].map((h) => <th key={h} className="text-left font-medium px-3 py-3">{h}</th>)}</tr></thead>
                <tbody>
                  {emailCampaigns.map((c) => (
                    <tr key={c.name} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-3"><div className="flex items-center gap-2.5"><div className="size-10 rounded-lg bg-gradient-to-br from-accent to-warning/30 flex items-center justify-center"><Utensils className="size-4 text-primary" /></div><div><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.sub}</div><span className="mt-1 inline-block rounded-md bg-accent text-accent-foreground text-[10px] font-semibold px-2 py-0.5">{c.tag}</span></div></div></td>
                      <td className="px-3 py-3"><div className="size-7 rounded-md bg-muted flex items-center justify-center text-xs">📧</div></td>
                      <td className="px-3 py-3 text-xs">{c.audience}</td>
                      <td className="px-3 py-3 text-xs">{c.sent}</td>
                      <td className="px-3 py-3"><div className="font-semibold">{c.open}</div><div className="text-xs text-success">▲ {c.od}</div></td>
                      <td className="px-3 py-3"><div className="font-semibold">{c.click}</div><div className="text-xs text-success">▲ {c.cd}</div></td>
                      <td className="px-3 py-3 font-semibold">{c.revenue}</td>
                      <td className="px-3 py-3"><span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success text-xs font-semibold px-2.5 py-0.5"><span className="size-1.5 rounded-full bg-success" />Sent</span></td>
                      <td className="px-2 text-muted-foreground">⋯</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3 text-sm border-t border-border">
              <span className="text-muted-foreground">Showing 1 to 7 of 57 campaigns</span>
              <div className="flex items-center gap-1">
                <button className="size-8 rounded-md border border-border flex items-center justify-center"><ChevronLeft className="size-4" /></button>
                <button className="size-8 rounded-md bg-primary text-primary-foreground font-semibold">1</button>
                <button className="size-8 rounded-md border border-border">2</button>
                <button className="size-8 rounded-md border border-border">3</button>
                <span>...</span>
                <button className="size-8 rounded-md border border-border">8</button>
                <button className="size-8 rounded-md border border-border flex items-center justify-center"><ChevronRight className="size-4" /></button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Email Performance Over Time</h3><button className="text-xs rounded-md border border-border px-2 py-1">Daily ▾</button></div>
              <div className="flex gap-3 text-xs mb-2">
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-2" /> Open Rate</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-4" /> Click Rate</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" /> Conversion Rate</span>
              </div>
              <div className="h-56">
                <ResponsiveContainer>
                  <LineChart data={perf}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <YAxis fontSize={10} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 60]} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <Line dataKey="open" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
                    <Line dataKey="click" stroke="var(--color-chart-4)" strokeWidth={2} dot={false} />
                    <Line dataKey="conv" stroke="var(--color-warning)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Top Performing Campaigns</h3><button className="text-xs rounded-md border border-border px-2 py-1">By Revenue ▾</button></div>
              <ul className="space-y-3">
                {[["Weekend Special", "Jun 10, 2024", "$1,245.50", 100], ["New Menu Launch", "Jun 3, 2024", "$1,102.20", 88], ["We Miss You!", "Jun 8, 2024", "$842.30", 67], ["Lunch Deal", "May 20, 2024", "$770.60", 62], ["Birthday Special", "May 25, 2024", "$320.40", 26]].map(([n, d, r, w], i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="size-6 rounded-full bg-muted text-xs font-bold flex items-center justify-center">{i+1}</span>
                    <div className="size-9 rounded-lg bg-gradient-to-br from-accent to-warning/30 flex items-center justify-center"><Utensils className="size-4 text-primary" /></div>
                    <div className="flex-1 min-w-0"><div className="font-medium truncate">{n}</div><div className="text-xs text-muted-foreground">{d}</div></div>
                    <div className="w-24"><div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-success" style={{ width: `${w}%` }} /></div></div>
                    <div className="text-xs font-semibold w-16 text-right">{r}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
