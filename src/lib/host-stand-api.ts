import { supabase } from "@/integrations/supabase/client";
import {
  hostSeatSchema,
  hostSetTableStatusSchema,
  hostUnseatSchema,
  hostWalkInSchema,
  type HostSeatInput,
  type HostSetTableStatusInput,
  type HostUnseatInput,
  type HostWalkInInput,
} from "@/lib/schemas/host-stand";

export type HostFloorTable = {
  id: string;
  table_number: string;
  section: string | null;
  capacity: number;
  shape: "round" | "square" | "rectangle";
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  status: "available" | "occupied" | "reserved" | "cleaning" | "blocked";
  current_reservation_id: string | null;
  sort_order: number;
};

export type HostFloorReservation = {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  party_size: number;
  reserved_date: string;
  reserved_time: string;
  duration_minutes: number;
  section: string | null;
  table_id: string | null;
  table_number: string | null;
  status: "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
  source: string;
  notes: string | null;
};

export async function hostListFloor(
  organizationId: string,
  locationId: string,
  date: string,
) {
  const { data, error } = await (supabase as any).rpc("app_host_list_floor", {
    _organization_id: organizationId,
    _location_id: locationId,
    _date: date,
  });
  if (error) return { ok: false as const, error: error.message, missing: true };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return {
    ok: true as const,
    date: data.date as string,
    tables: (data.tables ?? []) as HostFloorTable[],
    reservations: (data.reservations ?? []) as HostFloorReservation[],
  };
}

export async function hostSeat(input: HostSeatInput) {
  const parsed = hostSeatSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  }
  const { data, error } = await (supabase as any).rpc("app_host_seat", {
    _organization_id: parsed.data.organization_id,
    _reservation_id: parsed.data.reservation_id,
    _table_id: parsed.data.table_id,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return {
    ok: true as const,
    reservation_id: data.reservation_id as string,
    table_id: data.table_id as string,
    table_number: data.table_number as string,
  };
}

export async function hostUnseat(input: HostUnseatInput) {
  const parsed = hostUnseatSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  }
  const { data, error } = await (supabase as any).rpc("app_host_unseat", {
    _organization_id: parsed.data.organization_id,
    _reservation_id: parsed.data.reservation_id,
    _complete: parsed.data.complete ?? false,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return { ok: true as const, completed: Boolean(data.completed) };
}

export async function hostSetTableStatus(input: HostSetTableStatusInput) {
  const parsed = hostSetTableStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  }
  const { data, error } = await (supabase as any).rpc("app_host_set_table_status", {
    _organization_id: parsed.data.organization_id,
    _table_id: parsed.data.table_id,
    _status: parsed.data.status,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return { ok: true as const, status: data.status as string };
}

export async function hostCreateWalkIn(input: HostWalkInInput) {
  const parsed = hostWalkInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  }
  const p = parsed.data;
  const { data, error } = await (supabase as any).rpc("app_create_walk_in", {
    _organization_id: p.organization_id,
    _location_id: p.location_id,
    _guest_name: p.guest_name,
    _party_size: p.party_size,
    _table_number: p.table_number ?? null,
    _notes: p.notes ?? null,
    _table_id: p.table_id ?? null,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Failed" };
  return {
    ok: true as const,
    reservation_id: data.reservation_id as string,
    table_id: (data.table_id as string | null) ?? null,
  };
}

/** Local calendar date YYYY-MM-DD (Host Stand / bookings convention). */
export function localDateISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTimeLabel(t: string): string {
  const raw = (t ?? "").slice(0, 5);
  const [hStr, mStr] = raw.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return raw || "—";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function isLunchTime(t: string): boolean {
  const h = Number((t ?? "").slice(0, 2));
  return Number.isFinite(h) && h < 16;
}
