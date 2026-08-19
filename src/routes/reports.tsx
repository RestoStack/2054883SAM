import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarChart3, Download, Calendar as CalendarIcon, TrendingUp, DollarSign, Users, ShoppingBag, ChevronDown, FileText, FileSpreadsheet } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { exportCsv, exportPdf } from "@/lib/export";
import { useBookings, useMetricsInRange, useOrders } from "@/lib/v2-data";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — RestoStack" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 6 * 86400000),
    to: new Date(),
  });
  const rangeLabel = range?.from
    ? `${format(range.from, "MMM d")} – ${format(range.to ?? range.from, "MMM d, yyyy")}`
    : "Pick a date range";

  const fromISO = range?.from ? format(range.from, "yyyy-MM-dd") : format(new Date(Date.now() - 6 * 86400000), "yyyy-MM-dd");
  const toISO = range?.to ? format(range.to, "yyyy-MM-dd") : format(range?.from ?? new Date(), "yyyy-MM-dd");

  const { data: trend = [] } = useMetricsInRange(fromISO, toISO);
  const { data: orders = [] } = useOrders();
  const { data: bookings = [] } = useBookings();

  const filteredOrders = useMemo(
    () => orders.filter((o) => {
      const d = o.createdAt.slice(0, 10);
      return d >= fromISO && d <= toISO;
    }),
    [orders, fromISO, toISO],
  );

  const filteredBookings = useMemo(
    () => bookings.filter((b) => b.date >= fromISO && b.date <= toISO),
    [bookings, fromISO, toISO],
  );

  const uniqueGuests = useMemo(() => {
    const ids = new Set<string>();
    for (const o of filteredOrders) if (o.customerId) ids.add(o.customerId);
    for (const b of filteredBookings) if (b.customerId) ids.add(b.customerId);
    return ids.size || new Set(filteredBookings.map((b) => b.name)).size;
  }, [filteredOrders, filteredBookings]);

  const revenue = filteredOrders.reduce((s, o) => s + o.totalRaw, 0);
  const avgTicket = filteredOrders.length ? revenue / filteredOrders.length : 0;
  const kpis = [
    { l: "Total Revenue", v: `$${revenue.toFixed(0)}`, i: DollarSign, c: "bg-success/15 text-success" },
    { l: "Total Orders", v: String(filteredOrders.length), i: ShoppingBag, c: "bg-info/15 text-info" },
    { l: "Avg Ticket", v: `$${avgTicket.toFixed(0)}`, i: TrendingUp, c: "bg-accent text-primary" },
    { l: "Unique Guests", v: String(uniqueGuests), i: Users, c: "bg-warning/15 text-warning" },
  ];

  const revenueData = trend.map((d) => ({ day: d.day, actual: d.revenue }));
  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, i) => ({ h: `${i + 11}:00`, covers: 0 }));
    for (const b of filteredBookings) {
      const hour = parseInt(b.rawTime?.slice(0, 2) ?? "", 10);
      if (!Number.isFinite(hour) || hour < 11 || hour > 22) continue;
      buckets[hour - 11].covers += b.people;
    }
    return buckets;
  }, [filteredBookings]);

  const buildRows = () => [
    ...kpis.map((k) => ({ Section: "KPI", Metric: k.l, Value: k.v, Change: "" })),
    ...revenueData.map((r) => ({ Section: "Revenue Trend", Metric: r.day, Value: `$${r.actual}`, Change: "" })),
    ...hourly.map((h) => ({ Section: "Covers by Hour", Metric: h.h, Value: `${h.covers} covers`, Change: "" })),
  ];

  const handleCsv = () => exportCsv(`reports_${format(new Date(), "yyyy-MM-dd")}`, ["Section", "Metric", "Value", "Change"], buildRows());
  const handlePdf = () =>
    exportPdf({
      title: "Reports",
      subtitle: "Sales and operational performance for your restaurant",
      meta: { "Date range": rangeLabel, Generated: new Date().toLocaleString() },
      columns: ["Section", "Metric", "Value", "Change"],
      rows: buildRows(),
    });

  const empty = filteredOrders.length === 0 && filteredBookings.length === 0;

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        description="Metrics calculated from your restaurant’s live data."
        icon={BarChart3}
        iconBg="bg-info/15"
        iconColor="text-info"
        actions={
          <>
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50">
                  <CalendarIcon className="size-4" /> {rangeLabel} <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50">
                  <Download className="size-4" /> Export <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1">
                <button onClick={handleCsv} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted text-left">
                  <FileSpreadsheet className="size-4 text-success" /> Export as CSV
                </button>
                <button onClick={handlePdf} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted text-left">
                  <FileText className="size-4 text-destructive" /> Export as PDF
                </button>
              </PopoverContent>
            </Popover>
          </>
        }
      />
      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full flex items-center justify-center ${k.c}`}>
                  <k.i className="size-5" />
                </div>
                <div className="text-sm text-muted-foreground">{k.l}</div>
              </div>
              <div className="mt-2 text-2xl font-bold">{k.v}</div>
            </div>
          ))}
        </div>

        {empty ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            No sales or booking activity yet for this restaurant. Reports will fill in as guests book and orders are recorded.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-3">Revenue ({rangeLabel})</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="actual" stroke="var(--color-success)" fill="var(--color-success)" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-3">Covers by hour ({rangeLabel})</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={hourly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="h" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="covers" fill="var(--color-info)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
