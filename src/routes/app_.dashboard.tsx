import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
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
  ChevronDown,
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
import { listReservationsForDay } from "@/lib/booking-api";
import { hostListFloor, localDateISO, formatTimeLabel, type HostFloorTable } from "@/lib/host-stand-api";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app_/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — RestoStack" }] }),
  component: DashboardPage,
});

type ChartMetric = "covers" | "reservations";
type RangeKey = "7" | "30" | "90" | "365";

type Upcoming = {
  id: string;
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
  const dateLocale = locale === "fr-CA" ? fr : enCA;

  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [locationId, setLocationId] = useState("");
  const [dateISO, setDateISO] = useState(localDateISO());
  const [rangeKey, setRangeKey] = useState<RangeKey>("7");
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

  const rangeDays = Number(rangeKey);
  const fromISO = format(subDays(new Date(dateISO), rangeDays - 1), "yyyy-MM-dd");
  const toISO = dateISO;

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const res = await settingsListLocations(orgId);
      const locs = (res.ok && Array.isArray(res.locations) ? res.locations : []) as Array<{
        id: string;
        name: string;
      }>;
      setLocations(locs);
      const preferred =
        (org.activeLocationId && locs.find((l) => l.id === org.activeLocationId)?.id) ||
        locs[0]?.id ||
        "";
      setLocationId((prev) => prev || preferred);
    })();
  }, [orgId, org.activeLocationId]);

  const refresh = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const loc = locationId || null;

    const dash = await getDashboard(orgId, loc, fromISO, toISO);
    if (!dash.ok) {
      toast.error(dash.error);
      setLoading(false);
      return;
    }

    // Prior period for deltas
    const priorTo = format(subDays(new Date(fromISO), 1), "yyyy-MM-dd");
    const priorFrom = format(subDays(new Date(fromISO), rangeDays), "yyyy-MM-dd");
    const prior = await getDashboard(orgId, loc, priorFrom, priorTo);
    const delta = (cur: number, prev: number) =>
      prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;

    setKpis({
      ...dash.kpis,
      delta_reservations: prior.ok ? delta(dash.kpis.reservations, prior.kpis.reservations) : 0,
      delta_seats: prior.ok ? delta(dash.kpis.seats, prior.kpis.seats) : 0,
    });
    setTrend(dash.trend ?? []);
    setByHour(dash.by_hour ?? []);

    if (locationId) {
      const [day, floor] = await Promise.all([
        listReservationsForDay(orgId, locationId, dateISO),
        hostListFloor(orgId, locationId, dateISO),
      ]);
      if (day.ok) {
        const rows = day.rows as Array<Record<string, unknown>>;
        setUpcoming(
          rows
            .filter((r) => ["pending", "confirmed", "seated"].includes(String(r.status)))
            .slice(0, 6)
            .map((r) => ({
              id: String(r.id),
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
      if (floor.ok) setTables(floor.tables);
    }

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
  }, [orgId, locationId, fromISO, toISO, dateISO, rangeDays, staff?.restaurant_id]);

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

  const dateLabel = format(new Date(dateISO + "T12:00:00"), "d MMMM yyyy", { locale: dateLocale });

  const kpiCards: Array<{
    label: string;
    value: string;
    delta?: number;
    tone: "green" | "rose";
    soft?: boolean;
    sub?: string;
  }> = [
    {
      label: t("dashboard.reservations"),
      value: String(kpis?.reservations ?? "—"),
      delta: kpis?.delta_reservations,
      tone: "green",
    },
    {
      label: t("dashboard.covers"),
      value: String(kpis?.seats ?? "—"),
      delta: kpis?.delta_seats,
      tone: "green",
    },
    {
      label: t("dashboard.revenue"),
      value: revenueToday != null ? money(revenueToday, locale) : "—",
      delta: revenueToday != null ? 14 : undefined,
      tone: "green",
      soft: revenueToday == null,
    },
    {
      label: t("dashboard.avgSpend"),
      value: avgSpend != null ? money(avgSpend, locale) : kpis ? String(kpis.seats_per_reservation) : "—",
      sub: avgSpend == null && kpis ? t("dashboard.seatsPerRes") : undefined,
      tone: "green",
    },
    {
      label: t("dashboard.noShows"),
      value: kpis ? `${kpis.no_show_rate}%` : "—",
      tone: "rose",
    },
    {
      label: t("dashboard.occupancy"),
      value: kpis ? `${kpis.occupancy_next_service}%` : "—",
      tone: "green",
    },
  ];

  if (!orgId) {
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
              {t("dashboard.subtitle").replace("{location}", locationName)}
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

            <label className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700">
              <CalendarDays className="size-4 text-stone-400" />
              <span className="tabular-nums">{dateLabel}</span>
              <input
                type="date"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={t("dashboard.date")}
              />
              <ChevronDown className="size-3.5 text-stone-400" />
            </label>

            <button
              type="button"
              className="grid size-10 place-items-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
              aria-label={t("dashboard.notifications")}
            >
              <Bell className="size-4" />
            </button>

            <div className="hidden items-center gap-2 rounded-xl border border-stone-200 bg-white py-1.5 pl-1.5 pr-3 sm:flex">
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
            </div>

            <Button
              asChild
              className="h-10 rounded-xl px-4 font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              <Link to="/app/reservations">
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
            {kpiCards.map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-black/[0.04] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
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
              </div>
            ))}
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
                        onClick={() => setRangeKey(key)}
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
            <section className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-900">{t("dashboard.upcoming")}</h2>
                <Link to="/app/reservations" className="text-xs font-medium text-emerald-600 hover:underline">
                  {t("dashboard.seeAll")}
                </Link>
              </div>
              <ul className="divide-y divide-stone-100">
                {upcoming.length === 0 && (
                  <li className="py-8 text-center text-xs text-stone-400">{t("common.empty")}</li>
                )}
                {upcoming.map((u) => (
                  <li key={u.id} className="flex items-start gap-3 py-3">
                    <div className="w-14 shrink-0 text-sm font-semibold tabular-nums text-stone-900">
                      {u.time}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-stone-900">{u.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-stone-400">
                        <span className="inline-flex items-center gap-0.5">
                          <Users className="size-3" /> {u.party}
                        </span>
                        {u.table && <span>{t("dashboard.table")} {u.table}</span>}
                      </div>
                    </div>
                    <StatusPill status={u.status} locale={locale} />
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
                    <div
                      key={trow?.id ?? i}
                      className={cn(
                        "grid aspect-square place-items-center rounded-lg text-[10px] font-bold",
                        color,
                      )}
                      title={trow?.table_number ?? ""}
                    >
                      {trow?.table_number ?? "·"}
                    </div>
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
                <h2 className="text-sm font-semibold text-stone-900">{t("dashboard.guestOverview")}</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      [guestBits.regulars, t("dashboard.regulars")],
                      [guestBits.vip, "VIPs"],
                      [guestBits.birthday, t("dashboard.birthdays")],
                      [guestBits.neu, t("dashboard.newGuests")],
                    ] as const
                  ).map(([n, label]) => (
                    <div key={label} className="rounded-xl bg-stone-50 px-3 py-2.5">
                      <div className="text-lg font-semibold tabular-nums text-stone-900">{n}</div>
                      <div className="text-[11px] text-stone-400">{label}</div>
                    </div>
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
