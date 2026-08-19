import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const slugify = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Calendar date in the user's local timezone (YYYY-MM-DD). Never use UTC for booking days. */
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @deprecated Prefer localDateISO — kept as alias so existing call sites stay correct. */
const todayISO = () => localDateISO();

const fmtTime12 = (t: string | null | undefined) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const hr12 = hh % 12 || 12;
  return `${hr12}:${m} ${ampm}`;
};

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

// ============ BOOKINGS ============
export type BookingStatus = "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";

/** Embedded in booking notes until a dedicated column ships. */
const SERVER_TAG_RE = /<!--rs-server:([0-9a-f-]{36})-->/i;

export function parseAssignedServerId(notes: string | null | undefined): string | null {
  const m = (notes || "").match(SERVER_TAG_RE);
  return m?.[1] ?? null;
}

export function stripServerTag(notes: string | null | undefined): string {
  return (notes || "").replace(SERVER_TAG_RE, "").trim();
}

export function withAssignedServerId(
  notes: string | null | undefined,
  serverId: string | null,
): string {
  const base = stripServerTag(notes);
  if (!serverId) return base;
  return `${base}${base ? "\n" : ""}<!--rs-server:${serverId}-->`;
}

export type BookingRow = {
  id: string;
  customerId: string | null;
  date: string;
  time: string;
  rawTime: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  people: number;
  table: string;
  tableNumber: string | null;
  area: string;
  status: BookingStatus;
  visits: string;
  last: string;
  notes: string;
  /** Notes without internal tags (safe for UI). */
  displayNotes: string;
  assignedServerId: string | null;
  slug: string;
};

function mapBookingRow(
  b: any,
  customerMeta?: { visits?: number | null; last?: string | null } | null,
): BookingRow {
  const rawNotes = b.notes ?? "";
  const visits =
    customerMeta?.visits != null && customerMeta.visits > 0
      ? String(customerMeta.visits)
      : "—";
  return {
    id: b.id,
    customerId: b.customer_id ?? null,
    date: b.date,
    rawTime: b.time,
    time: fmtTime12(b.time),
    name: b.guest_name ?? "Guest",
    phone: b.guest_phone ?? "",
    email: b.guest_email ?? "",
    source: b.source ?? "walk_in",
    people: b.party_size ?? 2,
    table: b.table_number ? `Table ${b.table_number}` : "—",
    tableNumber: b.table_number ?? null,
    area: b.section ?? "—",
    status: (b.status ?? "pending") as BookingStatus,
    visits,
    last: customerMeta?.last ? String(customerMeta.last).slice(0, 10) : "",
    notes: rawNotes,
    displayNotes: stripServerTag(rawNotes),
    assignedServerId: parseAssignedServerId(rawNotes),
    slug: slugify(b.guest_name ?? ""),
  };
}

