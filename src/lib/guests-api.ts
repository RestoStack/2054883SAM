import { supabase } from "@/integrations/supabase/client";

export type GuestRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  phone_e164: string | null;
  email_normalized: string | null;
  marketing_opt_in: boolean;
  marketing_opt_in_at: string | null;
  marketing_opt_in_source: string | null;
  tags: string[] | null;
  anonymized_at: string | null;
  created_at: string;
};

export type GuestFilters = {
  /** "yes" = opted in, "no" = not opted in, undefined = no filter */
  optIn?: "yes" | "no";
  hasPhone?: boolean;
};

export async function listGuests(organizationId: string, q?: string, filters?: GuestFilters) {
  let query = (supabase as any)
    .from("guests")
    .select(
      "id, full_name, email, phone, phone_e164, email_normalized, marketing_opt_in, marketing_opt_in_at, marketing_opt_in_source, tags, anonymized_at, created_at",
    )
    .eq("organization_id", organizationId)
    .is("anonymized_at", null)
    .order("full_name")
    .limit(500);
  if (q?.trim()) {
    const s = `%${q.trim()}%`;
    query = query.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
  }
  if (filters?.optIn === "yes") query = query.eq("marketing_opt_in", true);
  else if (filters?.optIn === "no") query = query.eq("marketing_opt_in", false);
  if (filters?.hasPhone === true) query = query.not("phone", "is", null);
  else if (filters?.hasPhone === false) query = query.is("phone", null);
  const { data, error } = await query;
  if (error) return { ok: false as const, error: error.message, guests: [] as GuestRow[] };
  return { ok: true as const, guests: (data ?? []) as GuestRow[] };
}

export async function getGuest(organizationId: string, guestId: string) {
  const { data, error } = await (supabase as any)
    .from("guests")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", guestId)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Not found" };
  return { ok: true as const, guest: data as GuestRow & Record<string, unknown> };
}

export async function getGuestStats(guestId: string) {
  const { data, error } = await (supabase as any)
    .from("guest_location_stats")
    .select("*")
    .eq("guest_id", guestId);
  if (error) return { ok: false as const, error: error.message, stats: [] };
  return { ok: true as const, stats: data ?? [] };
}

export async function getGuestNotes(guestId: string) {
  const { data, error } = await (supabase as any)
    .from("guest_notes")
    .select("*")
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message, notes: [] };
  return { ok: true as const, notes: data ?? [] };
}

export async function addGuestNote(
  organizationId: string,
  guestId: string,
  body: string,
  locationId?: string | null,
) {
  const { data: user } = await supabase.auth.getUser();
  const { error } = await (supabase as any).from("guest_notes").insert({
    organization_id: organizationId,
    guest_id: guestId,
    location_id: locationId ?? null,
    author_user_id: user.user?.id ?? null,
    body: body.trim(),
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function getGuestHistory(organizationId: string, guestId: string) {
  const { data, error } = await (supabase as any)
    .from("reservations")
    .select(
      "id, reserved_date, reserved_time, party_size, status, source, table_number, location_id",
    )
    .eq("organization_id", organizationId)
    .eq("guest_id", guestId)
    .order("reserved_date", { ascending: false })
    .limit(50);
  if (error) return { ok: false as const, error: error.message, rows: [] };
  return { ok: true as const, rows: data ?? [] };
}

export async function mergeGuests(organizationId: string, keepId: string, mergeId: string) {
  const { data, error } = await (supabase as any).rpc("app_merge_guests", {
    _organization_id: organizationId,
    _keep_guest_id: keepId,
    _merge_guest_id: mergeId,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return { ok: true as const };
}

export async function anonymizeGuest(organizationId: string, guestId: string) {
  const { data, error } = await (supabase as any).rpc("app_anonymize_guest", {
    _organization_id: organizationId,
    _guest_id: guestId,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return { ok: true as const };
}

export async function listSegments(organizationId: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false as const, error: "Not signed in", segments: [] };
  const { data, error } = await (supabase as any)
    .from("guest_segments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", user.user.id)
    .order("name");
  if (error) return { ok: false as const, error: error.message, segments: [] };
  return { ok: true as const, segments: data ?? [] };
}

export async function saveSegment(
  organizationId: string,
  name: string,
  filters: Record<string, unknown>,
) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false as const, error: "Not signed in" };
  const { error } = await (supabase as any).from("guest_segments").upsert(
    {
      organization_id: organizationId,
      user_id: user.user.id,
      name,
      filters,
    },
    { onConflict: "organization_id,user_id,name" },
  );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** CSV export — only includes marketing_opt_in column; callers must respect CASL. */
export function guestsToCsv(guests: GuestRow[]): string {
  const header = [
    "full_name",
    "email",
    "phone",
    "marketing_opt_in",
    "marketing_opt_in_at",
    "marketing_opt_in_source",
    "tags",
  ];
  const lines = [header.join(",")];
  for (const g of guests) {
    lines.push(
      [
        csv(g.full_name),
        csv(g.email ?? ""),
        csv(g.phone_e164 ?? g.phone ?? ""),
        g.marketing_opt_in ? "true" : "false",
        csv(g.marketing_opt_in_at ?? ""),
        csv(g.marketing_opt_in_source ?? ""),
        csv((g.tags ?? []).join("|")),
      ].join(","),
    );
  }
  return lines.join("\n");
}

function csv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
