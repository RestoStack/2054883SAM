import { supabase } from "@/integrations/supabase/client";
import {
  bookingRulesSchema,
  createReservationSchema,
  type BookingRulesInput,
  type CreateReservationInput,
} from "@/lib/schemas/booking";
import {
  isMissingDbObject,
  mapLegacyBooking,
  resolveRestaurantId,
  type LegacyBookingRow,
} from "@/lib/legacy-tenant";

function clientKey(): string {
  try {
    const k = localStorage.getItem("restostack:book_client");
    if (k) return k;
    const n = crypto.randomUUID();
    localStorage.setItem("restostack:book_client", n);
    return n;
  } catch {
    return "anon";
  }
}

export async function getAvailability(slug: string, date: string, partySize = 2) {
  const { data, error } = await (supabase as any).rpc("get_availability", {
    _slug: slug,
    _date: date,
    _party_size: partySize,
  });
  if (error) {
    // Fallback to older RPC name
    const fallback = await (supabase as any).rpc("public_get_availability", {
      _slug: slug,
      _date: date,
    });
    if (fallback.error) {
      return { ok: false as const, error: error.message, missing: true };
    }
    if (!fallback.data?.ok) return { ok: false as const, error: fallback.data?.error ?? "Unavailable" };
    return fallback.data;
  }
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Unavailable" };
  return data as {
    ok: true;
    closed: boolean;
    max_party_size: number;
    slot_interval_minutes: number;
    party_size?: number;
    slots: Array<{
      time: string;
      available: boolean;
      remaining_covers: number;
      duration_minutes?: number;
    }>;
    slug: string;
  };
}

/** @deprecated use getAvailability */
export async function getPublicAvailability(slug: string, date: string) {
  return getAvailability(slug, date, 2);
}