export function useBookings(dateFilter?: string | { from: string; to: string }) {
  const key =
    !dateFilter
      ? "all"
      : typeof dateFilter === "string"
        ? dateFilter
        : `${dateFilter.from}:${dateFilter.to}`;
  return useQuery({
    queryKey: ["v2_bookings", key],
    queryFn: async (): Promise<BookingRow[]> => {
      let q = supabase
        .from("v2_bookings")
        .select("*")
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (typeof dateFilter === "string") {
        q = q.eq("date", dateFilter);
      } else if (dateFilter) {
        q = q.gte("date", dateFilter.from).lte("date", dateFilter.to);
      }
      const { data, error } = await q;
      if (error) throw error;
      const rows = data ?? [];
      const customerIds = [
        ...new Set(rows.map((b: any) => b.customer_id).filter(Boolean) as string[]),
      ];
      const metaById: Record<string, { visits: number; last: string | null }> = {};
      if (customerIds.length) {
        const { data: customers } = await supabase
          .from("v2_customers")
          .select("id, visit_count, last_visit")
          .in("id", customerIds);
        for (const c of customers ?? []) {
          metaById[c.id] = {
            visits: c.visit_count ?? 0,
            last: c.last_visit ?? null,
          };
        }
      }
      return rows.map((b: any) =>
        mapBookingRow(b, b.customer_id ? metaById[b.customer_id] : null),
      );
    },
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

// ============ BOOKING MUTATIONS ============
export type NewBookingInput = {
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
  party_size: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  section?: string | null;
  table_number?: string | null;
  notes?: string;
  source?: "walk_in" | "phone" | "online" | "app";
};

async function getCurrentRestaurantId(): Promise<string> {
  const { data, error } = await supabase.rpc("v2_current_restaurant_id");
  if (error) throw error;
  return data as unknown as string;
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewBookingInput) => {
      const restaurant_id = await getCurrentRestaurantId();
      // Upsert-lite customer by email or phone
      let customer_id: string | null = null;
      if (input.guest_email || input.guest_phone) {
        const { data: existing } = await supabase
          .from("v2_customers")
          .select("id")
          .eq("restaurant_id", restaurant_id)
          .or(
            [
              input.guest_email ? `email.eq.${input.guest_email}` : null,
              input.guest_phone ? `phone.eq.${input.guest_phone}` : null,
            ]
              .filter(Boolean)
              .join(","),
          )
          .maybeSingle();
        if (existing?.id) {
          customer_id = existing.id;
          // Keep the stored profile name in sync with the latest booking name.
          const { error: uerr } = await supabase
            .from("v2_customers")
            .update({
              full_name: input.guest_name,
              ...(input.guest_email ? { email: input.guest_email } : {}),
              ...(input.guest_phone ? { phone: input.guest_phone } : {}),
            })
            .eq("id", existing.id);
          if (uerr) throw uerr;
        }
      }
      if (!customer_id) {
        const { data: created, error: cerr } = await supabase
          .from("v2_customers")
          .insert({
            restaurant_id,
            full_name: input.guest_name,
            email: input.guest_email || null,
            phone: input.guest_phone || null,
          })
          .select("id")
          .single();
        if (cerr) throw cerr;
        customer_id = created!.id;
      }

      const { error } = await supabase.from("v2_bookings").insert({
        restaurant_id,
        customer_id,
        guest_name: input.guest_name,
        guest_phone: input.guest_phone || null,
        guest_email: input.guest_email || null,
        party_size: input.party_size,
        date: input.date,
        time: input.time,
        section: input.section || null,
        table_number: input.table_number || null,
        status: "confirmed",
        source: input.source ?? "phone",
        notes: input.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2_bookings"] });
      qc.invalidateQueries({ queryKey: ["v2_dashboard_stats"] });
      qc.invalidateQueries({ queryKey: ["v2_last7_metrics"] });
    },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status?: BookingStatus;
      table_number?: string | null;
      section?: string | null;
      guest_name?: string;
      guest_phone?: string | null;
      party_size?: number;
      time?: string;
      notes?: string | null;
      date?: string;
      /** Set / clear FoH server assignment (stored in notes tag). */
      assignedServerId?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.status) patch.status = input.status;
      if (input.table_number !== undefined) patch.table_number = input.table_number;
      if (input.section !== undefined) patch.section = input.section;
      if (input.guest_name !== undefined) patch.guest_name = input.guest_name;
      if (input.guest_phone !== undefined) patch.guest_phone = input.guest_phone;
      if (input.party_size !== undefined) patch.party_size = input.party_size;
      if (input.time !== undefined) patch.time = input.time;
      if (input.date !== undefined) patch.date = input.date;

      if (input.assignedServerId !== undefined || input.notes !== undefined) {
        let baseNotes = input.notes;
        if (baseNotes === undefined || input.assignedServerId !== undefined) {
          const { data: existing, error: readErr } = await supabase
            .from("v2_bookings")
            .select("notes")
            .eq("id", input.id)
            .maybeSingle();
          if (readErr) throw readErr;
          baseNotes = existing?.notes ?? "";
        }
        if (input.notes !== undefined && input.assignedServerId === undefined) {
          // Preserve existing server tag when editing guest-facing notes.
          const serverId = parseAssignedServerId(baseNotes);
          patch.notes = withAssignedServerId(input.notes, serverId);
        } else if (input.assignedServerId !== undefined) {
          const guestNotes =
            input.notes !== undefined ? input.notes : stripServerTag(baseNotes);
          patch.notes = withAssignedServerId(guestNotes, input.assignedServerId);
        }
      }

      const { error } = await supabase
        .from("v2_bookings")
        .update(patch as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2_bookings"] });
      qc.invalidateQueries({ queryKey: ["v2_dashboard_stats"] });
      qc.invalidateQueries({ queryKey: ["v2_last7_metrics"] });
    },
  });
}

// ============ CUSTOMERS ============
export type CustomerRow = {
  id: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  visits: number;
  spent: string;
  spentRaw: number;
  points: number;
  tag: "VIP" | "Frequent" | "New";
  notes: string;
};

function mapCustomer(c: any): CustomerRow {
  const visits = c.visit_count ?? 0;
  const spent = Number(c.total_spent ?? 0);
  const tag: CustomerRow["tag"] =
    spent >= 1000 || visits >= 10 ? "VIP" : visits >= 3 ? "Frequent" : "New";
  return {
    id: c.id,
    slug: slugify(c.full_name ?? c.id),
    name: c.full_name ?? "Guest",
    email: c.email ?? "",
    phone: c.phone ?? "",
    visits,
    spent: fmtMoney(spent),
    spentRaw: spent,
    points: c.loyalty_points ?? 0,
    tag,
    notes: c.notes ?? "",
  };
}

export function useCustomers() {
  return useQuery({
    queryKey: ["v2_customers"],
    queryFn: async (): Promise<CustomerRow[]> => {
      const { data, error } = await supabase
        .from("v2_customers")
        .select("*")
        .order("total_spent", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapCustomer);
    },
  });
}

/** Resolve a customer by UUID or name slug. */
export function useCustomer(idOrSlug: string) {
  return useQuery({
    queryKey: ["v2_customer", idOrSlug],
    enabled: !!idOrSlug,
    queryFn: async (): Promise<CustomerRow | null> => {
      const looksLikeUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

      if (looksLikeUuid) {
        const { data, error } = await supabase
          .from("v2_customers")
          .select("*")
          .eq("id", idOrSlug)
          .maybeSingle();
        if (error) throw error;
        return data ? mapCustomer(data) : null;
      }

      const { data, error } = await supabase.from("v2_customers").select("*");
      if (error) throw error;
      const match = (data ?? []).find((c: any) => slugify(c.full_name ?? "") === idOrSlug);
      return match ? mapCustomer(match) : null;
    },
  });
}

export function useCustomerBookings(customerId: string | undefined) {
  return useQuery({
    queryKey: ["v2_bookings", "customer", customerId ?? "none"],
    enabled: !!customerId,
    queryFn: async (): Promise<BookingRow[]> => {
      const { data, error } = await supabase
        .from("v2_bookings")
        .select("*")
        .eq("customer_id", customerId!)
        .order("date", { ascending: false })
        .order("time", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((b: any) => mapBookingRow(b));
    },
  });
}

// ============ MENU ============
export type MenuItemRow = {
  id: string;
  name: string;
  cat: string;
  desc: string;
  price: string;
  priceRaw: number;
  available: boolean;
  popular: boolean;
};

export function useMenu() {
  return useQuery({
    queryKey: ["v2_menu"],
    queryFn: async () => {
      const [catsRes, itemsRes] = await Promise.all([
        supabase.from("v2_menu_categories").select("*").order("sort_order"),
        supabase.from("v2_menu_items").select("*").order("name"),
      ]);
      if (catsRes.error) throw catsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      const cats = catsRes.data ?? [];
      const items: MenuItemRow[] = (itemsRes.data ?? []).map((it: any) => ({
        id: it.id,
        name: it.name,
        cat: cats.find((c: any) => c.id === it.category_id)?.name ?? "Other",
        desc: it.description ?? "",
        price: fmtMoney(Number(it.price ?? 0)),
        priceRaw: Number(it.price ?? 0),
        available: it.is_available ?? true,
        popular: it.is_popular ?? false,
      }));
      const categories = ["All", ...cats.map((c: any) => c.name)];
      return { items, categories };
    },
  });
}

// ============ TABLES ============
export function useTables() {
  return useQuery({
    queryKey: ["v2_tables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v2_tables")
        .select("*")
        .order("table_number");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ============ DASHBOARD METRICS ============
export function useDashboardStats() {
  const today = localDateISO();
  return useQuery({
    queryKey: ["v2_dashboard_stats", today],
    queryFn: async () => {
      const [bookingsRes, ordersRes, customersRes] = await Promise.all([
        supabase.from("v2_bookings").select("party_size,status").eq("date", today),
        supabase
          .from("v2_orders")
          .select("total,status,created_at")
          .gte("created_at", `${today}T00:00:00`),
        supabase.from("v2_customers").select("id", { count: "exact", head: true }),
      ]);

      const bks = bookingsRes.data ?? [];
      const ods = ordersRes.data ?? [];

      const totalBookings = bks.length;
      const cancellations = bks.filter((b: any) => b.status === "cancelled").length;
      const noshows = bks.filter((b: any) => b.status === "no_show").length;
      const seated = bks.filter((b: any) => b.status === "seated" || b.status === "completed").length;
      const upcoming = bks.filter((b: any) => b.status === "pending" || b.status === "confirmed").length;
      const covers = bks.reduce((sum: number, b: any) => sum + (b.party_size ?? 0), 0);

      const openOrders = ods.filter((o: any) => o.status !== "closed" && o.status !== "paid").length;
      const revenue = ods.reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
      const avgTicket = ods.length ? revenue / ods.length : 0;

      return {
        totalBookings,
        cancellations,
        noshows,
        seated,
        upcoming,
        covers,
        openOrders,
        revenue,
        avgTicket,
        customerCount: customersRes.count ?? 0,
      };
    },
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

// ============ ORDERS ============
export type OrderRow = {
  id: string;
  shortId: string;
  customer: string;
  customerId: string | null;
  items: number;
  type: string;
  table: string;
  total: string;
  totalRaw: number;
  status: string;
  statusRaw: string;
  time: string;
  createdAt: string;
};

const orderStatusLabel = (s: string) => {
  switch (s) {
    case "open":
      return "Open";
    case "sent":
      return "Preparing";
    case "ready":
      return "Ready";
    case "delivered":
      return "Served";
    case "closed":
      return "Paid";
    case "voided":
      return "Cancelled";
    default:
      return s;
  }
};

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

export function useOrders() {
  return useQuery({
    queryKey: ["v2_orders"],
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("v2_orders")
        .select("id, customer_id, status, total, created_at, table_id, party_size")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const rows = data ?? [];
      const customerIds = [...new Set(rows.map((o: any) => o.customer_id).filter(Boolean))];
      const tableIds = [...new Set(rows.map((o: any) => o.table_id).filter(Boolean))];
      const ids = rows.map((o: any) => o.id);

      const [custRes, tableRes, itemsRes] = await Promise.all([
        customerIds.length
          ? supabase.from("v2_customers").select("id, full_name").in("id", customerIds)
          : Promise.resolve({ data: [] as any[] }),
        tableIds.length
          ? supabase.from("v2_tables").select("id, table_number").in("id", tableIds)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("v2_order_items").select("order_id, quantity").in("order_id", ids)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const customerNames = Object.fromEntries((custRes.data ?? []).map((c: any) => [c.id, c.full_name]));
      const tableNums = Object.fromEntries((tableRes.data ?? []).map((t: any) => [t.id, t.table_number]));
      const itemCounts: Record<string, number> = {};
      for (const it of itemsRes.data ?? []) {
        itemCounts[it.order_id] = (itemCounts[it.order_id] ?? 0) + (it.quantity ?? 1);
      }

      return rows.map((o: any) => ({
        id: o.id,
        shortId: `#${String(o.id).slice(0, 8).toUpperCase()}`,
        customer: (o.customer_id && customerNames[o.customer_id]) || "Guest",
        customerId: o.customer_id ?? null,
        items: itemCounts[o.id] ?? 0,
        type: "Dine In",
        table: o.table_id && tableNums[o.table_id] != null ? `Table ${tableNums[o.table_id]}` : "—",
        total: fmtMoney(Number(o.total ?? 0)),
        totalRaw: Number(o.total ?? 0),
        status: orderStatusLabel(o.status ?? "open"),
        statusRaw: o.status ?? "open",
        time: relativeTime(o.created_at),
        createdAt: o.created_at,
      }));
    },
  });
}

export function useCustomerOrders(customerId: string | undefined) {
  return useQuery({
    queryKey: ["v2_orders", "customer", customerId ?? "none"],
    enabled: !!customerId,
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("v2_orders")
        .select("id, customer_id, status, total, created_at, table_id")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const tableIds = [...new Set((data ?? []).map((o: any) => o.table_id).filter(Boolean))];
      const { data: tables } = tableIds.length
        ? await supabase.from("v2_tables").select("id, table_number").in("id", tableIds)
        : { data: [] as any[] };
      const tableNums = Object.fromEntries((tables ?? []).map((t: any) => [t.id, t.table_number]));
      return (data ?? []).map((o: any) => ({
        id: o.id,
        shortId: `#${String(o.id).slice(0, 8).toUpperCase()}`,
        customer: "Guest",
        customerId: o.customer_id ?? null,
        items: 0,
        type: "Dine In",
        table: o.table_id && tableNums[o.table_id] != null ? `Table ${tableNums[o.table_id]}` : "—",
        total: fmtMoney(Number(o.total ?? 0)),
        totalRaw: Number(o.total ?? 0),
        status: orderStatusLabel(o.status ?? "open"),
        statusRaw: o.status ?? "open",
        time: relativeTime(o.created_at),
        createdAt: o.created_at,
      }));
    },
  });
}

// ============ STAFF ============
export type StaffRow = {
  id: string;
  name: string;
  role: string;
  email: string;
  active: boolean;
  dept: "Management" | "Front of House" | "Back of House";
};

export function useStaffUsers() {
  return useQuery({
    queryKey: ["v2_users"],
    queryFn: async (): Promise<StaffRow[]> => {
      const { data, error } = await supabase
        .from("v2_users")
        .select("id, full_name, role, email, is_active")
        .order("full_name");
      if (error) throw error;
      return (data ?? []).map((u: any) => {
        const role = (u.role ?? "server") as string;
        const dept: StaffRow["dept"] =
          role === "admin" ? "Management" : role === "hostess" ? "Front of House" : "Front of House";
        return {
          id: u.id,
          name: u.full_name ?? "Staff",
          role: role.charAt(0).toUpperCase() + role.slice(1),
          email: u.email ?? "",
          active: u.is_active !== false,
          dept,
        };
      });
    },
  });
}

// ============ TRENDS (real, tenant-scoped via RLS) ============
export type DayMetric = {
  day: string;
  date: string;
  bookings: number;
  cancellations: number;
  noshows: number;
  covers: number;
  revenue: number;
};

export function useLast7DayMetrics() {
  return useQuery({
    queryKey: ["v2_last7_metrics"],
    queryFn: async (): Promise<DayMetric[]> => {
      const days: DayMetric[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const iso = localDateISO(d);
        days.push({
          day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          date: iso,
          bookings: 0,
          cancellations: 0,
          noshows: 0,
          covers: 0,
          revenue: 0,
        });
      }
      const from = days[0].date;
      const [bkRes, odRes] = await Promise.all([
        supabase.from("v2_bookings").select("date, party_size, status").gte("date", from),
        supabase.from("v2_orders").select("total, created_at").gte("created_at", `${from}T00:00:00`),
      ]);
      if (bkRes.error) throw bkRes.error;
      if (odRes.error) throw odRes.error;

      const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
      for (const b of bkRes.data ?? []) {
        const row = byDate[b.date as string];
        if (!row) continue;
        row.bookings += 1;
        row.covers += b.party_size ?? 0;
        if (b.status === "cancelled") row.cancellations += 1;
        if (b.status === "no_show") row.noshows += 1;
      }
      for (const o of odRes.data ?? []) {
        const iso = String(o.created_at).slice(0, 10);
        const row = byDate[iso];
        if (!row) continue;
        row.revenue += Number(o.total ?? 0);
      }
      return days;
    },
  });
}

export function useTableBusyCounts() {
  return useQuery({
    queryKey: ["v2_table_busy"],
    queryFn: async (): Promise<Record<number, number>> => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const from = since.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("v2_bookings")
        .select("table_number, party_size")
        .gte("date", from)
        .not("table_number", "is", null);
      if (error) throw error;
      const counts: Record<number, number> = {};
      for (const b of data ?? []) {
        const n = parseInt(String(b.table_number), 10);
        if (!Number.isFinite(n)) continue;
        counts[n] = (counts[n] ?? 0) + (b.party_size ?? 1);
      }
      return counts;
    },
  });
}

export function useLoyaltyStats() {
  return useQuery({
    queryKey: ["v2_loyalty_stats"],
    queryFn: async () => {
      const [custRes, txRes] = await Promise.all([
        supabase.from("v2_customers").select("id, full_name, visit_count, loyalty_points, total_spent").order("loyalty_points", { ascending: false }),
        supabase
          .from("v2_loyalty_transactions")
          .select("id, points_earned, points_redeemed, description, created_at, customer_id")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (custRes.error) throw custRes.error;
      if (txRes.error) throw txRes.error;
      const customers = custRes.data ?? [];
      const txs = txRes.data ?? [];
      const txCustomerIds = [...new Set(txs.map((t: any) => t.customer_id).filter(Boolean))];
      const nameById = Object.fromEntries(customers.map((c: any) => [c.id, c.full_name]));
      if (txCustomerIds.length) {
        const missing = txCustomerIds.filter((id) => !nameById[id as string]);
        if (missing.length) {
          const { data: extra } = await supabase.from("v2_customers").select("id, full_name").in("id", missing);
          for (const c of extra ?? []) nameById[c.id] = c.full_name;
        }
      }
      const members = customers.filter((c: any) => (c.loyalty_points ?? 0) > 0 || (c.visit_count ?? 0) > 0).length;
      const totalVisits = customers.reduce((s: number, c: any) => s + (c.visit_count ?? 0), 0);
      const creditEarned = customers.reduce((s: number, c: any) => s + (c.loyalty_points ?? 0), 0);
      const creditRedeemed = txs.reduce((s: number, t: any) => s + (t.points_redeemed ?? 0), 0);
      const topMembers = customers.slice(0, 5).map((c: any) => ({
        id: c.id,
        name: c.full_name ?? "Guest",
        visits: c.visit_count ?? 0,
        points: c.loyalty_points ?? 0,
        spent: fmtMoney(Number(c.total_spent ?? 0)),
      }));
      const recentTx = txs.map((t: any) => ({
        id: t.id,
        name: nameById[t.customer_id] ?? "Guest",
        desc: t.description ?? (t.points_earned ? `Earned ${t.points_earned} pts` : `Redeemed ${t.points_redeemed} pts`),
        date: new Date(t.created_at).toLocaleString(),
        positive: (t.points_earned ?? 0) > 0,
      }));
      return { members, totalVisits, creditEarned, creditRedeemed, topMembers, recentTx, allCustomers: customers };
    },
  });
}

// ============ CUSTOMER MUTATIONS ============
export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { full_name: string; email?: string; phone?: string; notes?: string }) => {
      const restaurant_id = await getCurrentRestaurantId();
      const { data, error } = await supabase
        .from("v2_customers")
        .insert({
          restaurant_id,
          full_name: input.full_name.trim(),
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          notes: input.notes?.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2_customers"] });
      qc.invalidateQueries({ queryKey: ["v2_loyalty_stats"] });
      qc.invalidateQueries({ queryKey: ["v2_dashboard_stats"] });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      full_name?: string;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
    }) => {
      const patch: {
        full_name?: string;
        email?: string | null;
        phone?: string | null;
        notes?: string | null;
      } = {};
      if (input.full_name !== undefined) patch.full_name = input.full_name.trim();
      if (input.email !== undefined) patch.email = input.email?.trim() || null;
      if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
      if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
      const { error } = await supabase.from("v2_customers").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["v2_customers"] });
      qc.invalidateQueries({ queryKey: ["v2_customer", vars.id] });
      qc.invalidateQueries({ queryKey: ["v2_loyalty_stats"] });
    },
  });
}

// ============ STAFF MUTATIONS ============
export function useCreateStaffUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      full_name: string;
      role: "admin" | "hostess" | "server";
      email?: string;
      hourly_wage?: number;
      pin?: string;
    }) => {
      const restaurant_id = await getCurrentRestaurantId();
      const { error } = await supabase.from("v2_users").insert({
        restaurant_id,
        full_name: input.full_name.trim(),
        role: input.role,
        email: input.email?.trim() || null,
        hourly_wage: input.hourly_wage ?? null,
        pin: input.pin?.trim() || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2_users"] });
    },
  });
}

export function useUpdateStaffUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      is_active?: boolean;
      role?: "admin" | "hostess" | "server";
      full_name?: string;
      email?: string | null;
      hourly_wage?: number | null;
    }) => {
      const patch: {
        is_active?: boolean;
        role?: "admin" | "hostess" | "server";
        full_name?: string;
        email?: string | null;
        hourly_wage?: number | null;
      } = {};
      if (input.is_active !== undefined) patch.is_active = input.is_active;
      if (input.role !== undefined) patch.role = input.role;
      if (input.full_name !== undefined) patch.full_name = input.full_name.trim();
      if (input.email !== undefined) patch.email = input.email?.trim() || null;
      if (input.hourly_wage !== undefined) patch.hourly_wage = input.hourly_wage;
      const { error } = await supabase.from("v2_users").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2_users"] });
    },
  });
}

