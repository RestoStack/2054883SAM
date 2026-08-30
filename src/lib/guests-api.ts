import { supabase } from "@/integrations/supabase/client";
import { isMissingDbObject, resolveRestaurantId } from "@/lib/legacy-tenant";

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
  /** Legacy v2_customers fields */
  notes?: string | null;
  visit_count?: number | null;
  loyalty_points?: number | null;
  total_spent?: number | null;
  last_visit?: string | null;
  restaurant_id?: string | null;
};

export type GuestFilters = {
  /** "yes" = opted in, "no" = not opted in, undefined = no filter */
  optIn?: "yes" | "no";
  hasPhone?: boolean;
};

function mapLegacyCustomer(c: Record<string, unknown>): GuestRow & Record<string, unknown> {
  return {
    id: String(c.id),
    full_name: String(c.full_name ?? ""),
    email: (c.email as string | null) ?? null,
    phone: (c.phone as string | null) ?? null,
    phone_e164: (c.phone as string | null) ?? null,
    email_normalized: (c.email as string | null) ?? null,
    marketing_opt_in: false,
    marketing_opt_in_at: null,
    marketing_opt_in_source: null,
    tags: null,
    anonymized_at: null,
    created_at: String(c.created_at ?? new Date().toISOString()),
    notes: (c.notes as string | null) ?? null,
    visit_count: Number(c.visit_count ?? 0),
    loyalty_points: Number(c.loyalty_points ?? 0),
    total_spent: Number(c.total_spent ?? 0),
    last_visit: (c.last_visit as string | null) ?? null,
    restaurant_id: (c.restaurant_id as string | null) ?? null,
  };
}

/** Find or create a v2_customers row so reservation names can open guest detail. */
export async function ensureGuestIdForContact(
  restaurantId: string | null | undefined,
  contact: { full_name: string; email?: string | null; phone?: string | null },
): Promise<string | null> {
  const rid = await resolveRestaurantId(restaurantId);
  if (!rid) return null;
  const name = contact.full_name?.trim();
  if (!name) return null;
  const email = contact.email?.trim() || null;
  const phone = contact.phone?.trim() || null;

  try {
    if (email) {
      const { data } = await (supabase as any)
        .from("v2_customers")
        .select("id")
        .eq("restaurant_id", rid)
        .eq("email", email)
        .maybeSingle();
      if (data?.id) return String(data.id);
    }
    if (phone) {
      const { data } = await (supabase as any)
        .from("v2_customers")
        .select("id")
        .eq("restaurant_id", rid)
        .eq("phone", phone)
        .maybeSingle();
      if (data?.id) return String(data.id);
    }
    {
      const { data } = await (supabase as any)
        .from("v2_customers")
        .select("id")
        .eq("restaurant_id", rid)
        .eq("full_name", name)
        .limit(1)
        .maybeSingle();
      if (data?.id) return String(data.id);
    }
    const { data: created } = await (supabase as any)
      .from("v2_customers")
      .insert({
        restaurant_id: rid,
        full_name: name,
        email,
        phone,
      })
      .select("id")
      .single();
    return created?.id ? String(created.id) : null;
  } catch {
    return null;
  }
}

export async function listGuests(
  organizationId: string | null,
  q?: string,
  filters?: GuestFilters,
  restaurantId?: string | null,
) {
  if (organizationId) {
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
    if (!error) return { ok: true as const, guests: (data ?? []) as GuestRow[] };
    if (!isMissingDbObject(error)) {
      return { ok: false as const, error: error.message, guests: [] as GuestRow[] };
    }
  }

  const rid = await resolveRestaurantId(restaurantId);
  if (!rid) return { ok: true as const, guests: [] as GuestRow[] };

  // Backfill customers from bookings that were created without a customer_id.
  try {
    const { data: orphanBookings } = await (supabase as any)
      .from("v2_bookings")
      .select("id, guest_name, guest_email, guest_phone, customer_id")
      .eq("restaurant_id", rid)
      .is("customer_id", null)
      .not("guest_name", "is", null)
      .limit(100);
    for (const b of (orphanBookings ?? []) as Array<Record<string, unknown>>) {
      const name = String(b.guest_name ?? "").trim();
      if (!name) continue;
      const email = (b.guest_email as string | null) ?? null;
      const phone = (b.guest_phone as string | null) ?? null;
      let customerId: string | null = null;
      if (email) {
        const { data } = await (supabase as any)
          .from("v2_customers")
          .select("id")
          .eq("restaurant_id", rid)
          .eq("email", email)
          .maybeSingle();
        if (data?.id) customerId = String(data.id);
      }
      if (!customerId && phone) {
        const { data } = await (supabase as any)
          .from("v2_customers")
          .select("id")
          .eq("restaurant_id", rid)
          .eq("phone", phone)
          .maybeSingle();
        if (data?.id) customerId = String(data.id);
      }
      if (!customerId) {
        const { data: created } = await (supabase as any)
          .from("v2_customers")
          .insert({
            restaurant_id: rid,
            full_name: name,
            email,
            phone,
          })
          .select("id")
          .single();
        if (created?.id) customerId = String(created.id);
      }
      if (customerId) {
        await (supabase as any)
          .from("v2_bookings")
          .update({ customer_id: customerId })
          .eq("id", b.id);
      }
    }
  } catch {
    // Best-effort backfill.
  }

  let cq = (supabase as any)
    .from("v2_customers")
    .select(
      "id, full_name, email, phone, notes, created_at, restaurant_id, visit_count, loyalty_points, total_spent, last_visit",
    )
    .eq("restaurant_id", rid)
    .order("full_name")
    .limit(500);
  if (q?.trim()) {
    const s = `%${q.trim()}%`;
    cq = cq.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
  }
  if (filters?.hasPhone === true) cq = cq.not("phone", "is", null);
  else if (filters?.hasPhone === false) cq = cq.is("phone", null);

  const { data, error } = await cq;
  if (error) return { ok: false as const, error: error.message, guests: [] as GuestRow[] };

  const guests: GuestRow[] = ((data ?? []) as Array<Record<string, unknown>>).map(mapLegacyCustomer);

  if (filters?.optIn === "yes") return { ok: true as const, guests: [] as GuestRow[] };
  return { ok: true as const, guests };
}

