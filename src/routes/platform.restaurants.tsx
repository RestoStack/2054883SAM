import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, ExternalLink, Loader2, RefreshCw, Search, Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/restaurants")({
  head: () => ({ meta: [{ title: "All Restaurants — Platform Admin" }] }),
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
  booking_count: number;
};

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

  if (!platformAdmin) {
    return (
      <AppShell>
        <div className="p-10 text-center text-sm text-muted-foreground">
          You need platform super-admin access to view all restaurants.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="All Restaurants"
        description="Every restaurant that signed up on RestoStack."
        icon={Building2}
        iconBg="bg-primary/10"
        iconColor="text-primary"
        actions={
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      <div className="p-4 lg:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
            <Shield className="size-3.5" /> Platform Super Admin
          </div>
          <div className="text-sm text-muted-foreground">
            {data.length} restaurant{data.length === 1 ? "" : "s"} signed up
          </div>
          <div className="relative ml-auto">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, slug, owner…"
              className="rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm w-64"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                {["Restaurant", "Slug", "City", "Owner", "Staff", "Bookings", "Signed up", ""].map((h) => (
                  <th key={h} className="text-left font-medium px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    <Loader2 className="size-4 animate-spin inline mr-2" /> Loading restaurants…
                  </td>
                </tr>
              )}
              {!isLoading && error && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-destructive text-sm">
                    {(error as Error).message || "Failed to load restaurants."}
                  </td>
                </tr>
              )}
              {!isLoading &&
                !error &&
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-4 font-semibold">{r.name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{r.slug}</td>
                    <td className="px-5 py-4 text-muted-foreground">{r.city || "—"}</td>
                    <td className="px-5 py-4">
                      <div className="font-medium">{r.owner_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.owner_email || "—"}</div>
                    </td>
                    <td className="px-5 py-4">{r.staff_count}</td>
                    <td className="px-5 py-4">{r.booking_count}</td>
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to="/book/$slug"
                        params={{ slug: r.slug }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Public book <ExternalLink className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              {!isLoading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    {data.length === 0 ? "No restaurants have signed up yet." : `No matches for “${q}”.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
