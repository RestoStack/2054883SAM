import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Armchair,
  Ban,
  CalendarDays,
  Footprints,
  Gauge,
  LayoutDashboard,
  Loader2,
  UserX,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getDashboard } from "@/lib/dashboard-api";
import { settingsListLocations } from "@/lib/settings-api";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app_/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — RestoStack" }] }),
  component: DashboardPage,
});

type Kpis = {
  reservations: number;
  seats: number;
  seats_per_reservation: number;
  no_show_rate: number;
  cancellations: number;
  occupancy_next_service: number;
  walk_ins: number;
  booked: number;
};

type Trend = { on_date: string; reservations: number; covers: number };
type SourceMix = { source: string; count: number; covers: number };
type ByHour = { hour: number; reservations: number; covers: number };

const COLORS = [
  "var(--color-success)",
  "var(--color-info)",
  "var(--color-warning)",
  "var(--color-destructive)",
  "var(--color-primary)",
];

const rangePreset = (days: number): DateRange => ({
  from: subDays(new Date(), days - 1),
  to: new Date(),
});

function DashboardPage() {
  const { org } = useAuth();
  const orgId = org.activeOrganizationId;

  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [preset, setPreset] = useState<"7" | "30" | "custom">("30");
  const [range, setRange] = useState<DateRange | undefined>(rangePreset(30));

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [trend, setTrend] = useState<Trend[]>([]);
  const [sourceMix, setSourceMix] = useState<SourceMix[]>([]);
  const [byHour, setByHour] = useState<ByHour[]>([]);
  const [loading, setLoading] = useState(true);

  const fromISO = range?.from
    ? format(range.from, "yyyy-MM-dd")
    : format(subDays(new Date(), 29), "yyyy-MM-dd");
  const toISO = range?.to
    ? format(range.to, "yyyy-MM-dd")
    : format(range?.from ?? new Date(), "yyyy-MM-dd");
  const rangeLabel = `${format(new Date(fromISO), "MMM d")} – ${format(new Date(toISO), "MMM d, yyyy")}`;

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const res = await settingsListLocations(orgId);
      const locs = (res.ok && Array.isArray(res.locations) ? res.locations : []) as Array<{
        id: string;
        name: string;
      }>;
      setLocations(locs);
    })();
  }, [orgId]);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const res = await getDashboard(orgId, locationId || null, fromISO, toISO);
      if (!res.ok) {
        toast.error(res.error);
        setLoading(false);
        return;
      }
      setKpis(res.kpis);
      setTrend(res.trend);
      setSourceMix(res.source_mix);
      setByHour(res.by_hour);
      setLoading(false);
    })();
  }, [orgId, locationId, fromISO, toISO]);

  const applyPreset = (days: 7 | 30) => {
    setPreset(String(days) as "7" | "30");
    setRange(rangePreset(days));
  };

  const cards = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        l: "Reservations",
        v: String(kpis.reservations),
        icon: CalendarDays,
        color: "text-info",
        bg: "bg-info/15",
      },
      {
        l: "Seats",
        v: String(kpis.seats),
        icon: Users,
        color: "text-success",
        bg: "bg-success/15",
      },
      {
        l: "Seats / reservation",
        v: kpis.seats_per_reservation.toFixed(2),
        icon: Armchair,
        color: "text-primary",
        bg: "bg-accent",
      },
      {
        l: "No-show rate",
        v: `${kpis.no_show_rate}%`,
        icon: UserX,
        color: "text-destructive",
        bg: "bg-destructive/15",
      },
      {
        l: "Cancellations",
        v: String(kpis.cancellations),
        icon: Ban,
        color: "text-destructive",
        bg: "bg-destructive/15",
      },
      {
        l: "Occupancy (next service)",
        v: `${kpis.occupancy_next_service}%`,
        icon: Gauge,
        color: "text-warning",
        bg: "bg-warning/15",
      },
      {
        l: "Walk-ins vs booked",
        v: `${kpis.walk_ins} / ${kpis.booked}`,
        icon: Footprints,
        color: "text-info",
        bg: "bg-info/15",
      },
    ];
  }, [kpis]);

  const walkInMix = kpis
    ? [
        { name: "Walk-ins", value: kpis.walk_ins },
        { name: "Booked", value: kpis.booked },
      ]
    : [];

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Live reservation performance for your restaurant."
        icon={LayoutDashboard}
        actions={
          <>
            {locations.length > 1 && (
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="w-[170px] h-9 text-sm">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All locations</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="inline-flex rounded-md border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => applyPreset(7)}
                className={cn(
                  "px-3 py-2 text-sm font-medium",
                  preset === "7" ? "bg-accent text-primary" : "hover:bg-muted/50",
                )}
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => applyPreset(30)}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-l border-border",
                  preset === "30" ? "bg-accent text-primary" : "hover:bg-muted/50",
                )}
              >
                30d
              </button>
            </div>
            <DateRangePicker
              value={range}
              onChange={(r) => {
                setPreset("custom");
                setRange(r);
              }}
            />
          </>
        }
      />

      <div className="p-4 lg:p-5 space-y-4">
        {loading && !kpis ? (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin inline mr-2" /> Loading dashboard…
          </div>
        ) : !orgId ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            No organization selected.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {cards.map((c) => (
                <div key={c.l} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className={`size-9 rounded-full flex items-center justify-center ${c.bg}`}>
                      <c.icon className={`size-4 ${c.color}`} />
                    </div>
                    <div className="text-sm text-muted-foreground">{c.l}</div>
                  </div>
                  <div className="mt-2 text-2xl font-bold">{c.v}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold mb-3">
                  Reservations &amp; covers trend — {rangeLabel}
                </h3>
                <div className="h-72">
                  {trend.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer>
                      <AreaChart data={trend}>
                        <defs>
                          <linearGradient id="resG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="covG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-border)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="on_date"
                          stroke="var(--color-muted-foreground)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: string) => v.slice(5)}
                        />
                        <YAxis
                          stroke="var(--color-muted-foreground)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                          }}
                        />
                        <Area
                          isAnimationActive={false}
                          type="monotone"
                          dataKey="reservations"
                          name="Reservations"
                          stroke="var(--color-success)"
                          strokeWidth={2}
                          fill="url(#resG)"
                        />
                        <Area
                          isAnimationActive={false}
                          type="monotone"
                          dataKey="covers"
                          name="Covers"
                          stroke="var(--color-info)"
                          strokeWidth={2}
                          fill="url(#covG)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold mb-3">Walk-ins vs booked</h3>
                <div className="h-56">
                  {!kpis || kpis.walk_ins + kpis.booked === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={walkInMix}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                        >
                          {walkInMix.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="mt-2 flex justify-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: COLORS[0] }} />{" "}
                    Walk-ins
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: COLORS[1] }} />{" "}
                    Booked
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold mb-3">Source mix</h3>
                <div className="h-64">
                  {sourceMix.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={sourceMix} layout="vertical" margin={{ left: 12 }}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-border)"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          stroke="var(--color-muted-foreground)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="source"
                          stroke="var(--color-muted-foreground)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          width={90}
                          tickFormatter={(v: string) => v.replace("_", " ")}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                          }}
                        />
                        <Bar
                          dataKey="count"
                          name="Reservations"
                          fill="var(--color-success)"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold mb-3">Reservations by hour</h3>
                <div className="h-64">
                  {byHour.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={byHour}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-border)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="hour"
                          stroke="var(--color-muted-foreground)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(h: number) => `${h}:00`}
                        />
                        <YAxis
                          stroke="var(--color-muted-foreground)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                          }}
                        />
                        <Bar
                          dataKey="reservations"
                          name="Reservations"
                          fill="var(--color-info)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function EmptyChart() {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      No activity in this range yet.
    </div>
  );
}
