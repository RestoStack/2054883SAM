import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarChart3, Download, Calendar as CalendarIcon, TrendingUp, DollarSign, Users, ShoppingBag, ChevronDown, FileText, FileSpreadsheet } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { revenueData } from "@/lib/mock-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { exportCsv, exportPdf } from "@/lib/export";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — RestoStack" }] }),
  component: ReportsPage,
});

const channelMix = [
  { n: "Dine In", v: 56, c: "var(--color-success)" },
  { n: "Takeaway", v: 22, c: "var(--color-info)" },
  { n: "Delivery", v: 14, c: "var(--color-chart-4)" },
  { n: "Catering", v: 8, c: "var(--color-warning)" },
];

const hourly = Array.from({ length: 12 }, (_, i) => ({ h: `${i + 11}:00`, covers: Math.round(20 + Math.sin(i / 2) * 18 + i * 3) }));

const kpis = [
  { l: "Total Revenue", v: "$184,520", d: "12.8%", i: DollarSign, c: "bg-success/15 text-success" },
  { l: "Total Orders", v: "2,842", d: "9.4%", i: ShoppingBag, c: "bg-info/15 text-info" },
  { l: "Avg Ticket", v: "$64.92", d: "3.1%", i: TrendingUp, c: "bg-accent text-primary" },
  { l: "Unique Guests", v: "1,924", d: "15.6%", i: Users, c: "bg-warning/15 text-warning" },
];

function ReportsPage() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2024, 4, 13),
    to: new Date(2024, 5, 12),
  });
  const rangeLabel = range?.from
    ? `${format(range.from, "MMM d")} – ${format(range.to ?? range.from, "MMM d, yyyy")}`
    : "Pick a date range";

  const buildRows = () => [
    ...kpis.map((k) => ({ Section: "KPI", Metric: k.l, Value: k.v, Change: `+${k.d}` })),
    ...revenueData.map((r) => ({ Section: "Revenue Trend", Metric: r.day, Value: `$${r.actual}`, Change: `Projected $${r.projected}` })),
    ...channelMix.map((c) => ({ Section: "Channel Mix", Metric: c.n, Value: `${c.v}%`, Change: "" })),
    ...hourly.map((h) => ({ Section: "Covers by Hour", Metric: h.h, Value: `${h.covers} covers`, Change: "" })),
  ];

  const handleCsv = () => exportCsv(`reports_${format(new Date(), "yyyy-MM-dd")}`, ["Section", "Metric", "Value", "Change"], buildRows());
  const handlePdf = () =>
    exportPdf({
      title: "Reports",
      subtitle: "Sales, labour and operational performance",
      meta: { "Date range": rangeLabel, Generated: new Date().toLocaleString() },
      columns: ["Section", "Metric", "Value", "Change"],
      rows: buildRows(),
    });

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        description="Sales, labour and operational performance."
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
                <button className="inline-flex items-center gap-2 rounded-md bg-success px-3 py-2 text-sm font-semibold text-success-foreground hover:bg-success/90">
                  <Download className="size-4" /> Export <ChevronDown className="size-3.5" />
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
          {kpis.map((s) => (
            <div key={s.l} className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full flex items-center justify-center ${s.c}`}><s.i className="size-5" /></div>
                <div className="text-sm text-muted-foreground">{s.l}</div>
              </div>
              <div className="mt-2 text-2xl font-bold">{s.v}</div>
              <div className="text-xs text-success font-semibold mt-1">▲ {s.d} <span className="text-muted-foreground font-normal">vs prev period</span></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-md border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Revenue Trend</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" fontSize={12} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Area isAnimationActive={false} type="monotone" dataKey="actual" stroke="var(--color-success)" strokeWidth={2.5} fill="url(#rg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Channel Mix</h3>
            <div className="h-44">
              <ResponsiveContainer>
                <PieChart>
                  <Pie isAnimationActive={false} data={channelMix} dataKey="v" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {channelMix.map((c, i) => <Cell key={i} fill={c.c} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2 text-sm mt-2">
              {channelMix.map((c) => (
                <li key={c.n} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: c.c }} />{c.n}</div>
                  <span className="font-semibold">{c.v}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Covers by Hour</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="h" fontSize={11} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                <YAxis fontSize={11} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar isAnimationActive={false} dataKey="covers" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
