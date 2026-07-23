import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import {
  Bell, CalendarDays, Ban, UserX, Wallet, Receipt, Users, ArrowRight, Utensils, ChevronDown, Info,
} from "lucide-react";
import { TableHeatmap } from "@/components/TableHeatmap";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import { format, isSameDay } from "date-fns";
import {
  useBookings,
  useDashboardStats,
  useLast7DayMetrics,
  useMetricsInRange,
  useStaffUsers,
  useTableBusyCounts,
} from "@/lib/v2-data";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — RestoStack" }, { name: "description", content: "Overview of your restaurant performance" }] }),
  component: Dashboard,
});

const fmtMoney = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` : `$${Math.round(v)}`;
const fmtCount = (v: number) => `${v}`;
const fmtTicket = (v: number) => `$${v.toFixed(0)}`;

type StatKey = "bookings" | "cancellations" | "noshows" | "revenue" | "ticket" | "covers";

function Dashboard() {
  const [range, setRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [activeMetric, setActiveMetric] = useState<StatKey>("bookings");
  const { data: dash } = useDashboardStats();
  const { data: bookings = [] } = useBookings(new Date().toISOString().slice(0, 10));

  const isTodayRange =
    !!range?.from &&
    !!range?.to &&
    isSameDay(range.from, range.to) &&
    isSameDay(range.from, new Date());

  const fromISO = range?.from ? format(range.from, "yyyy-MM-dd") : "";
  const toISO = range?.to ? format(range.to, "yyyy-MM-dd") : fromISO;

  const { data: rangeTrend = [] } = useMetricsInRange(fromISO, toISO);
  const { data: last7Trend = [] } = useLast7DayMetrics();
  const trend = isTodayRange ? last7Trend : rangeTrend;

  const chartRangeLabel = isTodayRange
    ? "last 7 days"
    : range?.from
      ? `${format(range.from, "MMM d")} – ${format(range.to ?? range.from, "MMM d, yyyy")}`
      : "selected range";
  const { data: staffUsers = [] } = useStaffUsers();
  const { data: busyCounts = {} } = useTableBusyCounts();
  const { staff } = useAuth();

  const stats = [
    { key: "bookings" as StatKey, l: "Bookings Today", v: fmtCount(dash?.totalBookings ?? 0), c: `${dash?.covers ?? 0} covers`, i: CalendarDays, color: "var(--color-success)" },
    { key: "cancellations" as StatKey, l: "Cancellations", v: fmtCount(dash?.cancellations ?? 0), c: "today", i: Ban, color: "var(--color-destructive)" },
    { key: "noshows" as StatKey, l: "No Shows", v: fmtCount(dash?.noshows ?? 0), c: "today", i: UserX, color: "var(--color-destructive)" },
    { key: "revenue" as StatKey, l: "Actual Revenue", v: fmtMoney(dash?.revenue ?? 0), c: "today", i: Wallet, color: "var(--color-success)" },
    { key: "ticket" as StatKey, l: "Average Ticket", v: fmtTicket(dash?.avgTicket ?? 0), c: "today", i: Receipt, color: "var(--color-success)" },
    { key: "covers" as StatKey, l: "Covers Today", v: fmtCount(dash?.covers ?? 0), c: "guests", i: Users, color: "var(--color-info)" },
  ];
  const activeStat = stats.find((s) => s.key === activeMetric)!;

  const chartData = useMemo(() => {
    return trend.map((d) => {
      let actual = 0;
      if (activeMetric === "bookings") actual = d.bookings;
      else if (activeMetric === "cancellations") actual = d.cancellations;
      else if (activeMetric === "noshows") actual = d.noshows;
      else if (activeMetric === "revenue") actual = d.revenue;
      else if (activeMetric === "covers") actual = d.covers;
      else if (activeMetric === "ticket") actual = d.bookings ? d.revenue / Math.max(d.bookings, 1) : 0;
      return { day: d.day, actual };
    });
  }, [trend, activeMetric]);

  const fmtAxis = (v: number) =>
    activeMetric === "revenue" || activeMetric === "ticket" ? fmtMoney(v) : fmtCount(v);

  const upcomingBookings = bookings.filter((b) => b.status === "pending" || b.status === "confirmed").slice(0, 6);
  const foh = staffUsers.filter((s) => s.dept === "Front of House").length;
  const boh = staffUsers.filter((s) => s.dept === "Back of House").length;
  const mgmt = staffUsers.filter((s) => s.dept === "Management").length;
  const activeStaff = staffUsers.filter((s) => s.active).length;

  const topTables = Object.entries(busyCounts)
    .map(([id, c]) => ({ id: Number(id), c }))
    .sort((a, b) => b.c - a.c)
    .slice(0, 3);

  const insights: string[] = [];
  if ((dash?.totalBookings ?? 0) === 0) {
    insights.push("No bookings yet today. Share your public booking link to start filling the book.");
  } else {
    insights.push(`You have ${dash?.totalBookings ?? 0} booking${(dash?.totalBookings ?? 0) === 1 ? "" : "s"} today for ${dash?.covers ?? 0} covers.`);
  }
  if ((dash?.cancellations ?? 0) > 0) {
    insights.push(`${dash?.cancellations} cancellation${dash?.cancellations === 1 ? "" : "s"} today — consider a waitlist to fill those seats.`);
  }
  if ((dash?.noshows ?? 0) > 0) {
    insights.push(`${dash?.noshows} no-show${dash?.noshows === 1 ? "" : "s"} today.`);
  }
  if ((dash?.revenue ?? 0) === 0) {
    insights.push("Order revenue will appear here once tickets are rung up for this restaurant.");
  }
  if (staffUsers.length <= 1) {
    insights.push("Invite staff from the Staff page so each role has its own login.");
  }

  return (
    <AppShell>
      <div className="px-6 pt-4 pb-3 border-b border-border bg-card/40 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Live metrics for your restaurant only — no sample data</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <button
            onClick={() => setRange({ from: new Date(), to: new Date() })}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/50"
          >
            Today
          </button>
          <button className="relative size-9 rounded-lg border border-border bg-card flex items-center justify-center">
            <Bell className="size-4" />
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5">
            <div className="size-7 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground font-semibold text-xs">
              {(staff?.full_name ?? "?")[0]}
            </div>
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
          {stats.map((s) => {
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
                <div className="text-xs text-muted-foreground mt-1">{s.c}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-md border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{activeStat.l} — {chartRangeLabel}</h3>
            </div>
            <div className="h-72">
              {chartData.every((d) => d.actual === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                  <Info className="size-5" />
                  No activity in the last 7 days yet. Charts fill as your restaurant records bookings and orders.
                </div>
              ) : (
                <ResponsiveContainer>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="actG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={activeStat.color} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={activeStat.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtAxis} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => fmtAxis(v)} />
                    <Area isAnimationActive={false} type="monotone" dataKey="actual" stroke={activeStat.color} strokeWidth={2.5} fill="url(#actG)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Your Staff</h3>
              <Link to="/staff" className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:underline">
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="size-12 rounded-full bg-accent flex items-center justify-center">
                <Users className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-semibold">{staffUsers.length}</div>
                <div className="text-xs text-muted-foreground">{activeStaff} active</div>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm flex-1">
              {[
                ["Front of House", foh],
                ["Back of House", boh],
                ["Management", mgmt],
              ].map(([l, v]) => (
                <li key={l as string} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="size-3.5" />
                    {l}
                  </div>
                  <span className="font-semibold">{v}</span>
                </li>
              ))}
            </ul>
            {staffUsers.length === 0 && (
              <p className="text-xs text-muted-foreground mt-3">No staff accounts yet for this restaurant.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
            <h3 className="font-semibold mb-3">Insights</h3>
            <ul className="space-y-2 text-sm">
              {insights.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Info className="size-4 text-muted-foreground" />
                  </div>
                  <div>{t}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Upcoming Bookings</h3>
              <Link to="/bookings" className="text-xs text-primary font-medium hover:underline">
                View all →
              </Link>
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
              <Link to="/reports" className="text-xs text-primary font-medium hover:underline">
                View reports →
              </Link>
            </div>
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Utensils className="size-5 mx-auto mb-2 opacity-60" />
              Item sales appear here once this restaurant records orders.
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
              <div>
                <h3 className="font-semibold">Busiest Tables</h3>
                <p className="text-xs text-muted-foreground mt-0.5">From your bookings — last 30 days</p>
              </div>
            </div>
            {Object.keys(busyCounts).length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Assign tables to bookings to see which seats are busiest.
              </div>
            ) : (
              <>
                <TableHeatmap requests={busyCounts} />
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  {topTables.map((t) => (
                    <div key={t.id} className="rounded-lg border border-border p-2.5">
                      <div className="font-semibold">Table {t.id}</div>
                      <div className="text-[11px] text-muted-foreground">{t.c} guests</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
