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
import {
  isMissingDbObject,
  mapLegacyBooking,
  resolveRestaurantId,
  type LegacyBookingRow,
} from "@/lib/legacy-tenant";

export type HostFloorTable = {
  id: string;
  table_number: string;
  section: string | null;
  capacity: number;
  capacity_min?: number;
  capacity_max?: number;
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
  organizationId: string | null,
  locationId: string | null,
  date: string,
  restaurantId?: string | null,
) {
  if (organizationId && locationId) {
    const { data, error } = await (supabase as any).rpc("app_host_list_floor", {
      _organization_id: organizationId,
      _location_id: locationId,
      _date: date,
    });
    if (!error && data?.ok) {
      return {
        ok: true as const,
        date: data.date as string,
        tables: (data.tables ?? []) as HostFloorTable[],
        reservations: (data.reservations ?? []) as HostFloorReservation[],
      };
    }
    if (error && !isMissingDbObject(error)) {
      return { ok: false as const, error: error.message, missing: false };
    }
  }

  const rid = await resolveRestaurantId(restaurantId);
  if (!rid) {
    return { ok: false as const, error: "No restaurant context", missing: true };
  }

  const [{ data: tablesRaw, error: tErr }, { data: bookingsRaw, error: bErr }] =
    await Promise.all([
      (supabase as any)
        .from("v2_tables")
        .select(
          "id, table_number, section, capacity, capacity_min, capacity_max, shape, position_x, position_y, width, height, status, current_booking_id, sort_order",
        )
        .eq("restaurant_id", rid)
        .order("sort_order"),
      (supabase as any)
        .from("v2_bookings")
        .select(
          "id, guest_name, guest_phone, guest_email, party_size, date, time, duration_minutes, section, table_number, status, source, notes, customer_id",
        )
        .eq("restaurant_id", rid)
        .eq("date", date)
        .order("time"),
    ]);

  if (tErr && !isMissingDbObject(tErr)) {
    return { ok: false as const, error: tErr.message, missing: false };
  }
  if (bErr && !isMissingDbObject(bErr)) {
    return { ok: false as const, error: bErr.message, missing: false };
  }

  const reservations = ((bookingsRaw ?? []) as LegacyBookingRow[]).map((b) => {
    const m = mapLegacyBooking(b);
    return {
      id: m.id,
      guest_name: m.guest_name,
      guest_phone: m.guest_phone,
      guest_email: m.guest_email,
      party_size: m.party_size,
      reserved_date: m.reserved_date,
      reserved_time: m.reserved_time,
      duration_minutes: Number((b as Record<string, unknown>).duration_minutes ?? 90),
      section: ((b as Record<string, unknown>).section as string | null) ?? null,
      table_id: null as string | null,
      table_number: m.table_number,
      status: m.status as HostFloorReservation["status"],
      source: m.source,
      notes: m.notes,
    };
  });

  const tables: HostFloorTable[] = ((tablesRaw ?? []) as Array<Record<string, unknown>>).map(
    (t, i) => {
      const tnum = String(t.table_number ?? "");
      const seated = reservations.find(
        (r) =>
          r.table_number === tnum &&
          (r.status === "seated" || r.status === "confirmed" || r.status === "pending"),
      );
      const statusRaw = String(t.status ?? "available");
      let status: HostFloorTable["status"] = "available";
      if (statusRaw === "occupied" || seated?.status === "seated") status = "occupied";
      else if (statusRaw === "reserved" || seated) status = "reserved";
      else if (statusRaw === "cleaning" || statusRaw === "blocked") status = statusRaw;
      return {
        id: String(t.id),
        table_number: tnum,
        section: (t.section as string | null) ?? null,
        capacity: Number(t.capacity ?? t.capacity_max ?? 4),
        capacity_min: t.capacity_min != null ? Number(t.capacity_min) : undefined,
        capacity_max: t.capacity_max != null ? Number(t.capacity_max) : undefined,
        shape: (t.shape as HostFloorTable["shape"]) ?? "square",
        position_x: t.position_x != null ? Number(t.position_x) : null,
        position_y: t.position_y != null ? Number(t.position_y) : null,
        width: t.width != null ? Number(t.width) : null,
        height: t.height != null ? Number(t.height) : null,
        status,
        current_reservation_id: seated?.id ?? (t.current_booking_id as string | null) ?? null,
        sort_order: Number(t.sort_order ?? i),
      };
    },
  );

  return { ok: true as const, date, tables, reservations };
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
  if (!error && data?.ok) {
    return {
      ok: true as const,
      reservation_id: data.reservation_id as string,
      table_id: data.table_id as string,
      table_number: data.table_number as string,
    };
  }
  if (error && !isMissingDbObject(error)) {
    return { ok: false as const, error: error.message };
  }

  // Legacy: mark booking seated + set table_number from v2_tables
  let tableNumber: string | null = null;
  const { data: table } = await (supabase as any)
    .from("v2_tables")
    .select("table_number")
    .eq("id", parsed.data.table_id)
    .maybeSingle();
  tableNumber = table?.table_number ? String(table.table_number) : null;

  const { error: updErr } = await (supabase as any)
    .from("v2_bookings")
    .update({ status: "seated", table_number: tableNumber })
    .eq("id", parsed.data.reservation_id);
  if (updErr) return { ok: false as const, error: updErr.message };

  if (parsed.data.table_id) {
    await (supabase as any)
      .from("v2_tables")
      .update({ status: "occupied", current_booking_id: parsed.data.reservation_id })
      .eq("id", parsed.data.table_id);
  }

  return {
    ok: true as const,
    reservation_id: parsed.data.reservation_id,
    table_id: parsed.data.table_id,
    table_number: tableNumber ?? "",
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
  if (!error && data?.ok) {
    return { ok: true as const, completed: Boolean(data.completed) };
  }
  if (error && !isMissingDbObject(error)) {
    return { ok: false as const, error: error.message };
  }

  const complete = parsed.data.complete ?? false;
  const { data: booking } = await (supabase as any)
    .from("v2_bookings")
    .select("table_number")
    .eq("id", parsed.data.reservation_id)
    .maybeSingle();

  const { error: updErr } = await (supabase as any)
    .from("v2_bookings")
    .update({ status: complete ? "completed" : "confirmed" })
    .eq("id", parsed.data.reservation_id);
  if (updErr) return { ok: false as const, error: updErr.message };

  if (booking?.table_number) {
    await (supabase as any)
      .from("v2_tables")
      .update({ status: "available", current_booking_id: null })
      .eq("table_number", booking.table_number);
  }

  return { ok: true as const, completed: complete };
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
  if (!error && data?.ok) {
    return { ok: true as const, status: data.status as string };
  }
  if (error && !isMissingDbObject(error)) {
    return { ok: false as const, error: error.message };
  }

  const { error: updErr } = await (supabase as any)
    .from("v2_tables")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.table_id);
  if (updErr) return { ok: false as const, error: updErr.message };
  return { ok: true as const, status: parsed.data.status };
}

