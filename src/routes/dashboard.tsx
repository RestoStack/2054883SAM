import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import { Calendar as CalendarIcon, Bell, CalendarDays, Ban, UserX, Wallet, Receipt, Users, ChefHat, Briefcase, ArrowRight, TrendingUp, Sparkles, AlertTriangle, Utensils, ChevronDown } from "lucide-react";
import { TableHeatmap } from "@/components/TableHeatmap";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Line } from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import { useBookings, useDashboardStats } from "@/lib/v2-data";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — RestoStack" }, { name: "description", content: "Overview of your restaurant performance" }] }),
  component: Dashboard,
});



const fmtMoney = (v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` : v}`;
const fmtCount = (v: number) => `${v}`;
const fmtTicket = (v: number) => `$${v.toFixed(0)}`;

type StatKey = "bookings" | "cancellations" | "noshows" | "projection" | "revenue" | "ticket";

const buildStats = (s: { totalBookings: number; cancellations: number; noshows: number; revenue: number; avgTicket: number; covers: number }) => [
  { key: "bookings" as StatKey, l: "Bookings Today", v: fmtCount(s.totalBookings), d: { value: "", positive: true }, c: `${s.covers} covers`, i: CalendarDays, color: "var(--color-success)", fmt: fmtCount },
  { key: "cancellations" as StatKey, l: "Cancellations", v: fmtCount(s.cancellations), d: { value: "", positive: false }, c: "today", i: Ban, color: "var(--color-destructive)", fmt: fmtCount },
  { key: "noshows" as StatKey, l: "No Shows", v: fmtCount(s.noshows), d: { value: "", positive: false }, c: "today", i: UserX, color: "var(--color-destructive)", fmt: fmtCount },
  { key: "revenue" as StatKey, l: "Actual Revenue", v: fmtMoney(s.revenue), d: { value: "", positive: true }, c: "today", i: Wallet, color: "var(--color-success)", fmt: fmtMoney },
  { key: "ticket" as StatKey, l: "Average Ticket", v: fmtTicket(s.avgTicket), d: { value: "", positive: true }, c: "today", i: Receipt, color: "var(--color-success)", fmt: fmtTicket },
];

const days = ["May 14", "May 15", "May 16", "May 17", "May 18", "May 19", "May 20"];
const series = (actuals: number[], projecteds: number[]) =>
  days.map((day, i) => ({ day, actual: actuals[i], projected: projecteds[i] }));

const metricSeries: Record<StatKey, { day: string; actual: number; projected: number }[]> = {
  bookings: series([86, 92, 104, 98, 112, 121, 128], [90, 95, 100, 105, 115, 125, 132]),
  cancellations: series([12, 10, 14, 9, 11, 7, 8], [11, 11, 12, 10, 10, 9, 9]),
  noshows: series([3, 5, 4, 6, 7, 4, 5], [4, 4, 5, 5, 5, 5, 5]),
  projection: series([3400, 4300, 4500, 5400, 6300, 7100, 8420], [3500, 4400, 4700, 5600, 6500, 7400, 8600]),
  revenue: series([3200, 4100, 3800, 5200, 6100, 6800, 7685], [3400, 4300, 4500, 5400, 6300, 7100, 8420]),
  ticket: series([54, 58, 56, 61, 63, 64, 65.8], [55, 59, 60, 62, 64, 65, 67]),
};

function Spark({ seed, color }: { seed: number; color: string }) {
  const pts = Array.from({ length: 14 }, (_, i) =>
    Math.round(20 + Math.sin(i / 2 + seed) * 8 + (i * (seed % 3 + 1)) / 3 + (seed % 5) * 2)
  );
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const w = 100;
  const h = 32;
  const step = w / (pts.length - 1);
  const coords = pts.map((v, i) => [i * step, h - ((v - min) / range) * h] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gid = `sg${seed}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-10 w-full mt-2 block">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Dashboard() {
  const [range, setRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [activeMetric, setActiveMetric] = useState<StatKey>("revenue");
  const { data: dash } = useDashboardStats();
  const { data: bookings = [] } = useBookings(new Date().toISOString().slice(0, 10));
  const { staff } = useAuth();
  const stats = buildStats({
    totalBookings: dash?.totalBookings ?? 0,
    cancellations: dash?.cancellations ?? 0,
    noshows: dash?.noshows ?? 0,
    revenue: dash?.revenue ?? 0,
    avgTicket: dash?.avgTicket ?? 0,
    covers: dash?.covers ?? 0,
  });
  const activeStat = stats.find((s) => s.key === activeMetric)!;
  const upcomingBookings = bookings.filter((b) => b.status === "pending" || b.status === "confirmed").slice(0, 4);
  return (
    <AppShell>
      <div className="px-6 pt-4 pb-3 border-b border-border bg-card/40 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Overview of your restaurant performance</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <button
            onClick={() => setRange({ from: new Date(), to: new Date() })}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/50"
          >Today</button>
          <button className="relative size-9 rounded-lg border border-border bg-card flex items-center justify-center">
            <Bell className="size-4" />
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-success text-[10px] font-semibold text-background flex items-center justify-center">3</span>
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5">
            <div className="size-7 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground font-semibold text-xs">{(staff?.full_name ?? "?")[0]}</div>
            <div className="text-left leading-tight">
              <div className="text-sm font-semibold">{staff?.full_name ?? "Guest"}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{staff?.role ?? ""}</div>
            </div>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="p-4 lg:p-5 space-y-4">
        
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {stats.map((s, i) => {
            const isActive = activeMetric === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActiveMetric(s.key)}
                className={`text-left rounded-lg border bg-card p-3 shadow-sm transition-colors ${isActive ? "border-success ring-2 ring-success/30" : "border-border hover:border-foreground/30"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="text-sm text-muted-foreground">{s.l}</div>
                  <s.i className="size-4 text-muted-foreground" />
                </div>
                <div className="mt-1 text-xl font-semibold tracking-tight">{s.v}</div>
                <div className={`text-xs font-semibold mt-1 ${s.d.positive ? "text-success" : "text-destructive"}`}>
                  <span className="inline-flex items-center gap-0.5">{s.d.positive ? "▲" : "▼"} {s.d.value}</span>
                  <span className="text-muted-foreground font-normal ml-1">{s.c}</span>
                </div>
                <Spark seed={i + 1} color={s.color} />
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-md border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{activeStat.l} Overview</h3>
              <button className="text-xs rounded-md border border-border px-2 py-1">By Day ▾</button>
            </div>
            <div className="flex items-center gap-4 mb-3 text-sm">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full" style={{ background: activeStat.color }} />{activeStat.l}</div>
                <div className="font-bold text-lg">{activeStat.v}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full bg-muted-foreground" />vs yesterday</div>
                <div className={`font-bold text-lg ${activeStat.d.positive ? "text-success" : "text-destructive"}`}>{activeStat.d.positive ? "▲" : "▼"} {activeStat.d.value}</div>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={metricSeries[activeMetric]}>
                  <defs>
                    <linearGradient id="actG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={activeStat.color} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={activeStat.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => activeStat.fmt(v)} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => activeStat.fmt(v)} />
                  <Area isAnimationActive={false} type="monotone" dataKey="actual" stroke={activeStat.color} strokeWidth={2.5} fill="url(#actG)" />
                  <Line isAnimationActive={false} type="monotone" dataKey="projected" stroke="var(--color-muted-foreground)" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Staff Working</h3>
              <Link to="/staff" className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline">View all <ArrowRight className="size-3" /></Link>
            </div>
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="size-12 rounded-full bg-accent flex items-center justify-center"><Users className="size-5 text-primary" /></div>
              <div className="flex-1">
                <div className="text-2xl font-semibold">24</div>
                <div className="text-xs text-muted-foreground">Employees</div>
              </div>
              <div className="text-right text-xs"><div className="text-muted-foreground">vs yesterday</div><div className="text-success font-semibold">▲ 2</div></div>
            </div>
            <ul className="mt-3 space-y-1 text-sm flex-1">
              {[["Front of House", 14], ["Back of House", 8], ["Management", 2]].map(([l, v]) => (
                <li key={l as string} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 text-muted-foreground"><Users className="size-3.5" />{l}</div>
                  <span className="font-semibold">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">Staff Labour Overview</h3>
                <div className="text-xs text-muted-foreground">Total Labour Cost</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">$1,852.50</div>
                <div className="text-xs text-destructive font-semibold">▼ 8.4% vs yesterday</div>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="relative size-24 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie isAnimationActive={false} data={[{ v: 24.1 }, { v: 75.9 }]} dataKey="v" innerRadius={28} outerRadius={42}>
                      <Cell fill="var(--color-success)" /><Cell fill="var(--color-muted)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-sm font-bold">24.1%</div>
                  <div className="text-[9px] text-muted-foreground text-center">of Revenue</div>
                </div>
              </div>
              <div className="flex-1 space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2"><div className="size-7 rounded-full bg-chart-4/20 flex items-center justify-center"><Briefcase className="size-3.5 text-chart-4" /></div>FOH Labour</div>
                  <div className="text-right"><div className="font-bold">$1,024.60</div><div className="text-xs text-muted-foreground">23.2% of Revenue</div></div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2"><div className="size-7 rounded-full bg-success/20 flex items-center justify-center"><ChefHat className="size-3.5 text-success" /></div>BOH Labour</div>
                  <div className="text-right"><div className="font-bold">$827.90</div><div className="text-xs text-muted-foreground">20.9% of Revenue</div></div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Upcoming Bookings</h3>
              <Link to="/bookings" className="text-xs text-primary font-medium hover:underline">View all →</Link>
            </div>
            <ul className="space-y-1 text-sm">
              {upcomingBookings.length === 0 && (
                <li className="text-xs text-muted-foreground text-center py-4">No upcoming bookings today.</li>
              )}
              {upcomingBookings.map((b) => (
                <li key={b.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                  <div className="text-xs font-semibold w-16">{b.time}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.people} People</div>
                  </div>
                  <span className="rounded-full bg-success/15 text-success text-[10px] font-semibold px-2 py-0.5 capitalize">{b.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Top Performing Items</h3>
              <Link to="/reports" className="text-xs text-primary font-medium hover:underline">View full report →</Link>
            </div>
            <div className="flex text-xs text-muted-foreground mb-2 px-1"><div className="flex-1">Item</div><div className="w-12 text-right">Orders</div><div className="w-16 text-right">Revenue</div></div>
            <ul className="space-y-2 text-sm">
              {[["Truffle Pasta", 124, "$2,604"], ["Grilled Salmon", 98, "$2,155"], ["Margherita Pizza", 86, "$1,548"], ["Ribeye Steak", 74, "$1,480"], ["Tiramisu", 68, "$952"]].map(([n, o, r]) => (
                <li key={n as string} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                  <div className="size-8 rounded-md bg-gradient-to-br from-accent to-secondary flex items-center justify-center"><Utensils className="size-3.5 text-primary" /></div>
                  <div className="flex-1 font-medium">{n}</div>
                  <div className="w-12 text-right text-muted-foreground">{o}</div>
                  <div className="w-16 text-right font-semibold text-success">{r}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-3">Insights</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-3"><div className="size-8 rounded-full bg-success/15 flex items-center justify-center shrink-0"><TrendingUp className="size-4 text-success" /></div><div>Revenue is up <b className="text-success">15.2%</b> compared to yesterday. Great work! Keep it up.</div></li>
              <li className="flex gap-3"><div className="size-8 rounded-full bg-info/15 flex items-center justify-center shrink-0"><Users className="size-4 text-info" /></div><div>Weekend bookings are <b className="text-info">24% higher</b> than the weekday average.</div></li>
              <li className="flex gap-3"><div className="size-8 rounded-full bg-warning/20 flex items-center justify-center shrink-0"><AlertTriangle className="size-4 text-warning" /></div><div>No shows rate is higher than usual on Friday evenings.</div></li>
              <li className="flex gap-3"><div className="size-8 rounded-full bg-accent flex items-center justify-center shrink-0"><Sparkles className="size-4 text-primary" /></div><div>Truffle Pasta is your <b>top revenue generator</b> this week.</div></li>
            </ul>
            <Link to="/reports" className="mt-4 block w-full text-center text-xs text-primary font-medium hover:underline">View all insights →</Link>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
            <div>
              <h3 className="font-semibold">Busiest Tables</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Where guests sit most — last 30 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: "hsl(210 55% 55%)" }} />Quiet</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: "hsl(35 85% 58%)" }} />Busy</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: "hsl(0 80% 55%)" }} />Hotspot</span>
            </div>
          </div>
          <TableHeatmap
            requests={{
              412: 47, 413: 38, 414: 42, 415: 51, 416: 33, 417: 28,
              404: 22, 405: 31, 406: 45, 407: 24, 408: 18, 409: 15,
              400: 58, 401: 49, 402: 36, 403: 41,
              420: 26, 421: 19,
              410: 12, 411: 9, 418: 14, 419: 7, 422: 5, 423: 11,
              500: 8, 501: 6, 502: 14, 503: 4, 504: 3,
              505: 17, 506: 23, 507: 19, 508: 2, 509: 11, 510: 13,
              511: 16, 512: 9, 513: 21, 514: 12,
            }}
          />
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {[
              { id: 400, label: "Bottom right booth", c: 58 },
              { id: 415, label: "Window row", c: 51 },
              { id: 401, label: "Corner round", c: 49 },
            ].map((t) => (
              <div key={t.id} className="rounded-lg border border-border p-2.5">
                <div className="font-semibold">Table {t.id}</div>
                <div className="text-[11px] text-muted-foreground">{t.label} · {t.c} guests</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </AppShell>
  );
}