export async function createPublicReservation(input: CreateReservationInput & { ip?: string }) {
  const parsed = createReservationSchema.safeParse({
    ...input,
    client_key: input.client_key ?? clientKey(),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  }
  const p = parsed.data;
  const { data, error } = await (supabase as any).rpc("create_public_reservation", {
    _slug: p.slug,
    _guest_name: p.guest_name,
    _guest_phone: p.guest_phone ?? "",
    _guest_email: p.guest_email ?? "",
    _party_size: p.party_size,
    _date: p.date,
    _time: p.time.length === 5 ? `${p.time}:00` : p.time,
    _section: p.section ?? null,
    _notes: p.notes ?? null,
    _client_key: p.client_key ?? clientKey(),
    _ip: input.ip ?? null,
  });
  if (error) {
    const fb = await (supabase as any).rpc("public_create_reservation", {
      _slug: p.slug,
      _guest_name: p.guest_name,
      _guest_phone: p.guest_phone ?? "",
      _guest_email: p.guest_email ?? "",
      _party_size: p.party_size,
      _date: p.date,
      _time: p.time.length === 5 ? `${p.time}:00` : p.time,
      _section: p.section ?? null,
      _notes: p.notes ?? null,
      _client_key: p.client_key ?? clientKey(),
    });
    if (fb.error) return { ok: false as const, error: error.message, missing: true };
    if (!fb.data?.ok) return { ok: false as const, error: fb.data?.error ?? "Booking failed" };
    return fb.data as { ok: true; reservation_id: string };
  }
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Booking failed" };

  // Fire-and-forget confirmation email via Edge Function (Resend)
  if (data.needs_confirmation_email && p.guest_email) {
    void supabase.functions
      .invoke("send-reservation-confirmation", {
        body: {
          reservation_id: data.reservation_id,
          email: p.guest_email,
          guest_name: p.guest_name,
          party_size: p.party_size,
          date: p.date,
          time: p.time,
          slug: p.slug,
        },
      })
      .catch(() => undefined);
  }

  return data as { ok: true; reservation_id: string; guest_id?: string };
}

export async function getBookingRules(organizationId: string, locationId: string) {
  const { data, error } = await (supabase as any).rpc("app_settings_get_booking_rules", {
    _organization_id: organizationId,
    _location_id: locationId,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return data as {
    ok: true;
    slot_interval_minutes: number;
    max_party_size: number;
    lead_time_hours: number;
  };
}

export async function upsertBookingRules(input: BookingRulesInput) {
  const parsed = bookingRulesSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  const { data, error } = await (supabase as any).rpc("app_settings_upsert_booking_rules", {
    _organization_id: parsed.data.organization_id,
    _location_id: parsed.data.location_id,
    _slot_interval_minutes: parsed.data.slot_interval_minutes,
    _max_party_size: parsed.data.max_party_size,
    _lead_time_hours: parsed.data.lead_time_hours,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return { ok: true as const };
}

export async function createWalkIn(input: {
  organization_id: string;
  location_id: string;
  guest_name: string;
  party_size: number;
  table_number?: string | null;
  notes?: string | null;
  table_id?: string | null;
}) {
  const { data, error } = await (supabase as any).rpc("app_create_walk_in", {
    _organization_id: input.organization_id,
    _location_id: input.location_id,
    _guest_name: input.guest_name,
    _party_size: input.party_size,
    _table_number: input.table_number ?? null,
    _notes: input.notes ?? null,
    _table_id: input.table_id ?? null,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return data as { ok: true; reservation_id: string };
}

export async function createManualReservation(input: {
  organization_id: string;
  location_id: string;
  guest_name: string;
  party_size: number;
  date: string;
  time: string;
  guest_phone?: string | null;
  guest_email?: string | null;
  table_id?: string | null;
  notes?: string | null;
  /** Legacy tenant when org model is missing */
  restaurant_id?: string | null;
}) {
  const { data, error } = await (supabase as any).rpc("app_create_manual_reservation", {
    _organization_id: input.organization_id,
    _location_id: input.location_id,
    _guest_name: input.guest_name,
    _party_size: input.party_size,
    _date: input.date,
    _time: input.time.length === 5 ? `${input.time}:00` : input.time,
    _guest_phone: input.guest_phone ?? null,
    _guest_email: input.guest_email ?? null,
    _table_id: input.table_id ?? null,
    _notes: input.notes ?? null,
  });
  if (!error && data?.ok) {
    return data as { ok: true; reservation_id: string };
  }
  if (error && !isMissingDbObject(error) && data?.ok !== false) {
    return { ok: false as const, error: error.message };
  }
  if (data && data.ok === false && !isMissingDbObject(error)) {
    return { ok: false as const, error: data.error ?? "Failed" };
  }

  // Legacy: insert into v2_bookings (live schema uses date/time columns).
  const restaurantId = await resolveRestaurantId(input.restaurant_id);
  if (!restaurantId) {
    return {
      ok: false as const,
      error: error?.message ?? data?.error ?? "No restaurant context",
    };
  }
  const time = input.time.length === 5 ? `${input.time}:00` : input.time;
  const { data: row, error: insErr } = await (supabase as any)
    .from("v2_bookings")
    .insert({
      restaurant_id: restaurantId,
      guest_name: input.guest_name,
      guest_phone: input.guest_phone ?? null,
      guest_email: input.guest_email ?? null,
      party_size: input.party_size,
      date: input.date,
      time,
      status: "confirmed",
      source: "manual",
      notes: input.notes ?? null,
      table_number: null,
    })
    .select("id")
    .single();
  if (insErr) return { ok: false as const, error: insErr.message };
  return { ok: true as const, reservation_id: String(row.id) };
}

export async function updateReservationStatus(
  organizationId: string,
  reservationId: string,
  status: string,
) {
  const { data, error } = await (supabase as any).rpc("app_update_reservation_status", {
    _organization_id: organizationId,
    _reservation_id: reservationId,
    _status: status,
  });
  if (!error && data?.ok) return { ok: true as const };
  if (error && !isMissingDbObject(error)) {
    return { ok: false as const, error: error.message };
  }
  if (data && data.ok === false && !isMissingDbObject(error)) {
    return { ok: false as const, error: data.error ?? "Failed" };
  }

  const { error: updErr } = await (supabase as any)
    .from("v2_bookings")
    .update({ status })
    .eq("id", reservationId);
  if (updErr) return { ok: false as const, error: updErr.message };
  return { ok: true as const };
}

export async function listReservationsForDay(
  organizationId: string,
  locationId: string,
  date: string,
) {
  return listReservationsForRange(organizationId, locationId, date, date);
}

/** Inclusive date range — used by dashboard month view and reservations calendar. */
export async function listReservationsForRange(
  organizationId: string | null,
  locationId: string | null,
  fromDate: string,
  toDate: string,
  restaurantId?: string | null,
) {
  if (organizationId) {
    let q = (supabase as any)
      .from("reservations")
      .select(
        "id, guest_name, guest_phone, guest_email, party_size, reserved_date, reserved_time, table_id, table_number, status, source, notes, guest_id, location_id, organization_id",
      )
      .eq("organization_id", organizationId)
      .gte("reserved_date", fromDate)
      .lte("reserved_date", toDate)
      .order("reserved_date")
      .order("reserved_time");
    if (locationId) q = q.eq("location_id", locationId);

    const { data, error } = await q;
    if (!error) {
      return { ok: true as const, rows: (data ?? []) as Array<Record<string, unknown>> };
    }
    if (!isMissingDbObject(error)) {
      return { ok: false as const, error: error.message, rows: [] as const };
    }
  }

  const rid = await resolveRestaurantId(restaurantId);
  let bq = (supabase as any)
    .from("v2_bookings")
    .select(
      "id, guest_name, guest_phone, guest_email, party_size, date, time, table_number, status, source, notes, restaurant_id, customer_id",
    )
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date")
    .order("time");
  if (rid) bq = bq.eq("restaurant_id", rid);

  const { data: bookings, error: bErr } = await bq;
  if (bErr) {
    // Older demos used booking_date / booking_time
    let alt = (supabase as any)
      .from("v2_bookings")
      .select(
        "id, guest_name, guest_phone, guest_email, party_size, booking_date, booking_time, table_number, status, source, notes, restaurant_id, customer_id",
      )
      .gte("booking_date", fromDate)
      .lte("booking_date", toDate)
      .order("booking_date")
      .order("booking_time");
    if (rid) alt = alt.eq("restaurant_id", rid);
    const { data: altRows, error: altErr } = await alt;
    if (altErr) return { ok: false as const, error: bErr.message, rows: [] as const };
    return {
      ok: true as const,
      rows: (altRows ?? []).map((b: Record<string, unknown>) => mapLegacyBooking(b)),
    };
  }

  return {
    ok: true as const,
    rows: (bookings ?? []).map((b: LegacyBookingRow) => mapLegacyBooking(b)),
  };
}

export async function getPublicMenuAssets(slug: string) {
  const { data, error } = await (supabase as any).rpc("public_get_menu_assets", { _slug: slug });
  if (error) return { ok: false as const, error: error.message, assets: [] as const };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed", assets: [] as const };
  return { ok: true as const, assets: (data.assets ?? []) as Array<Record<string, unknown>> };
}
