import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Trophy, TrendingUp, Star, Sparkles, Coins, Users } from "lucide-react";
import { leaderboardFn } from "@/lib/pos.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Server Leaderboard — RestoStack" },
      { name: "description", content: "Ranking of servers by sales, upsells, ratings, and tips." },
    ],
  }),
  // Public — no auth required

  component: LeaderboardPage,
});

type Row = {
  id: string;
  name: string;
  color: string;
  role: string;
  stats: {
    salesWeekCents: number;
    salesTodayCents: number;
    ordersWeek: number;
    tablesToday: number;
    itemsToday: number;
    upsellRate: number | null;
    upsellShown: number;
    upsellAccepted: number;
    avgRating: number | null;
    ratingsCount: number;
    tipsTodayCents: number;
    weekSeconds: number;
    clockedIn: boolean;
  };
};

const money = (c: number) =>
  `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const stars = (v: number | null) => (v == null ? "—" : v.toFixed(1));
const hours = (s: number) => `${(s / 3600).toFixed(1)}h`;

const MEDAL = ["bg-amber-400 text-amber-950", "bg-zinc-300 text-zinc-800", "bg-orange-400 text-orange-950"];

function LeaderboardPage() {
  const leaderboard = useServerFn(leaderboardFn);
  const { data, isLoading, error } = useQuery<Row[]>({
    queryKey: ["leaderboard"],
    queryFn: () => leaderboard(),
    refetchInterval: 30_000,
  });

  const rows = data ?? [];
  const topSales = rows[0];
  const topUpsell = [...rows].sort(
    (a, b) => (b.stats.upsellRate ?? -1) - (a.stats.upsellRate ?? -1)
  )[0];
  const topRating = [...rows].sort(
    (a, b) => (b.stats.avgRating ?? -1) - (a.stats.avgRating ?? -1)
  )[0];

  return (
    <AppShell>
      <PageHeader
        title="Server Leaderboard"
        description="Live ranking of floor staff performance this week."
        icon={Trophy}
      />

      <div className="p-4 lg:p-5 space-y-5">
        {error && (
          <Card className="p-4 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load leaderboard."}
          </Card>
        )}

        {/* Highlight cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HighlightCard
            label="Top Sales (Week)"
            icon={TrendingUp}
            person={topSales}
            value={topSales ? money(topSales.stats.salesWeekCents) : "—"}
            tint="bg-success/15 text-success"
          />
          <HighlightCard
            label="Best Upsell Rate"
            icon={Sparkles}
            person={topUpsell}
            value={topUpsell ? pct(topUpsell.stats.upsellRate) : "—"}
            tint="bg-primary/15 text-primary"
          />
          <HighlightCard
            label="Top Rated"
            icon={Star}
            person={topRating}
            value={topRating ? `${stars(topRating.stats.avgRating)} ★` : "—"}
            tint="bg-warning/15 text-warning"
          />
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">All Servers — This Week</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No server activity yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
                    <th className="px-4 py-2.5 w-12">#</th>
                    <th className="px-4 py-2.5">Server</th>
                    <th className="px-4 py-2.5 text-right">Sales (Wk)</th>
                    <th className="px-4 py-2.5 text-right">Orders</th>
                    <th className="px-4 py-2.5 text-right">Tables Today</th>
                    <th className="px-4 py-2.5 text-right">Items Today</th>
                    <th className="px-4 py-2.5 text-right">Upsell</th>
                    <th className="px-4 py-2.5 text-right">Rating</th>
                    <th className="px-4 py-2.5 text-right">Tips Today</th>
                    <th className="px-4 py-2.5 text-right">Hours (Wk)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r.id}
                      className="border-t border-border hover:bg-accent/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div
                          className={cn(
                            "size-7 rounded-full flex items-center justify-center text-xs font-bold",
                            i < 3 ? MEDAL[i] : "bg-muted text-muted-foreground"
                          )}
                        >
                          {i + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="size-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ background: r.color }}
                          >
                            {r.name[0]}
                          </div>
                          <div>
                            <div className="font-medium leading-tight">{r.name}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  r.stats.clockedIn ? "bg-success" : "bg-muted-foreground/40"
                                )}
                              />
                              {r.stats.clockedIn ? "On shift" : "Off"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {money(r.stats.salesWeekCents)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {r.stats.ordersWeek}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {r.stats.tablesToday}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {r.stats.itemsToday}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="size-3 text-primary" />
                          {pct(r.stats.upsellRate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3 text-warning fill-warning" />
                          {stars(r.stats.avgRating)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-success">
                          <Coins className="size-3" />
                          {money(r.stats.tipsTodayCents)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {hours(r.stats.weekSeconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function HighlightCard({
  label,
  icon: Icon,
  person,
  value,
  tint,
}: {
  label: string;
  icon: typeof Trophy;
  person?: Row;
  value: string;
  tint: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <div className={cn("size-7 rounded-full flex items-center justify-center", tint)}>
          <Icon className="size-3.5" />
        </div>
        {label}
      </div>
      <div className="mt-3 flex items-center gap-3">
        {person ? (
          <div
            className="size-10 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ background: person.color }}
          >
            {person.name[0]}
          </div>
        ) : (
          <div className="size-10 rounded-full bg-muted" />
        )}
        <div>
          <div className="text-lg font-semibold leading-tight">{value}</div>
          <div className="text-xs text-muted-foreground">{person?.name ?? "No data yet"}</div>
        </div>
      </div>
    </Card>
  );
}