// ============ LOYALTY MUTATIONS ============
export function useAdjustLoyaltyPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      customer_id: string;
      points: number;
      mode: "earn" | "redeem";
      description?: string;
    }) => {
      const restaurant_id = await getCurrentRestaurantId();
      const { data: cust, error: cerr } = await supabase
        .from("v2_customers")
        .select("loyalty_points")
        .eq("id", input.customer_id)
        .single();
      if (cerr) throw cerr;
      const current = Number(cust?.loyalty_points ?? 0);
      const delta = Math.abs(Math.floor(input.points));
      if (delta <= 0) throw new Error("Points must be greater than zero");
      if (input.mode === "redeem" && delta > current) throw new Error("Not enough points to redeem");
      const balance_after = input.mode === "earn" ? current + delta : current - delta;
      const { error: uerr } = await supabase
        .from("v2_customers")
        .update({ loyalty_points: balance_after })
        .eq("id", input.customer_id);
      if (uerr) throw uerr;
      const { error: terr } = await supabase.from("v2_loyalty_transactions").insert({
        restaurant_id,
        customer_id: input.customer_id,
        points_earned: input.mode === "earn" ? delta : 0,
        points_redeemed: input.mode === "redeem" ? delta : 0,
        balance_after,
        description:
          input.description?.trim() ||
          (input.mode === "earn" ? `Earned ${delta} points` : `Redeemed ${delta} points`),
      });
      if (terr) throw terr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2_loyalty_stats"] });
      qc.invalidateQueries({ queryKey: ["v2_customers"] });
    },
  });
}

