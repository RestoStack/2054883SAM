import { supabase } from "@/integrations/supabase/client";
import {
  bookingRulesSchema,
  createReservationSchema,
  type BookingRulesInput,
  type CreateReservationInput,
} from "@/lib/schemas/booking";

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

export async function getPublicAvailability(slug: string, date: string) {
  const { data, error } = await (supabase as any).rpc("public_get_availability", {
    _slug: slug,
    _date: date,
  });
  if (error) {
    // Fallback: RPC missing until migration applied
    return { ok: false as const, error: error.message, missing: true };
  }
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Unavailable" };
  return data as {
    ok: true;
    closed: boolean;
    max_party_size: number;
    slot_interval_minutes: number;
    slots: Array<{ time: string; available: boolean; remaining_covers: number }>;
    slug: string;
  };
}

export async function createPublicReservation(input: CreateReservationInput) {
  const parsed = createReservationSchema.safeParse({
    ...input,
    client_key: input.client_key ?? clientKey(),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  }
  const p = parsed.data;
  const { data, error } = await (supabase as any).rpc("public_create_reservation", {
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
  if (error) return { ok: false as const, error: error.message, missing: true };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Booking failed" };
  return data as { ok: true; reservation_id: string };
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
}) {
  const { data, error } = await (supabase as any).rpc("app_create_walk_in", {
    _organization_id: input.organization_id,
    _location_id: input.location_id,
    _guest_name: input.guest_name,
    _party_size: input.party_size,
    _table_number: input.table_number ?? null,
    _notes: input.notes ?? null,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return data as { ok: true; reservation_id: string };
}