export async function hostCreateWalkIn(input: HostWalkInInput & { restaurant_id?: string | null }) {
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
  if (!error && data?.ok) {
    return {
      ok: true as const,
      reservation_id: data.reservation_id as string,
      table_id: (data.table_id as string | null) ?? null,
    };
  }
  if (error && !isMissingDbObject(error)) {
    return { ok: false as const, error: error.message };
  }

  const rid = await resolveRestaurantId(input.restaurant_id);
  if (!rid) return { ok: false as const, error: "No restaurant context" };

  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;

  const { data: row, error: insErr } = await (supabase as any)
    .from("v2_bookings")
    .insert({
      restaurant_id: rid,
      guest_name: p.guest_name,
      party_size: p.party_size,
      date,
      time,
      status: p.table_id || p.table_number ? "seated" : "confirmed",
      source: "walk_in",
      notes: p.notes ?? null,
      table_number: p.table_number ?? null,
    })
    .select("id")
    .single();
  if (insErr) return { ok: false as const, error: insErr.message };

  if (p.table_id) {
    await (supabase as any)
      .from("v2_tables")
      .update({ status: "occupied", current_booking_id: row.id })
      .eq("id", p.table_id);
  }

  return {
    ok: true as const,
    reservation_id: String(row.id),
    table_id: p.table_id ?? null,
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
