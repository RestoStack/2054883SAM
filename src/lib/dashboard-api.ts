import { supabase } from "@/integrations/supabase/client";
import { listReservationsForRange } from "@/lib/booking-api";
import { isMissingDbObject } from "@/lib/legacy-tenant";

export type DashboardKpis = {
  reservations: number;
  seats: number;
  seats_per_reservation: number;
  no_show_rate: number;
  cancellations: number;
  occupancy_next_service: number;
  walk_ins: number;
  booked: number;
};

export type DashboardResult = {
  ok: true;
  kpis: DashboardKpis;
  trend: Array<{ on_date: string; reservations: number; covers: number }>;
  source_mix: Array<{ source: string; count: number; covers: number }>;
  by_hour: Array<{ hour: number; reservations: number; covers: number }>;
};

function buildFromRows(rows: Array<Record<string, unknown>>): DashboardResult {
  const byDate = new Map<string, { reservations: number; covers: number }>();
  const byHour = new Map<number, { reservations: number; covers: number }>();
  const bySource = new Map<string, { count: number; covers: number }>();
  let seats = 0;
  let noShows = 0;
  let cancellations = 0;
  let walkIns = 0;
  let booked = 0;

  for (const r of rows) {
    const status = String(r.status ?? "");
    const party = Number(r.party_size ?? 0);
    const date = String(r.reserved_date ?? "");
    const time = String(r.reserved_time ?? "00:00");
    const hour = Number(time.slice(0, 2)) || 0;
    const source = String(r.source ?? "manual");

    if (!byDate.has(date)) byDate.set(date, { reservations: 0, covers: 0 });
    const d = byDate.get(date)!;
    d.reservations += 1;
    d.covers += party;

    if (!byHour.has(hour)) byHour.set(hour, { reservations: 0, covers: 0 });
    const h = byHour.get(hour)!;
    h.reservations += 1;
    h.covers += party;

    if (!bySource.has(source)) bySource.set(source, { count: 0, covers: 0 });
    const s = bySource.get(source)!;
    s.count += 1;
    s.covers += party;

    seats += party;
    if (status === "no_show") noShows += 1;
    if (status === "cancelled") cancellations += 1;
    if (source === "walk_in" || source === "walk-in") walkIns += 1;
    else booked += 1;
  }

  const total = rows.length || 1;
  const trend = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([on_date, v]) => ({ on_date, ...v }));
  const by_hour = [...byHour.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, v]) => ({ hour, ...v }));
  const source_mix = [...bySource.entries()].map(([source, v]) => ({ source, ...v }));

  return {
    ok: true,
    kpis: {
      reservations: rows.length,
      seats,
      seats_per_reservation: rows.length ? Math.round((seats / rows.length) * 10) / 10 : 0,
      no_show_rate: Math.round((noShows / total) * 100),
      cancellations,
      occupancy_next_service: 0,
      walk_ins: walkIns,
      booked,
    },
    trend,
    source_mix,
    by_hour,
  };
}

export async function getDashboard(
  organizationId: string | null,
  locationId: string | null,
  from: string,
  to: string,
  restaurantId?: string | null,
) {
  if (organizationId) {
    const { data, error } = await (supabase as any).rpc("get_dashboard", {
      _organization_id: organizationId,
      _location_id: locationId,
      _from: from,
      _to: to,
    });
    if (!error && data?.ok) {
      return data as DashboardResult;
    }
    if (error && !isMissingDbObject(error)) {
      return { ok: false as const, error: error.message };
    }
  }

  const list = await listReservationsForRange(
    organizationId,
    locationId,
    from,
    to,
    restaurantId,
  );
  if (!list.ok) return { ok: false as const, error: list.error };
  return buildFromRows(list.rows as Array<Record<string, unknown>>);
}

export async function getReportMetrics(
  organizationId: string | null,
  locationId: string | null,
  from: string,
  to: string,
  groupBy: "day" | "week" | "month" | "location" | "source" | "daypart" = "day",
  restaurantId?: string | null,
) {
  if (organizationId) {
    const { data, error } = await (supabase as any).rpc("reports_reservation_metrics", {
      _organization_id: organizationId,
      _location_id: locationId,
      _from: from,
      _to: to,
      _group_by: groupBy === "daypart" ? "day" : groupBy,
    });
    if (!error && data?.ok) {
      return data as {
        ok: true;
        rows: Array<{ bucket: string; reservations: number; covers: number; no_shows: number }>;
        prior_from: string;
        prior_to: string;
      };
    }
    if (error && !isMissingDbObject(error)) {
      return { ok: false as const, error: error.message };
    }
  }

  const list = await listReservationsForRange(
    organizationId,
    locationId,
    from,
    to,
    restaurantId,
  );
  if (!list.ok) return { ok: false as const, error: list.error };

  const buckets = new Map<string, { reservations: number; covers: number; no_shows: number }>();
  for (const r of list.rows) {
    const date = String(r.reserved_date ?? "");
    let bucket = date;
    if (groupBy === "source") bucket = String(r.source ?? "manual");
    if (!buckets.has(bucket)) buckets.set(bucket, { reservations: 0, covers: 0, no_shows: 0 });
    const b = buckets.get(bucket)!;
    b.reservations += 1;
    b.covers += Number(r.party_size ?? 0);
    if (String(r.status) === "no_show") b.no_shows += 1;
  }

  return {
    ok: true as const,
    rows: [...buckets.entries()].map(([bucket, v]) => ({ bucket, ...v })),
    prior_from: from,
    prior_to: to,
  };
}

export type ReportPreset = {
  id: string;
  name: string;
  config: {
    location_id?: string | null;
    from?: string;
    to?: string;
    group_by?: "day" | "week" | "month" | "location" | "source";
  };
};

export async function listReportPresets(organizationId: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user)
    return { ok: false as const, error: "Not signed in", presets: [] as ReportPreset[] };
  const { data, error } = await (supabase as any)
    .from("report_presets")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", user.user.id)
    .order("name");
  if (error) {
    if (isMissingDbObject(error)) return { ok: true as const, presets: [] as ReportPreset[] };
    return { ok: false as const, error: error.message, presets: [] as ReportPreset[] };
  }
  return { ok: true as const, presets: (data ?? []) as ReportPreset[] };
}

export async function saveReportPreset(
  organizationId: string,
  name: string,
  config: ReportPreset["config"],
) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false as const, error: "Not signed in" };
  const { error } = await (supabase as any).from("report_presets").upsert(
    {
      organization_id: organizationId,
      user_id: user.user.id,
      name,
      config,
    },
    { onConflict: "organization_id,user_id,name" },
  );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteReportPreset(organizationId: string, id: string) {
  const { error } = await (supabase as any)
    .from("report_presets")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
