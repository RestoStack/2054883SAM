import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ensureSeedServers,
  verifyPin,
  newSessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireServerSession,
  requireAdminSession,
  readSessionCookie,
} from "./server-auth.server";

// ============================================================
// AUTH
// ============================================================

export const listServersFn = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeedServers();
  const { data, error } = await supabaseAdmin
    .from("servers")
    .select("id, name, color, role")
    .eq("active", true)
    .order("role", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

const LoginSchema = z.object({
  serverId: z.string().uuid(),
  pin: z.string().min(4).max(8).regex(/^\d+$/),
});

export const loginWithPinFn = createServerFn({ method: "POST" })
  .inputValidator((d) => LoginSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: srv, error } = await supabaseAdmin
      .from("servers")
      .select("id, name, role, color, pin_hash, pin_salt, active, locked_until, failed_attempts")
      .eq("id", data.serverId)
      .maybeSingle();
    if (error || !srv) throw new Error("Invalid PIN");
    if (!srv.active) throw new Error("Account disabled");
    if (srv.locked_until && new Date(srv.locked_until) > new Date()) {
      throw new Error("Too many attempts. Try again in a few minutes.");
    }

    const ok = await verifyPin(data.pin, srv.pin_hash, srv.pin_salt);
    if (!ok) {
      const attempts = (srv.failed_attempts ?? 0) + 1;
      const lock = attempts >= 5 ? new Date(Date.now() + 5 * 60_000).toISOString() : null;
      await supabaseAdmin
        .from("servers")
        .update({
          failed_attempts: lock ? 0 : attempts,
          locked_until: lock,
        })
        .eq("id", srv.id);
      throw new Error("Invalid PIN");
    }

    // reset counters
    await supabaseAdmin
      .from("servers")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("id", srv.id);

    const token = newSessionToken();
    const expires = new Date(Date.now() + 12 * 60 * 60_000).toISOString();
    const { error: sessErr } = await supabaseAdmin.from("server_sessions").insert({
      token,
      server_id: srv.id,
      expires_at: expires,
    });
    if (sessErr) throw new Error(sessErr.message);

    // ensure an open shift exists
    const { data: openShift } = await supabaseAdmin
      .from("shifts")
      .select("id")
      .eq("server_id", srv.id)
      .is("clock_out_at", null)
      .maybeSingle();
    if (!openShift) {
      await supabaseAdmin.from("shifts").insert({ server_id: srv.id });
    }

    setSessionCookie(token);
    return { id: srv.id, name: srv.name, role: srv.role, color: srv.color };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const token = readSessionCookie();
  if (token) {
    await supabaseAdmin.from("server_sessions").delete().eq("token", token);
  }
  clearSessionCookie();
  return { ok: true };
});

export const meFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const me = await requireServerSession();
    return me;
  } catch {
    return null;
  }
});

export const clockOutFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ tipsCents: z.number().int().min(0).default(0) }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireServerSession();
    await supabaseAdmin
      .from("shifts")
      .update({ clock_out_at: new Date().toISOString(), tips_cents: data.tipsCents })
      .eq("server_id", me.id)
      .is("clock_out_at", null);
    return { ok: true };
  });

// ============================================================
// ORDERS
// ============================================================

const SendOrderSchema = z.object({
  tableNumber: z.number().int().positive(),
  partySize: z.number().int().min(1).max(20),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        category: z.string().max(40).optional(),
        priceCents: z.number().int().min(0),
        qty: z.number().int().min(1).max(20),
        guestIndex: z.number().int().min(1).max(20),
        wasUpsell: z.boolean().default(false),
      })
    )
    .min(1)
    .max(200),
});

export const sendOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d) => SendOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireServerSession();
    const total = data.items.reduce((s, i) => s + i.priceCents * i.qty, 0);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        server_id: me.id,
        table_number: data.tableNumber,
        party_size: data.partySize,
        total_cents: total,
      })
      .select("id")
      .single();
    if (error || !order) throw new Error(error?.message ?? "Failed to save order");

    const itemRows = data.items.map((i) => ({
      order_id: order.id,
      server_id: me.id,
      item_name: i.name,
      category: i.category ?? null,
      price_cents: i.priceCents,
      qty: i.qty,
      guest_index: i.guestIndex,
      was_upsell: i.wasUpsell,
    }));
    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(itemRows);
    if (itemsErr) throw new Error(itemsErr.message);

    return { ok: true, orderId: order.id };
  });

