/**
 * Helpers for operating on v2_* tables when the org model is not migrated yet.
 * Live Supabase (taenbelgzntolqzzjsee) has restaurants/bookings/customers/tables
 * but no organizations / get_dashboard / host RPCs.
 */
import { supabase } from "@/integrations/supabase/client";

export function isMissingDbObject(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message ?? "").toLowerCase();
  return (
    err.code === "PGRST202" ||
    err.code === "PGRST205" ||
    err.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the")
  );
}

/** Current user's restaurant_id from v2_users (RLS-scoped). */
export async function resolveRestaurantId(preferred?: string | null): Promise<string | null> {
  if (preferred) return preferred;
  const { data } = await supabase
    .from("v2_users")
    .select("restaurant_id")
    .limit(1)
    .maybeSingle();
  return data?.restaurant_id ?? null;
}

export type LegacyBookingRow = {
  id: string;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  party_size: number;
  date: string;
  time: string;
  table_number: string | null;
  status: string;
  source: string;
  notes: string | null;
  restaurant_id: string;
  customer_id: string | null;
};

/** Normalize legacy booking → org reservation shape used by UI. */
export function mapLegacyBooking(b: LegacyBookingRow | Record<string, unknown>) {
  const row = b as Record<string, unknown>;
  return {
    id: String(row.id),
    guest_name: (row.guest_name as string | null) ?? "",
    guest_phone: (row.guest_phone as string | null) ?? null,
    guest_email: (row.guest_email as string | null) ?? null,
    party_size: Number(row.party_size ?? 0),
    reserved_date: String(row.date ?? row.booking_date ?? ""),
    reserved_time: String(row.time ?? row.booking_time ?? ""),
    table_id: null as string | null,
    table_number: (row.table_number as string | null) ?? null,
    status: String(row.status ?? "confirmed"),
    source: String(row.source ?? "manual"),
    notes: (row.notes as string | null) ?? null,
    guest_id: (row.customer_id as string | null) ?? null,
    organization_id: null as string | null,
    location_id: null as string | null,
  };
}