// ============ SHIFTS / PAYROLL ============
export type ShiftRow = {
  id: string;
  user_id: string;
  staff_name: string;
  clock_in_at: string;
  clock_out_at: string | null;
  sales_total: number;
  tips_total: number;
  hourly_wage: number;
  hours: number;
  pay: number;
};

export function useShifts(days = 14) {
  return useQuery({
    queryKey: ["v2_shifts", days],
    queryFn: async (): Promise<ShiftRow[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const [shiftRes, staffRes] = await Promise.all([
        supabase
          .from("v2_shifts")
          .select("id, user_id, clock_in_at, clock_out_at, sales_total, tips_total")
          .gte("clock_in_at", since.toISOString())
          .order("clock_in_at", { ascending: false }),
        supabase.from("v2_users").select("id, full_name, hourly_wage"),
      ]);
      if (shiftRes.error) throw shiftRes.error;
      if (staffRes.error) throw staffRes.error;
      const wageById = Object.fromEntries(
        (staffRes.data ?? []).map((u: any) => [u.id, { name: u.full_name ?? "Staff", wage: Number(u.hourly_wage ?? 0) }]),
      );
      return (shiftRes.data ?? []).map((s: any) => {
        const start = new Date(s.clock_in_at).getTime();
        const end = s.clock_out_at ? new Date(s.clock_out_at).getTime() : Date.now();
        const hours = Math.max(0, (end - start) / 3_600_000);
        const wage = wageById[s.user_id]?.wage ?? 0;
        return {
          id: s.id,
          user_id: s.user_id,
          staff_name: wageById[s.user_id]?.name ?? "Staff",
          clock_in_at: s.clock_in_at,
          clock_out_at: s.clock_out_at,
          sales_total: Number(s.sales_total ?? 0),
          tips_total: Number(s.tips_total ?? 0),
          hourly_wage: wage,
          hours,
          pay: hours * wage,
        };
      });
    },
  });
}

