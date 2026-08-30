import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  addDays,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { fr, enCA } from "date-fns/locale";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bell,
  CalendarDays,
  Loader2,
  Plus,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getDashboard } from "@/lib/dashboard-api";
import { settingsListLocations } from "@/lib/settings-api";
import { listReservationsForRange } from "@/lib/booking-api";
import { hostListFloor, localDateISO, formatTimeLabel, type HostFloorTable } from "@/lib/host-stand-api";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app_/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — RestoStack" }] }),
  component: DashboardPage,
});

type ChartMetric = "covers" | "reservations";
type RangeKey = "7" | "30" | "90" | "365";
type ViewPreset = "today" | "week" | "month" | "custom";

type Upcoming = {
  id: string;
  date: string;
  time: string;
  name: string;
  party: number;
  table: string | null;
  status: string;
};

const GREEN = "#22C55E";

function DashboardPage() {
  const { org, staff } = useAuth();
  const { locale, t } = useI18n();
  const orgId = org.activeOrganizationId;
  const restaurantId = staff?.restaurant_id ?? null;
  const tenantReady = Boolean(orgId || restaurantId);
  const dateLocale = locale === "fr-CA" ? fr : enCA;

  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [locationId, setLocationId] = useState("");
  const [dateISO, setDateISO] = useState(localDateISO());
  const [viewPreset, setViewPreset] = useState<ViewPreset>("month");
  const [viewFrom, setViewFrom] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [viewTo, setViewTo] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [rangeKey, setRangeKey] = useState<RangeKey>("30");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("covers");
  const [kpis, setKpis] = useState<{
    reservations: number;
    seats: number;
    seats_per_reservation: number;
    no_show_rate: number;
    cancellations: number;
    occupancy_next_service: number;
    walk_ins: number;
    booked: number;
    delta_reservations?: number;
    delta_seats?: number;
  } | null>(null);
  const [trend, setTrend] = useState<Array<{ on_date: string; reservations: number; covers: number }>>([]);
  const [byHour, setByHour] = useState<Array<{ hour: number; reservations: number; covers: number }>>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [tables, setTables] = useState<HostFloorTable[]>([]);
  const [guestBits, setGuestBits] = useState({ regulars: 0, vip: 0, birthday: 0, neu: 0 });
  const [topTables, setTopTables] = useState<Array<{ table: string; turns: number; covers: number }>>([]);
  const [revenueToday, setRevenueToday] = useState<number | null>(null);
  const [avgSpend, setAvgSpend] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const firstName = (staff?.full_name ?? "there").split(/\s+/)[0] ?? "there";
  const locationName =
    locations.find((l) => l.id === locationId)?.name ??
    org.memberships.find((m) => m.organization_id === orgId)?.organization_name ??
    "RestoStack";

  const applyViewPreset = (p: ViewPreset) => {
    const today = new Date();
    setViewPreset(p);
    if (p === "today") {
      const d = localDateISO();
      setViewFrom(d);
      setViewTo(d);
      setDateISO(d);
    } else if (p === "week") {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      setViewFrom(format(start, "yyyy-MM-dd"));
      setViewTo(format(addDays(start, 6), "yyyy-MM-dd"));
      setDateISO(localDateISO());
    } else if (p === "month") {
      setViewFrom(format(startOfMonth(today), "yyyy-MM-dd"));
      setViewTo(format(endOfMonth(today), "yyyy-MM-dd"));
      setDateISO(localDateISO());
      setRangeKey("30");
    }
  };

  useEffect(() => {
    if (!orgId && !restaurantId) {
      setLocations([]);
      return;
    }
    (async () => {
      const res = await settingsListLocations(orgId, restaurantId);
      const locs = (res.ok && Array.isArray(res.locations) ? res.locations : []) as Array<{
        id: string;
        name: string;
      }>;
      setLocations(locs);
      const preferred =
        (org.activeLocationId && locs.find((l) => l.id === org.activeLocationId)?.id) ||
        locs[0]?.id ||
        restaurantId ||
        "";
      setLocationId((prev) => prev || preferred);
    })();
  }, [orgId, restaurantId, org.activeLocationId]);

  const refresh = useCallback(async () => {
    if (!tenantReady) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const loc = locationId || null;

    const dash = await getDashboard(orgId, loc, viewFrom, viewTo, restaurantId);
    if (!dash.ok) {
      toast.error(dash.error);
      setLoading(false);
      return;
    }

    // Prior period for deltas (same length as selected view)
    const viewLen =
      Math.max(
        1,
        Math.round(
          (new Date(viewTo + "T12:00:00").getTime() - new Date(viewFrom + "T12:00:00").getTime()) /
            86400000,
        ) + 1,
      );
    const priorTo = format(subDays(new Date(viewFrom + "T12:00:00"), 1), "yyyy-MM-dd");
    const priorFrom = format(subDays(new Date(viewFrom + "T12:00:00"), viewLen), "yyyy-MM-dd");
    const prior = await getDashboard(orgId, loc, priorFrom, priorTo, restaurantId);
    const delta = (cur: number, prev: number) =>
      prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;

    setKpis({
      ...dash.kpis,
      delta_reservations: prior.ok ? delta(dash.kpis.reservations, prior.kpis.reservations) : 0,
      delta_seats: prior.ok ? delta(dash.kpis.seats, prior.kpis.seats) : 0,
    });
    setTrend(dash.trend ?? []);
    setByHour(dash.by_hour ?? []);

    const rangeRes = await listReservationsForRange(orgId, loc, viewFrom, viewTo, restaurantId);
    if (rangeRes.ok) {
      const rows = rangeRes.rows as Array<Record<string, unknown>>;
      setUpcoming(
        rows
          .filter((r) =>
            ["pending", "confirmed", "seated", "completed"].includes(String(r.status)),
          )
          .slice(0, 40)
          .map((r) => ({
            id: String(r.id),
            date: String(r.reserved_date ?? ""),
            time: formatTimeLabel(String(r.reserved_time ?? "")),
            name: String(r.guest_name ?? ""),
            party: Number(r.party_size ?? 0),
            table: (r.table_number as string | null) ?? null,
            status: String(r.status),
          })),
      );
      const birthdayish = rows.filter((r) =>
        String(r.notes ?? "")
          .toLowerCase()
          .includes("birthday"),
      ).length;
      const neu = rows.filter((r) => r.source === "public" || r.source === "online").length;
      setGuestBits({
        regulars: Math.max(0, rows.length - neu),
        vip: rows.filter((r) => String(r.notes ?? "").toLowerCase().includes("vip")).length,
        birthday: birthdayish,
        neu,
      });
      const turns: Record<string, { turns: number; covers: number }> = {};
      for (const r of rows) {
        const tnum = String(r.table_number ?? "");
        if (!tnum) continue;
        if (!turns[tnum]) turns[tnum] = { turns: 0, covers: 0 };
        turns[tnum].turns += 1;
        turns[tnum].covers += Number(r.party_size ?? 0);
      }
      setTopTables(
        Object.entries(turns)
          .map(([table, v]) => ({ table, ...v }))
          .sort((a, b) => b.turns - a.turns)
          .slice(0, 5),
      );
    }

    const floor = await hostListFloor(orgId, locationId || null, dateISO, restaurantId);
    if (floor.ok) setTables(floor.tables);


    // Soft revenue from legacy orders when restaurant linked
    if (staff?.restaurant_id) {
      const { data: ods } = await supabase
        .from("v2_orders")
        .select("total")
        .eq("restaurant_id", staff.restaurant_id)
        .gte("created_at", `${dateISO}T00:00:00`)
        .lt("created_at", `${dateISO}T23:59:59`);
      if (ods && ods.length) {
        const rev = ods.reduce((s, o) => s + Number((o as { total?: number }).total ?? 0), 0);
        setRevenueToday(rev);
        setAvgSpend(rev / ods.length);
      } else {
        setRevenueToday(null);
        setAvgSpend(null);
      }
    }

    setLoading(false);
  }, [tenantReady, orgId, locationId, viewFrom, viewTo, dateISO, restaurantId, staff?.restaurant_id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const chartData = useMemo(
    () =>
      (trend ?? []).map((r) => ({
        label: format(new Date(r.on_date), "d MMM", { locale: dateLocale }),
        value: chartMetric === "covers" ? r.covers : r.reservations,
        covers: r.covers,
        reservations: r.reservations,
      })),
    [trend, chartMetric, dateLocale],
  );

  const tonightHours = useMemo(() => {
    const hours = [17, 18, 19, 20, 21];
    const cap = Math.max(
      1,
      tables.reduce((s, t) => s + (t.capacity_max ?? t.capacity ?? 4), 0),
    );
    return hours.map((h) => {
      const row = byHour.find((b) => b.hour === h);
      const covers = row?.covers ?? 0;
      const pct = Math.min(100, Math.round((covers / cap) * 100));
      return { hour: h, label: `${h}h00`, covers, pct };
    });
  }, [byHour, tables]);

  const tonightCovers = tonightHours.reduce((s, h) => s + h.covers, 0);
  const tonightOcc =
    tonightHours.length > 0
      ? Math.round(tonightHours.reduce((s, h) => s + h.pct, 0) / tonightHours.length)
      : kpis?.occupancy_next_service ?? 0;

  const occupiedTables = tables.filter((t) => t.status === "occupied" || t.status === "reserved").length;
  const tableTotal = tables.length || 1;

  const rangeLabel =
    viewFrom === viewTo
      ? format(new Date(viewFrom + "T12:00:00"), "d MMMM yyyy", { locale: dateLocale })
      : `${format(new Date(viewFrom + "T12:00:00"), "d MMM", { locale: dateLocale })} – ${format(
          new Date(viewTo + "T12:00:00"),
          "d MMM yyyy",
          { locale: dateLocale },
        )}`;

  const resSearch = { from: viewFrom, to: viewTo };

  const applyChartRange = (key: RangeKey) => {
    setRangeKey(key);
    const days = Number(key);
    const to = localDateISO();
    const from = format(subDays(new Date(to + "T12:00:00"), days - 1), "yyyy-MM-dd");
    setViewPreset("custom");
    setViewFrom(from);
    setViewTo(to);
    setDateISO(to);
  };

  const kpiCards: Array<{
    label: string;
    value: string;
    delta?: number;
    tone: "green" | "rose";
    soft?: boolean;
    sub?: string;
    to?: "/app/reservations" | "/app/host" | "/app/guests" | "/app/reports";
    search?: { from: string; to: string };
  }> = [
    {
      label: t("dashboard.reservations"),
      value: String(kpis?.reservations ?? "—"),
      delta: kpis?.delta_reservations,
      tone: "green",
      to: "/app/reservations",
      search: resSearch,
    },
    {
      label: t("dashboard.covers"),
      value: String(kpis?.seats ?? "—"),
      delta: kpis?.delta_seats,
      tone: "green",
      to: "/app/reservations",
      search: resSearch,
    },
    {
      label: t("dashboard.revenue"),
      value: revenueToday != null ? money(revenueToday, locale) : "—",
      tone: "green",
      soft: revenueToday == null,
      to: "/app/reports",
    },
    {
      label: t("dashboard.avgSpend"),
      value: avgSpend != null ? money(avgSpend, locale) : kpis ? String(kpis.seats_per_reservation) : "—",
      sub: avgSpend == null && kpis ? t("dashboard.seatsPerRes") : undefined,
      tone: "green",
      to: "/app/reports",
    },
    {
      label: t("dashboard.noShows"),
      value: kpis ? `${kpis.no_show_rate}%` : "—",
      tone: "rose",
      to: "/app/reservations",
      search: resSearch,
    },
    {
      label: t("dashboard.occupancy"),
      value: kpis ? `${kpis.occupancy_next_service}%` : "—",
      tone: "green",
      to: "/app/host",
    },
  ];

  const upcomingGrouped = useMemo(() => {
    const map = new Map<string, Upcoming[]>();
    for (const u of upcoming) {
      const key = u.date || viewFrom;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    }
    return [...map.entries()];
  }, [upcoming, viewFrom]);

  const presetLabels: Array<[ViewPreset, string]> = [
    ["today", t("dashboard.today")],
    ["week", t("dashboard.thisWeek")],
    ["month", t("dashboard.thisMonth")],
    ["custom", t("dashboard.custom")],
  ];

  if (!tenantReady) {
    return (
      <AppShell>
        <div className="p-8 text-sm text-muted-foreground">{t("common.empty")}</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-full bg-[#F7F8FA]">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-black/5 bg-white px-5 py-5 lg:px-8">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              {t("dashboard.hello").replace("{name}", firstName)}{" "}
              <span aria-hidden>👋</span>
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              {t("dashboard.subtitleRange")
                .replace("{location}", locationName)
                .replace("{range}", rangeLabel)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={locationId || "none"} onValueChange={(v) => setLocationId(v === "none" ? "" : v)}>
              <SelectTrigger className="h-10 min-w-[160px] rounded-xl border-stone-200 bg-white text-sm">
                <SelectValue placeholder={t("dashboard.location")} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex rounded-xl border border-stone-200 bg-white p-0.5 text-xs font-semibold">
              {presetLabels.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyViewPreset(key)}
                  className={cn(
                    "rounded-lg px-2.5 py-2 transition-colors",
                    viewPreset === key ? "bg-emerald-500 text-white" : "text-stone-500 hover:bg-stone-50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700">
              <CalendarDays className="size-4 shrink-0 text-stone-400" />
              <input
                type="date"
                value={viewFrom}
                onChange={(e) => {
                  setViewPreset("custom");
                  setViewFrom(e.target.value);
                  if (e.target.value > viewTo) setViewTo(e.target.value);
                  setDateISO(e.target.value);
                }}
                className="bg-transparent text-sm outline-none"
                aria-label={t("dashboard.from")}
              />
              <span className="text-stone-400">–</span>
              <input
                type="date"
                value={viewTo}
                onChange={(e) => {
                  setViewPreset("custom");
                  setViewTo(e.target.value);
                  if (e.target.value < viewFrom) setViewFrom(e.target.value);
                }}
                className="bg-transparent text-sm outline-none"
                aria-label={t("dashboard.to")}
              />
            </div>

            <Link
              to="/app/reservations"
              search={resSearch}
              className="grid size-10 place-items-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
              aria-label={t("dashboard.notifications")}
              title={t("dashboard.seeAll")}
            >
              <Bell className="size-4" />
            </Link>

            <Link
              to="/settings"
              className="hidden items-center gap-2 rounded-xl border border-stone-200 bg-white py-1.5 pl-1.5 pr-3 hover:bg-stone-50 sm:flex"
            >
              <div
                className="grid size-8 place-items-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: GREEN }}
              >
                {(firstName[0] ?? "R").toUpperCase()}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-semibold text-stone-900">{staff?.full_name ?? "Admin"}</div>
                <div className="text-[10px] text-stone-500">Admin</div>
              </div>
            </Link>

            <Button
              asChild
              className="h-10 rounded-xl px-4 font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              <Link to="/app/reservations" search={{ ...resSearch, create: "1" }}>
                <Plus className="size-4" /> {t("dashboard.newReservation")}
              </Link>
            </Button>
          </div>
        </header>

        <div className="space-y-5 px-4 py-5 lg:px-8 lg:py-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
            </div>
          )}

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {kpiCards.map((k) => {
              const body = (
                <>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
                    {k.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-stone-900">
                    {k.value}
                  </div>
                  {k.sub && <div className="mt-0.5 text-[11px] text-stone-400">{k.sub}</div>}
                  {typeof k.delta === "number" && !k.soft && (
                    <div
                      className={cn(
                        "mt-2 text-xs font-medium",
                        k.tone === "rose" ? "text-rose-500" : "text-emerald-600",
                      )}
                    >
                      {k.delta >= 0 ? "+" : ""}
                      {k.delta}% {t("dashboard.vsPrior")}
                    </div>
                  )}
                </>
              );
              const className =
                "block rounded-2xl border border-black/[0.04] bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-emerald-200 hover:bg-emerald-50/40";
              if (k.to === "/app/reservations") {
                return (
                  <Link key={k.label} to="/app/reservations" search={k.search} className={className}>
                    {body}
                  </Link>
                );
              }
              if (k.to) {
                return (
                  <Link key={k.label} to={k.to} className={className}>
                    {body}
                  </Link>
                );
              }
              return (
                <div key={k.label} className={className}>
                  {body}
                </div>
              );
            })}
          </div>

          {/* Chart + Tonight */}
          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">{t("dashboard.performance")}</h2>
                  <p className="text-xs text-stone-400">
                    {chartMetric === "covers"
                      ? `${kpis?.seats ?? 0} ${t("dashboard.covers").toLowerCase()}`
                      : `${kpis?.reservations ?? 0} ${t("dashboard.reservations").toLowerCase()}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-medium">
                    {(
                      [
                        ["covers", t("dashboard.covers")],
                        ["reservations", t("dashboard.reservations")],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setChartMetric(key)}
                        className={cn(
                          "rounded-md px-2.5 py-1.5 transition-colors",
                          chartMetric === key ? "bg-white text-stone-900 shadow-sm" : "text-stone-500",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-semibold">
                    {(
                      [
                        ["7", "7J"],
                        ["30", "30J"],
                        ["90", "90J"],
                        ["365", "1A"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyChartRange(key)}
                        className={cn(
                          "rounded-md px-2 py-1.5",
                          rangeKey === key ? "bg-white text-stone-900 shadow-sm" : "text-stone-500",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GREEN} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#A8A29E" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#A8A29E" }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E7E5E4",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={GREEN}
                      strokeWidth={2.5}
                      fill="url(#dashFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <h2 className="text-sm font-semibold text-stone-900">{t("dashboard.tonight")}</h2>
              <div className="mt-3 flex items-end gap-6">
                <div>
                  <div className="text-3xl font-semibold tabular-nums text-stone-900">{tonightCovers}</div>
                  <div className="text-xs text-stone-400">{t("dashboard.expectedCovers")}</div>
                </div>
                <div>
                  <div className="text-3xl font-semibold tabular-nums text-emerald-600">{tonightOcc}%</div>
                  <div className="text-xs text-stone-400">{t("dashboard.expectedOcc")}</div>
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {tonightHours.map((h) => (
                  <li key={h.hour} className="flex items-center gap-3 text-xs">
                    <span className="w-10 tabular-nums text-stone-500">{h.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${h.pct}%`,
                          backgroundColor: h.pct >= 90 ? "#EF4444" : h.pct >= 70 ? "#F59E0B" : GREEN,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right font-semibold tabular-nums text-stone-700">{h.pct}%</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Bottom row */}
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {/* Upcoming */}
            <section className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] xl:col-span-1">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">{t("dashboard.upcoming")}</h2>
                  <p className="text-[11px] text-stone-400">{rangeLabel}</p>
                </div>
                <Link
                  to="/app/reservations"
                  search={resSearch}
                  className="text-xs font-medium text-emerald-600 hover:underline"
                >
                  {t("dashboard.seeAll")}
                </Link>
              </div>
              <ul className="max-h-[420px] divide-y divide-stone-100 overflow-y-auto">
                {upcoming.length === 0 && (
                  <li className="py-8 text-center text-xs text-stone-400">{t("common.empty")}</li>
                )}
                {upcomingGrouped.map(([date, dayRows]) => (
                  <li key={date} className="list-none">
                    {viewFrom !== viewTo && (
                      <div className="sticky top-0 bg-white/95 py-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400 backdrop-blur">
                        {format(new Date(date + "T12:00:00"), "EEE d MMM", { locale: dateLocale })}
                      </div>
                    )}
                    <ul>
                      {dayRows.map((u) => (
                        <li key={u.id}>
                          <Link
                            to="/app/reservations"
                            search={{ from: u.date || viewFrom, to: u.date || viewTo }}
                            className="flex items-start gap-3 py-3 transition-colors hover:bg-stone-50"
                          >
                            <div className="w-14 shrink-0 text-sm font-semibold tabular-nums text-stone-900">
                              {u.time}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-stone-900">{u.name}</div>
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-stone-400">
                                <span className="inline-flex items-center gap-0.5">
                                  <Users className="size-3" /> {u.party}
                                </span>
                                {u.table && (
                                  <span>
                                    {t("dashboard.table")} {u.table}
                                  </span>
                                )}
                              </div>
                            </div>
                            <StatusPill status={u.status} locale={locale} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>

            {/* Floor mini */}
            <section className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-900">{t("dashboard.floor")}</h2>
                <Link to="/app/host" className="text-xs font-medium text-emerald-600 hover:underline">
                  Host Stand
                </Link>
              </div>
              <p className="mb-3 text-xs text-stone-400">
                {occupiedTables} / {tables.length || "—"} {t("dashboard.tablesOccupied")} ·{" "}
                {Math.round((occupiedTables / tableTotal) * 100)}%
              </p>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                {(tables.length ? tables : Array.from({ length: 12 }, (_, i) => null)).map((trow, i) => {
                  const status = trow?.status ?? "available";
                  const color =
                    status === "occupied"
                      ? "bg-amber-400 text-white"
                      : status === "reserved"
                        ? "bg-white border-2 border-stone-300 text-stone-700"
                        : status === "cleaning" || status === "blocked"
                          ? "bg-rose-500 text-white"
                          : "bg-emerald-500 text-white";
                  return (
                    <Link
                      key={trow?.id ?? i}
                      to="/app/host"
                      className={cn(
                        "grid aspect-square place-items-center rounded-lg text-[10px] font-bold transition-opacity hover:opacity-80",
                        color,
                      )}
                      title={trow?.table_number ?? "Host Stand"}
                    >
                      {trow?.table_number ?? "·"}
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-stone-500">
                <LegendDot className="bg-emerald-500" label={t("dashboard.available")} />
                <LegendDot className="border-2 border-stone-300 bg-white" label={t("dashboard.reserved")} />
                <LegendDot className="bg-amber-400" label={t("dashboard.occupied")} />
                <LegendDot className="bg-rose-500" label={t("dashboard.attention")} />
              </div>
            </section>

            {/* Guests + top tables */}
            <section className="space-y-4 lg:col-span-2 xl:col-span-1">
              <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-stone-900">{t("dashboard.guestOverview")}</h2>
                  <Link to="/app/guests" className="text-xs font-medium text-emerald-600 hover:underline">
                    {t("dashboard.seeAll")}
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      [guestBits.regulars, t("dashboard.regulars")],
                      [guestBits.vip, "VIPs"],
                      [guestBits.birthday, t("dashboard.birthdays")],
                      [guestBits.neu, t("dashboard.newGuests")],
                    ] as const
                  ).map(([n, label]) => (
                    <Link
                      key={label}
                      to="/app/guests"
                      className="rounded-xl bg-stone-50 px-3 py-2.5 transition-colors hover:bg-emerald-50"
                    >
                      <div className="text-lg font-semibold tabular-nums text-stone-900">{n}</div>
                      <div className="text-[11px] text-stone-400">{label}</div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <h2 className="text-sm font-semibold text-stone-900">{t("dashboard.topTables")}</h2>
                <table className="mt-3 w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-stone-400">
                      <th className="pb-2 font-medium">{t("dashboard.table")}</th>
                      <th className="pb-2 font-medium">{t("dashboard.turns")}</th>
                      <th className="pb-2 font-medium text-right">{t("dashboard.covers")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTables.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-stone-400">
                          {t("common.empty")}
                        </td>
                      </tr>
                    )}
                    {topTables.map((row) => (
                      <tr key={row.table} className="border-t border-stone-100">
                        <td className="py-2 font-semibold text-stone-900">{row.table}</td>
                        <td className="py-2 tabular-nums text-stone-600">{row.turns}</td>
                        <td className="py-2 text-right tabular-nums text-stone-600">{row.covers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "fr-CA" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

function StatusPill({ status, locale }: { status: string; locale: string }) {
  const fr = locale === "fr-CA";
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: {
      label: fr ? "Confirmée" : "Confirmed",
      cls: "bg-sky-50 text-sky-700",
    },
    seated: {
      label: fr ? "Assise" : "Seated",
      cls: "bg-emerald-50 text-emerald-700",
    },
    pending: {
      label: fr ? "En attente" : "Pending",
      cls: "bg-amber-50 text-amber-700",
    },
  };
  const m = map[status] ?? { label: status, cls: "bg-stone-50 text-stone-600" };
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", m.cls)}>{m.label}</span>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm", className)} />
      {label}
    </span>
  );
}