export const logUpsellFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accepted: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireServerSession();
    await supabaseAdmin.from("upsell_events").insert({
      server_id: me.id,
      accepted: data.accepted,
    });
    return { ok: true };
  });

// ============================================================
// STATS
// ============================================================

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfWeekISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // monday=0
  d.setDate(d.getDate() - day);
  return d.toISOString();
}

async function statsForServer(serverId: string) {
  const [todayStart, weekStart] = [startOfTodayISO(), startOfWeekISO()];

  const [ordersToday, ordersWeek, itemsToday, upsells, ratings, openShift] =
    await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id, total_cents, table_number", { count: "exact" })
        .eq("server_id", serverId)
        .gte("sent_at", todayStart),
      supabaseAdmin
        .from("orders")
        .select("id, total_cents", { count: "exact" })
        .eq("server_id", serverId)
        .gte("sent_at", weekStart),
      supabaseAdmin
        .from("order_items")
        .select("qty", { count: "exact" })
        .eq("server_id", serverId)
        .gte("sent_at", todayStart),
      supabaseAdmin
        .from("upsell_events")
        .select("accepted")
        .eq("server_id", serverId)
        .gte("shown_at", todayStart),
      supabaseAdmin
        .from("table_ratings")
        .select("rating")
        .eq("server_id", serverId)
        .gte("created_at", weekStart),
      supabaseAdmin
        .from("shifts")
        .select("clock_in_at, clock_out_at, tips_cents")
        .eq("server_id", serverId)
        .order("clock_in_at", { ascending: false })
        .limit(20),
    ]);

  const todayOrders = ordersToday.data ?? [];
  const tablesToday = new Set(todayOrders.map((o) => o.table_number)).size;
  const salesTodayCents = todayOrders.reduce((s, o) => s + o.total_cents, 0);
  const salesWeekCents = (ordersWeek.data ?? []).reduce((s, o) => s + o.total_cents, 0);
  const itemsTodayCount = (itemsToday.data ?? []).reduce((s, r) => s + r.qty, 0);

  const ups = upsells.data ?? [];
  const upsellShown = ups.length;
  const upsellAccepted = ups.filter((u) => u.accepted).length;
  const upsellRate = upsellShown === 0 ? null : upsellAccepted / upsellShown;

  const rs = ratings.data ?? [];
  const avgRating = rs.length === 0 ? null : rs.reduce((s, r) => s + r.rating, 0) / rs.length;

  const shifts = openShift.data ?? [];
  const open = shifts.find((s) => !s.clock_out_at);
  const now = Date.now();
  const shiftMs = open ? now - new Date(open.clock_in_at).getTime() : 0;

  // hours this week from all shifts whose clock_in_at is in this week
  const weekShifts = shifts.filter((s) => new Date(s.clock_in_at) >= new Date(weekStart));
  const weekMs = weekShifts.reduce((s, sh) => {
    const start = new Date(sh.clock_in_at).getTime();
    const end = sh.clock_out_at ? new Date(sh.clock_out_at).getTime() : now;
    return s + Math.max(0, end - start);
  }, 0);

  const tipsTodayCents = shifts
    .filter((s) => new Date(s.clock_in_at) >= new Date(todayStart))
    .reduce((s, sh) => s + (sh.tips_cents ?? 0), 0);

  return {
    tablesToday,
    ordersToday: ordersToday.count ?? todayOrders.length,
    ordersWeek: ordersWeek.count ?? 0,
    itemsToday: itemsTodayCount,
    salesTodayCents,
    salesWeekCents,
    upsellRate,
    upsellShown,
    upsellAccepted,
    avgRating,
    ratingsCount: rs.length,
    tipsTodayCents,
    shiftSeconds: Math.floor(shiftMs / 1000),
    weekSeconds: Math.floor(weekMs / 1000),
    clockedIn: !!open,
  };
}

export const myStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  const me = await requireServerSession();
  const stats = await statsForServer(me.id);
  return { server: me, stats };
});

export const leaderboardFn = createServerFn({ method: "GET" }).handler(async () => {
  const { data: servers, error } = await supabaseAdmin
    .from("servers")
    .select("id, name, color, role")
    .eq("active", true)
    .eq("role", "server");
  if (error) throw new Error(error.message);

  const rows = await Promise.all(
    (servers ?? []).map(async (s) => ({
      ...s,
      stats: await statsForServer(s.id),
    }))
  );

  rows.sort((a, b) => b.stats.salesWeekCents - a.stats.salesWeekCents);
  return rows;
});