export function useClockShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; action: "in" | "out" }) => {
      const restaurant_id = await getCurrentRestaurantId();
      if (input.action === "in") {
        const { error } = await supabase.from("v2_shifts").insert({
          restaurant_id,
          user_id: input.user_id,
          clock_in_at: new Date().toISOString(),
        });
        if (error) throw error;
        return;
      }
      const { data: open, error: ferr } = await supabase
        .from("v2_shifts")
        .select("id")
        .eq("user_id", input.user_id)
        .is("clock_out_at", null)
        .order("clock_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ferr) throw ferr;
      if (!open?.id) throw new Error("No open shift to clock out");
      const { error } = await supabase
        .from("v2_shifts")
        .update({ clock_out_at: new Date().toISOString() })
        .eq("id", open.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2_shifts"] });
    },
  });
}

// ============ PRODUCT ANALYTICS ============
export function useProductAnalytics() {
  return useQuery({
    queryKey: ["v2_product_analytics"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const [ordersRes, itemsRes] = await Promise.all([
        supabase
          .from("v2_orders")
          .select("id, total, created_at")
          .gte("created_at", since.toISOString()),
        supabase
          .from("v2_order_items")
          .select("order_id, item_name, qty, price, was_upsell"),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (itemsRes.error) throw itemsRes.error;
      const orderIds = new Set((ordersRes.data ?? []).map((o) => o.id));
      const items = (itemsRes.data ?? []).filter((i: any) => orderIds.has(i.order_id));
      const byItem: Record<string, { name: string; qty: number; revenue: number; upsells: number }> = {};
      let upsellCount = 0;
      let lineCount = 0;
      for (const it of items) {
        const name = it.item_name || "Item";
        const qty = Number(it.qty ?? 1);
        const price = Number(it.price ?? 0);
        if (!byItem[name]) byItem[name] = { name, qty: 0, revenue: 0, upsells: 0 };
        byItem[name].qty += qty;
        byItem[name].revenue += qty * price;
        lineCount += 1;
        if (it.was_upsell) {
          byItem[name].upsells += qty;
          upsellCount += 1;
        }
      }
      const topItems = Object.values(byItem)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      const revenue = (ordersRes.data ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
      const orderCount = (ordersRes.data ?? []).length;
      return {
        orderCount,
        revenue,
        avgTicket: orderCount ? revenue / orderCount : 0,
        upsellRate: lineCount ? upsellCount / lineCount : 0,
        topItems,
      };
    },
  });
}

/** Date-range metrics for dashboard / reports */
export function useMetricsInRange(from: string, to: string) {
  return useQuery({
    queryKey: ["v2_metrics_range", from, to],
    enabled: Boolean(from && to),
    queryFn: async (): Promise<DayMetric[]> => {
      const start = new Date(`${from}T00:00:00`);
      const end = new Date(`${to}T00:00:00`);
      const days: DayMetric[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = localDateISO(d);
        days.push({
          day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          date: iso,
          bookings: 0,
          cancellations: 0,
          noshows: 0,
          covers: 0,
          revenue: 0,
        });
      }
      if (!days.length) return days;
      const [bkRes, odRes] = await Promise.all([
        supabase.from("v2_bookings").select("date, party_size, status").gte("date", from).lte("date", to),
        supabase
          .from("v2_orders")
          .select("total, created_at")
          .gte("created_at", `${from}T00:00:00`)
          .lte("created_at", `${to}T23:59:59`),
      ]);
      if (bkRes.error) throw bkRes.error;
      if (odRes.error) throw odRes.error;
      const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
      for (const b of bkRes.data ?? []) {
        const row = byDate[b.date as string];
        if (!row) continue;
        row.bookings += 1;
        row.covers += b.party_size ?? 0;
        if (b.status === "cancelled") row.cancellations += 1;
        if (b.status === "no_show") row.noshows += 1;
      }
      for (const o of odRes.data ?? []) {
        const iso = String(o.created_at).slice(0, 10);
        const row = byDate[iso];
        if (!row) continue;
        row.revenue += Number(o.total ?? 0);
      }
      return days;
    },
  });
}
