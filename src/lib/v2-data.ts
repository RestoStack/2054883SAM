import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const slugify = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const todayISO = () => new Date().toISOString().slice(0, 10);

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

export type BookingRow = {
  id: string;
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
  slug: string;
};

export function useBookings(dateFilter?: string) {
  return useQuery({
    queryKey: ["v2_bookings", dateFilter ?? "all"],
    queryFn: async (): Promise<BookingRow[]> => {
      let q = supabase
        .from("v2_bookings")
        .select("*")
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (dateFilter) q = q.eq("date", dateFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((b: any) => ({
        id: b.id,
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
        visits: "—",
        last: "",
        notes: b.notes ?? "",
        slug: slugify(b.guest_name ?? ""),
      }));
    },
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
        if (existing?.id) customer_id = existing.id;
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
    }) => {
      const patch: {
        status?: BookingStatus;
        table_number?: string | null;
        section?: string | null;
      } = {};
      if (input.status) patch.status = input.status;
      if (input.table_number !== undefined) patch.table_number = input.table_number;
      if (input.section !== undefined) patch.section = input.section;
      const { error } = await supabase.from("v2_bookings").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2_bookings"] });
      qc.invalidateQueries({ queryKey: ["v2_dashboard_stats"] });
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

export function useCustomers() {
  return useQuery({
    queryKey: ["v2_customers"],
    queryFn: async (): Promise<CustomerRow[]> => {
      const { data, error } = await supabase
        .from("v2_customers")
        .select("*")
        .order("total_spent", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c: any) => {
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
      });
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
  return useQuery({
    queryKey: ["v2_dashboard_stats", todayISO()],
    queryFn: async () => {
      const today = todayISO();
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
  });
}
