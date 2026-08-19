import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  CalendarDays,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PlatformShell } from "@/components/layout/PlatformShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/")({
  head: () => ({ meta: [{ title: "Platform Dashboard — Super Admin" }] }),
  component: PlatformDashboardPage,
});

type TrendPoint = { day: string; count: number };
type SourcePoint = { source: string; count: number };
type TopRestaurant = {
  id: string;
  name: string;
  slug: string;
  guest_count: number;
  booking_count: number;
  revenue: number;
  created_at: string;
};

type PlatformOverview = {
  totals: {
    restaurants: number;
    guests: number;
    bookings: number;
    waitlist: number;
    staff: number;
    orders: number;
    covers: number;
    revenue: number;
    active_restaurants_7d: number;
  };
  last_7d: {
    restaurants: number;
    guests: number;
    bookings: number;
    orders: number;
    revenue: number;
  };
  last_30d: {
    restaurants: number;
    guests: number;
    bookings: number;
    orders: number;
    revenue: number;
  };
  booking_health: {
    pending: number;
    confirmed: number;
    seated: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
  booking_sources: SourcePoint[];
  signup_trend: TrendPoint[];
  booking_trend: TrendPoint[];
  guest_trend: TrendPoint[];
  top_restaurants: TopRestaurant[];
};

const fmtMoney = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v)}`;
const fmtDay = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Building2;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight text-white">{value}</div>
          <div className="mt-1 text-xs text-slate-400">{hint}</div>
        </div>
        <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center">
          <Icon className="size-4 text-emerald-400" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  data,
  color,
}: {
  title: string;
  subtitle: string;
  data: TrendPoint[];
  color: string;
}) {
  const chartData = data.map((d) => ({ ...d, label: fmtDay(d.day) }));
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#94a3b8" }}
              itemStyle={{ color: "#e2e8f0" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={color}
              fill={`url(#g-${title})`}
              strokeWidth={2}
              name="Count"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PlatformDashboardPage() {
  const { platformAdmin } = useAuth();

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["v2_platform_overview"],
    enabled: platformAdmin,
    queryFn: async (): Promise<PlatformOverview> => {
      const { data, error } = await supabase.rpc("v2_platform_overview");
      if (error) throw error;
      if (!data) throw new Error("Unable to load platform overview.");
      return data as PlatformOverview;
    },
  });

  const health = data?.booking_health;
  const healthTotal = useMemo(() => {
    if (!health) return 0;
    return Object.values(health).reduce((a, b) => a + b, 0);
  }, [health]);

  const avgGuests =
    data && data.totals.restaurants > 0
      ? (data.totals.guests / data.totals.restaurants).toFixed(1)
      : "0";

  if (!platformAdmin) {
    return (
      <PlatformShell>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">
          Super Admin access required.{" "}
          <Link to="/super-admin-login" className="text-emerald-400 underline">
            Sign in here
          </Link>
          .
        </div>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Platform Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">
              Startup pulse across every restaurant on RestoStack.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {isLoading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-16 text-center text-slate-400">
            <Loader2 className="size-4 animate-spin inline mr-2" /> Loading platform analytics…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {(error as Error).message || "Failed to load platform analytics."}
          </div>
        )}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                label="Restaurants"
                value={String(data.totals.restaurants)}
                hint={`+${data.last_7d.restaurants} this week · ${data.totals.active_restaurants_7d} active`}
                icon={Building2}
              />
              <Kpi
                label="Guests"
                value={String(data.totals.guests)}
                hint={`+${data.last_7d.guests} this week · ${avgGuests} avg / restaurant`}
                icon={Users}
              />
              <Kpi
                label="Bookings"
                value={String(data.totals.bookings)}
                hint={`+${data.last_7d.bookings} this week · ${data.totals.covers} covers`}
                icon={CalendarDays}
              />
              <Kpi
                label="Order revenue"
                value={fmtMoney(Number(data.totals.revenue || 0))}
                hint={`+${fmtMoney(Number(data.last_7d.revenue || 0))} this week · ${data.totals.orders} orders`}
                icon={Wallet}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                label="Staff accounts"
                value={String(data.totals.staff)}
                hint="Across all restaurants"
                icon={Utensils}
              />
              <Kpi
                label="30-day signups"
                value={String(data.last_30d.restaurants)}
                hint="New restaurants this month"
                icon={TrendingUp}
              />
              <Kpi
                label="30-day guests"
                value={String(data.last_30d.guests)}
                hint="New guest profiles this month"
                icon={Users}
              />
              <Kpi
                label="Waitlist entries"
                value={String(data.totals.waitlist)}
                hint="Live queue demand signal"
                icon={Activity}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <ChartCard
                title="Restaurant signups"
                subtitle="Last 30 days"
                data={data.signup_trend ?? []}
                color="#34d399"
              />
              <ChartCard
                title="Guest growth"
                subtitle="New guest profiles · last 30 days"
                data={data.guest_trend ?? []}
                color="#38bdf8"
              />
              <ChartCard
                title="Booking volume"
                subtitle="Bookings created · last 30 days"
                data={data.booking_trend ?? []}
                color="#a78bfa"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Top restaurants by guests</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Where demand is concentrating</p>
                  </div>
                  <Link
                    to="/platform/restaurants"
                    className="text-xs font-semibold text-emerald-400 hover:underline"
                  >
                    View all
                  </Link>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-800">
                      {["Restaurant", "Guests", "Bookings", "Revenue"].map((h) => (
                        <th key={h} className="text-left font-medium px-5 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.top_restaurants ?? []).map((r) => (
                      <tr key={r.id} className="border-b border-slate-800 last:border-0">
                        <td className="px-5 py-3">
                          <div className="font-medium text-white">{r.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{r.slug}</div>
                        </td>
                        <td className="px-5 py-3 text-slate-200">{r.guest_count}</td>
                        <td className="px-5 py-3 text-slate-300">{r.booking_count}</td>
                        <td className="px-5 py-3 text-slate-300">{fmtMoney(Number(r.revenue || 0))}</td>
                      </tr>
                    ))}
                    {(data.top_restaurants ?? []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                          No restaurants yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
                  <h2 className="text-sm font-semibold text-white">Booking health</h2>
                  <p className="text-xs text-slate-500 mt-0.5 mb-4">Status mix across the platform</p>
                  <div className="space-y-2.5">
                    {(
                      [
                        ["Completed", health?.completed ?? 0, "bg-emerald-400"],
                        ["Confirmed", health?.confirmed ?? 0, "bg-sky-400"],
                        ["Pending", health?.pending ?? 0, "bg-amber-400"],
                        ["Seated", health?.seated ?? 0, "bg-teal-400"],
                        ["Cancelled", health?.cancelled ?? 0, "bg-rose-400"],
                        ["No-show", health?.no_show ?? 0, "bg-orange-400"],
                      ] as const
                    ).map(([label, count, bar]) => {
                      const pct = healthTotal ? Math.round((count / healthTotal) * 100) : 0;
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-300">{label}</span>
                            <span className="text-slate-500">
                              {count} · {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
                  <h2 className="text-sm font-semibold text-white">Booking sources</h2>
                  <p className="text-xs text-slate-500 mt-0.5 mb-4">How reservations arrive</p>
                  <div className="space-y-2">
                    {(data.booking_sources ?? []).map((s) => (
                      <div key={s.source} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-slate-300">{s.source.replaceAll("_", " ")}</span>
                        <span className="font-medium text-white">{s.count}</span>
                      </div>
                    ))}
                    {(data.booking_sources ?? []).length === 0 && (
                      <p className="text-xs text-slate-500">No bookings yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PlatformShell>
  );
}
