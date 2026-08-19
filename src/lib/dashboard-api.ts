import { supabase } from "@/integrations/supabase/client";

export async function getDashboard(
  organizationId: string,
  locationId: string | null,
  from: string,
  to: string,
) {
  const { data, error } = await (supabase as any).rpc("get_dashboard", {
    _organization_id: organizationId,
    _location_id: locationId,
    _from: from,
    _to: to,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return data as {
    ok: true;
    kpis: {
      reservations: number;
      seats: number;
      seats_per_reservation: number;
      no_show_rate: number;
      cancellations: number;
      occupancy_next_service: number;
      walk_ins: number;
      booked: number;
    };
    trend: Array<{ on_date: string; reservations: number; covers: number }>;
    source_mix: Array<{ source: string; count: number; covers: number }>;
    by_hour: Array<{ hour: number; reservations: number; covers: number }>;
  };
}

export async function getReportMetrics(
  organizationId: string,
  locationId: string | null,
  from: string,
  to: string,
  groupBy: "day" | "week" | "month" | "location" | "source" | "daypart" = "day",
) {
  const { data, error } = await (supabase as any).rpc("reports_reservation_metrics", {
    _organization_id: organizationId,
    _location_id: locationId,
    _from: from,
    _to: to,
    _group_by: groupBy === "daypart" ? "day" : groupBy,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return data as {
    ok: true;
    rows: Array<{ bucket: string; reservations: number; covers: number; no_shows: number }>;
    prior_from: string;
    prior_to: string;
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
  if (error) return { ok: false as const, error: error.message, presets: [] as ReportPreset[] };
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