export async function getGuest(
  organizationId: string | null,
  guestId: string,
  restaurantId?: string | null,
) {
  if (!guestId) return { ok: false as const, error: "Missing guest id" };

  if (organizationId) {
    const { data, error } = await (supabase as any)
      .from("guests")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", guestId)
      .maybeSingle();
    if (!error && data) {
      return { ok: true as const, guest: data as GuestRow & Record<string, unknown> };
    }
    // Fall through to v2_customers for legacy tenants even if org query errors.
  }

  const rid = await resolveRestaurantId(restaurantId);
  let query = (supabase as any).from("v2_customers").select("*").eq("id", guestId);
  if (rid) query = query.eq("restaurant_id", rid);
  const { data, error } = await query.maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) {
    // Retry without restaurant filter in case RLS already scopes rows.
    if (rid) {
      const retry = await (supabase as any)
        .from("v2_customers")
        .select("*")
        .eq("id", guestId)
        .maybeSingle();
      if (!retry.error && retry.data) {
        return { ok: true as const, guest: mapLegacyCustomer(retry.data as Record<string, unknown>) };
      }
    }
    return { ok: false as const, error: "Not found" };
  }
  return { ok: true as const, guest: mapLegacyCustomer(data as Record<string, unknown>) };
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

export async function getGuestHistory(
  organizationId: string | null,
  guestId: string,
  restaurantId?: string | null,
  guest?: { email?: string | null; phone?: string | null; full_name?: string | null } | null,
) {
  if (organizationId) {
    const { data, error } = await (supabase as any)
      .from("reservations")
      .select(
        "id, reserved_date, reserved_time, party_size, status, source, table_number, location_id",
      )
      .eq("organization_id", organizationId)
      .eq("guest_id", guestId)
      .order("reserved_date", { ascending: false })
      .limit(50);
    if (!error) return { ok: true as const, rows: data ?? [] };
    if (!isMissingDbObject(error)) {
      return { ok: false as const, error: error.message, rows: [] };
    }
  }

  const mapRows = (data: Array<Record<string, unknown>> | null) =>
    (data ?? []).map((b) => ({
      id: b.id,
      reserved_date: b.date,
      reserved_time: b.time,
      party_size: b.party_size,
      status: b.status,
      source: b.source,
      table_number: b.table_number,
      location_id: null,
      guest_name: b.guest_name ?? null,
      guest_email: b.guest_email ?? null,
      guest_phone: b.guest_phone ?? null,
    }));

  const { data, error } = await (supabase as any)
    .from("v2_bookings")
    .select(
      "id, date, time, party_size, status, source, table_number, customer_id, guest_name, guest_email, guest_phone, restaurant_id",
    )
    .eq("customer_id", guestId)
    .order("date", { ascending: false })
    .limit(50);
  if (error) return { ok: false as const, error: error.message, rows: [] };
  if ((data ?? []).length > 0) return { ok: true as const, rows: mapRows(data) };

  // Fallback: match bookings by contact/name when customer_id was never linked.
  const rid = await resolveRestaurantId(restaurantId);
  let bq = (supabase as any)
    .from("v2_bookings")
    .select(
      "id, date, time, party_size, status, source, table_number, customer_id, guest_name, guest_email, guest_phone, restaurant_id",
    )
    .order("date", { ascending: false })
    .limit(200);
  if (rid) bq = bq.eq("restaurant_id", rid);
  const { data: all, error: allErr } = await bq;
  if (allErr) return { ok: true as const, rows: [] };

  const email = guest?.email?.trim().toLowerCase() || null;
  const phone = guest?.phone?.trim() || null;
  const name = guest?.full_name?.trim().toLowerCase() || null;
  const matched = ((all ?? []) as Array<Record<string, unknown>>).filter((b) => {
    if (String(b.customer_id ?? "") === guestId) return true;
    const bEmail = String(b.guest_email ?? "").trim().toLowerCase();
    const bPhone = String(b.guest_phone ?? "").trim();
    const bName = String(b.guest_name ?? "").trim().toLowerCase();
    if (email && bEmail && bEmail === email) return true;
    if (phone && bPhone && bPhone === phone) return true;
    if (name && bName && bName === name) return true;
    return false;
  }).slice(0, 50);

  return { ok: true as const, rows: mapRows(matched) };
}

export async function listSegments(organizationId: string | null) {
  if (!organizationId) return { ok: true as const, segments: [] };
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false as const, error: "Not signed in", segments: [] };
  const { data, error } = await (supabase as any)
    .from("guest_segments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", user.user.id)
    .order("name");
  if (error) {
    if (isMissingDbObject(error)) return { ok: true as const, segments: [] };
    return { ok: false as const, error: error.message, segments: [] };
  }
  return { ok: true as const, segments: data ?? [] };
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
