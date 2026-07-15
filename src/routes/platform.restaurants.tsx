import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, RefreshCw, Search, Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { PlatformShell } from "@/components/layout/PlatformShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/restaurants")({
  head: () => ({ meta: [{ title: "All Restaurants — Super Admin" }] }),
  component: PlatformRestaurantsPage,
});

type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  created_at: string;
  owner_email: string | null;
  owner_name: string | null;
  staff_count: number;
  guest_count: number;
  booking_count: number;
  waitlist_count: number;
  order_count: number;
  covers_booked: number;
  revenue: number;
  last_booking_at: string | null;
};

const fmtMoney = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v || 0)}`;

function PlatformRestaurantsPage() {
  const { platformAdmin } = useAuth();
  const [q, setQ] = useState("");

  const { data = [], isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["v2_platform_list_restaurants"],
    enabled: platformAdmin,
    queryFn: async (): Promise<RestaurantRow[]> => {
      const { data, error } = await supabase.rpc("v2_platform_list_restaurants");
      if (error) throw error;
      return (data ?? []) as RestaurantRow[];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((r) =>
      `${r.name} ${r.slug} ${r.city ?? ""} ${r.owner_email ?? ""} ${r.owner_name ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [data, q]);

  const totals = useMemo(() => {
    return {
      guests: data.reduce((a, r) => a + Number(r.guest_count || 0), 0),
      bookings: data.reduce((a, r) => a + Number(r.booking_count || 0), 0),
      revenue: data.reduce((a, r) => a + Number(r.revenue || 0), 0),
    };
  }, [data]);

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
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 text-emerald-300 px-3 py-1 text-xs font-semibold mb-3">
              <Shield className="size-3.5" /> Super Admin Console
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">All Restaurants</h1>
            <p className="text-sm text-slate-400 mt-1">
              Every restaurant signed up for RestoStack — with guests, bookings, and revenue.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span>
            <span className="text-white font-semibold">{data.length}</span> restaurants
          </span>
          <span className="text-slate-700">·</span>
          <span>
            <span className="text-white font-semibold">{totals.guests}</span> guests
          </span>
          <span className="text-slate-700">·</span>
          <span>
            <span className="text-white font-semibold">{totals.bookings}</span> bookings
          </span>
          <span className="text-slate-700">·</span>
          <span>
            <span className="text-white font-semibold">{fmtMoney(totals.revenue)}</span> order revenue
          </span>
          <div className="relative ml-auto">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, slug, owner…"
              className="rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 py-2 text-sm text-white w-64 placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-800 bg-slate-950/60">
                {[
                  "Restaurant",
                  "Owner",
                  "Guests",
                  "Bookings",
                  "Covers",
                  "Orders",
                  "Revenue",
                  "Staff",
                  "Signed up",
                  "",
                ].map((h) => (
                  <th key={h || "actions"} className="text-left font-medium px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-400">
                    <Loader2 className="size-4 animate-spin inline mr-2" /> Loading restaurants…
                  </td>
                </tr>
              )}
              {!isLoading && error && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-red-300 text-sm">
                    {(error as Error).message || "Failed to load restaurants."}
                  </td>
                </tr>
              )}
              {!isLoading &&
                !error &&
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-white">{r.name}</div>
                      <div className="text-xs text-slate-500">
                        <span className="font-mono">{r.slug}</span>
                        {r.city ? ` · ${r.city}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-100">{r.owner_name || "—"}</div>
                      <div className="text-xs text-slate-500">{r.owner_email || "—"}</div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-emerald-300">{r.guest_count}</td>
                    <td className="px-4 py-4 text-slate-300">{r.booking_count}</td>
                    <td className="px-4 py-4 text-slate-300">{r.covers_booked}</td>
                    <td className="px-4 py-4 text-slate-300">{r.order_count}</td>
                    <td className="px-4 py-4 text-slate-300">{fmtMoney(Number(r.revenue || 0))}</td>
                    <td className="px-4 py-4 text-slate-300">{r.staff_count}</td>
                    <td className="px-4 py-4 text-slate-500 whitespace-nowrap text-xs">
                      <div>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</div>
                      <div className="text-slate-600">
                        Last booking:{" "}
                        {r.last_booking_at ? new Date(r.last_booking_at).toLocaleDateString() : "never"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to="/book/$slug"
                        params={{ slug: r.slug }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
                      >
                        Public book <ExternalLink className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              {!isLoading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-400">
                    {data.length === 0 ? "No restaurants have signed up yet." : `No matches for “${q}”.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PlatformShell>
  );
}
