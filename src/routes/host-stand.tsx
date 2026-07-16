import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useBookings, useStaffUsers, useUpdateBooking, type BookingRow } from "@/lib/v2-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FloorPlan, mainFloorPlan, type FloorItem } from "@/components/FloorPlan";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Users, StickyNote, UserPlus, Phone, Mail, MapPin, X, ExternalLink,
  Calendar, Bell, Sparkles, MessageSquare, Check, AlertTriangle, Utensils,
  Clock, Crown,
} from "lucide-react";

export const Route = createFileRoute("/host-stand")({
  head: () => ({
    meta: [
      { title: "Host Stand — RestoStack" },
      { name: "description", content: "Front of house floor plan" },
    ],
  }),
  component: HostStandPage,
});

type DbTable = {
  id: string;
  table_number: string;
  section: string | null;
  capacity: number;
  shape: "round" | "square" | "rectangle";
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
};

type WaitlistRow = {
  id: string;
  guest_name: string;
  party_size: number;
  phone: string | null;
  quoted_wait_minutes: number | null;
  status: string;
  created_at: string;
};

type SeatTarget =
  | { kind: "booking"; id: string; name: string; party: number; tag?: string }
  | { kind: "waitlist"; id: string; name: string; party: number; tag?: string };

type UpNextItem = {
  key: string;
  kind: "booking" | "waitlist";
  id: string;
  name: string;
  party: number;
  whenLabel: string;
  statusLabel: string;
  statusTone: "ready" | "waiting" | "vip" | "note";
  tag?: string;
  notes?: string | null;
  booking?: BookingRow;
};

const SECTIONS = ["All", "Main", "Patio", "Bar", "Private"] as const;

function minutesSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function lastName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

function HostStandPage() {
  const { staff } = useAuth();
  const qc = useQueryClient();

  const [dateISO, setDateISO] = useState(todayISO);
  const [section, setSection] = useState<(typeof SECTIONS)[number]>("All");
  const [selectedTable, setSelectedTable] = useState<number | string | null>(null);
  const [detail, setDetail] = useState<BookingRow | null>(null);
  const [seatTarget, setSeatTarget] = useState<SeatTarget | null>(null);
  const [seatingBusy, setSeatingBusy] = useState(false);
  const [dbTables, setDbTables] = useState<DbTable[]>([]);
  const [restaurantName, setRestaurantName] = useState("RestoStack");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParty, setNewParty] = useState("2");
  const [newPhone, setNewPhone] = useState("");
  const [now, setNow] = useState(() => new Date());

  const { data: todays = [] } = useBookings(dateISO);
  const updateBooking = useUpdateBooking();
  const { data: staffUsers = [] } = useStaffUsers();

  const { data: waitlist = [] } = useQuery({
    queryKey: ["v2_waitlist", staff?.restaurant_id],
    enabled: !!staff?.restaurant_id,
    queryFn: async (): Promise<WaitlistRow[]> => {
      const { data, error } = await (supabase as any)
        .from("v2_waitlist")
        .select("id, guest_name, party_size, phone, quoted_wait_minutes, status, created_at")
        .eq("status", "waiting")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WaitlistRow[];
    },
    refetchInterval: 60_000,
  });

  const addWaitlistMut = useMutation({
    mutationFn: async (input: { name: string; party: number; phone: string }) => {
      if (!staff?.restaurant_id) throw new Error("No restaurant");
      const { error } = await (supabase as any).from("v2_waitlist").insert({
        restaurant_id: staff.restaurant_id,
        guest_name: input.name,
        party_size: input.party,
        phone: input.phone || null,
        quoted_wait_minutes: 15 + input.party * 3,
        status: "waiting",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2_waitlist"] });
      toast.success("Walk-in added");
      setWalkInOpen(false);
      setNewName("");
      setNewParty("2");
      setNewPhone("");
    },
  });

  const updateWaitlistMut = useMutation({
    mutationFn: async (input: { id: string; status: string; table_number?: string | null }) => {
      const patch: { status: string; table_number?: string | null } = { status: input.status };
      if (input.table_number !== undefined) patch.table_number = input.table_number;
      const { error } = await (supabase as any).from("v2_waitlist").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["v2_waitlist"] }),
  });

  useEffect(() => {
    if (!staff) return;
    (async () => {
      const [{ data: tables }, { data: rest }] = await Promise.all([
        supabase
          .from("v2_tables")
          .select("id, table_number, section, capacity, shape, position_x, position_y, width, height")
          .eq("restaurant_id", staff.restaurant_id),
        supabase.from("v2_restaurants").select("name").eq("id", staff.restaurant_id).maybeSingle(),
      ]);
      setDbTables((tables ?? []) as DbTable[]);
      if (rest?.name) setRestaurantName(rest.name);
    })();
  }, [staff]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!seatTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSeatTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seatTarget]);

  const reservations = useMemo(
    () =>
      todays.filter(
        (b) =>
          b.status !== "seated" &&
          b.status !== "completed" &&
          b.status !== "cancelled" &&
          b.status !== "no_show",
      ),
    [todays],
  );

  const seated = useMemo(() => todays.filter((b) => b.status === "seated"), [todays]);

  const coversToday = useMemo(() => todays.reduce((s, b) => s + (b.people || 0), 0), [todays]);
  const diningCount = seated.length;
  const waitingCount = waitlist.length + reservations.length;

  const upNext = useMemo<UpNextItem[]>(() => {
    const fromWait: UpNextItem[] = waitlist.map((w) => {
      const waited = minutesSince(w.created_at);
      return {
        key: `w-${w.id}`,
        kind: "waitlist",
        id: w.id,
        name: w.guest_name,
        party: w.party_size,
        whenLabel: waited <= 1 ? "NOW" : `${waited} min`,
        statusLabel: waited <= 1 ? "Ready to seat" : `Waiting ${waited} min`,
        statusTone: waited <= 1 ? "ready" : "waiting",
        tag: "Walk-in",
      };
    });

    const fromRes: UpNextItem[] = reservations.map((b) => {
      const notes = (b.notes || "").toLowerCase();
      const vip = notes.includes("vip");
      const anniversary = notes.includes("anniversary");
      const tag = vip ? "VIP" : anniversary ? "Anniversary" : undefined;
      return {
        key: `b-${b.id}`,
        kind: "booking",
        id: b.id,
        name: b.name,
        party: b.people,
        whenLabel: b.time || "—",
        statusLabel: vip
          ? "VIP"
          : anniversary
            ? "Anniversary"
            : b.status === "confirmed"
              ? "Ready to seat"
              : "Reservation",
        statusTone: vip
          ? "vip"
          : anniversary
            ? "note"
            : b.status === "confirmed"
              ? "ready"
              : "waiting",
        tag,
        notes: b.notes,
        booking: b,
      };
    });

    return [...fromWait, ...fromRes].slice(0, 12);
  }, [waitlist, reservations]);

  const occupiedTableIds = useMemo(() => {
    const set = new Set<string>();
    for (const b of todays) {
      if (b.status === "seated" && b.tableNumber) set.add(String(b.tableNumber));
    }
    return set;
  }, [todays]);

  const positionedTables = useMemo(
    () =>
      dbTables.filter(
        (t) =>
          t.position_x != null &&
          t.position_y != null &&
          (t.position_x !== 0 || t.position_y !== 0),
      ),
    [dbTables],
  );

  const floorItems = useMemo<FloorItem[]>(() => {
    const base: FloorItem[] =
      positionedTables.length === 0
        ? mainFloorPlan
        : positionedTables
            .filter((t) => section === "All" || (t.section || "Main") === section)
            .map((t) => {
              const idNum = Number(t.table_number);
              const id: string | number = Number.isFinite(idNum) ? idNum : t.table_number;
              if (t.shape === "round") {
                return {
                  kind: "round" as const,
                  id,
                  x: t.position_x!,
                  y: t.position_y!,
                  size: t.width ?? 60,
                  label: t.table_number,
                  party: t.capacity,
                };
              }
              return {
                kind: "rect" as const,
                id,
                x: t.position_x!,
                y: t.position_y!,
                w: t.width ?? 80,
                h: t.height ?? 60,
                label: t.table_number,
                party: t.capacity,
              };
            });

    return base.map((it) => {
      if (it.kind !== "round" && it.kind !== "rect") return it;
      if (it.id == null) return it;
      const key = String(it.id);
      const seatedHere = seated.find((b) => String(b.tableNumber) === key);
      const bookedHere = reservations.find((b) => String(b.tableNumber) === key);
      if (seatedHere) {
        return {
          ...it,
          status: "seated" as const,
          guestLabel: `${seatedHere.people}`,
          time: seatedHere.time,
        };
      }
      if (bookedHere) {
        const late =
          bookedHere.status === "confirmed" &&
          !!bookedHere.rawTime &&
          bookedHere.rawTime < now.toTimeString().slice(0, 5);
        return {
          ...it,
          status: late ? ("alert" as const) : ("booked" as const),
          time: bookedHere.time,
          guestLabel: late ? "Late" : undefined,
        };
      }
      return { ...it, status: "free" as const };
    });
  }, [positionedTables, section, seated, reservations, now]);

  const freeTables = useMemo(() => {
    return dbTables
      .filter((t) => !occupiedTableIds.has(String(t.table_number)))
      .sort((a, b) => a.capacity - b.capacity);
  }, [dbTables, occupiedTableIds]);

  const recommended = useMemo(() => {
    if (!seatTarget) {
      // Suggest best free table for next party
      const next = upNext[0];
      if (!next) return null;
      const fit =
        freeTables.find((t) => t.capacity >= next.party) ?? freeTables[0] ?? null;
      if (!fit) return null;
      return {
        table: fit.table_number,
        party: next.party,
        name: next.name,
        reasons: [
          `Seats ${fit.capacity}`,
          "Server balance",
          "Open now",
          "Est. dining time 1h 10m",
        ],
        target: {
          kind: next.kind,
          id: next.id,
          name: next.name,
          party: next.party,
          tag: next.tag,
        } as SeatTarget,
      };
    }
    const fit =
      freeTables.find((t) => t.capacity >= seatTarget.party) ?? freeTables[0] ?? null;
    if (!fit) return null;
    return {
      table: fit.table_number,
      party: seatTarget.party,
      name: seatTarget.name,
      reasons: [
        `Seats ${fit.capacity}`,
        "Server balance",
        "No conflict now",
        "Est. dining time 1h 10m",
      ],
      target: seatTarget,
    };
  }, [seatTarget, upNext, freeTables]);

  const servers = useMemo(() => {
    const hosts = staffUsers.filter(
      (s) =>
        s.role.toLowerCase() === "server" ||
        s.role.toLowerCase() === "hostess" ||
        s.dept === "Front of House",
    );
    const list = (hosts.length ? hosts : staffUsers).slice(0, 3);
    const seatedTables = seated.map((b) => b.tableNumber).filter(Boolean) as string[];
    return list.map((s, i) => {
      const share = seatedTables.filter((_, idx) => idx % Math.max(list.length, 1) === i);
      const load = Math.min(100, share.length * 28 + 12);
      return { name: s.name.split(" ")[0] || s.name, tables: share.length, load };
    });
  }, [staffUsers, seated]);

  const alerts = useMemo(() => {
    const items: { text: string; tone: "warn" | "vip" }[] = [];
    const late = reservations.filter((b) => {
      if (!b.rawTime) return false;
      return b.rawTime < now.toTimeString().slice(0, 5);
    });
    if (late.length) {
      items.push({
        text: `${late.length} reservation${late.length > 1 ? "s" : ""} late`,
        tone: "warn",
      });
    }
    const vip = upNext.filter((u) => u.statusTone === "vip");
    if (vip[0]) {
      items.push({
        text: `1 VIP waiting (${lastName(vip[0].name)} ${vip[0].whenLabel})`,
        tone: "vip",
      });
    }
    if (waitlist.length >= 3) {
      items.push({ text: `${waitlist.length} parties on waitlist`, tone: "warn" });
    }
    return items.slice(0, 3);
  }, [reservations, now, upNext, waitlist.length]);

  const startSeat = (target: SeatTarget) => {
    setSeatTarget(target);
    setDetail(null);
    toast.message(`Select a free table for ${target.name}`);
  };

  const markTableOccupied = async (tableNumber: string, bookingId: string | null) => {
    if (!staff?.restaurant_id) return;
    await supabase
      .from("v2_tables")
      .update({ status: "occupied", current_booking_id: bookingId } as never)
      .eq("restaurant_id", staff.restaurant_id)
      .eq("table_number", tableNumber);
  };

  const confirmSeatAt = async (tableId: number | string, target = seatTarget) => {
    if (!target) return;
    if (occupiedTableIds.has(String(tableId))) {
      toast.error(`Table ${tableId} is occupied`);
      return;
    }
    const tableNumber = String(tableId);
    setSeatingBusy(true);
    try {
      if (target.kind === "waitlist") {
        await updateWaitlistMut.mutateAsync({
          id: target.id,
          status: "seated",
          table_number: tableNumber,
        });
        await markTableOccupied(tableNumber, null);
      } else {
        await updateBooking.mutateAsync({
          id: target.id,
          status: "seated",
          table_number: tableNumber,
        });
        await markTableOccupied(tableNumber, target.id);
      }
      toast.success(`${target.name} seated at ${tableNumber}`);
      setSeatTarget(null);
      setSelectedTable(tableId);
    } catch (e) {
      toast.error((e as Error).message || "Could not seat");
    } finally {
      setSeatingBusy(false);
    }
  };

  const onTableClick = (id: number | string) => {
    if (seatTarget) {
      if (occupiedTableIds.has(String(id))) {
        toast.message(`Table ${id} is occupied — pick another`);
        return;
      }
      void confirmSeatAt(id);
      return;
    }
    setSelectedTable(id);
    const match =
      todays.find((b) => String(b.tableNumber) === String(id) && b.status !== "cancelled") ?? null;
    if (match) setDetail(match);
  };

  const clockLabel = now.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const dateShort = useMemo(() => {
    const d = new Date(`${dateISO}T12:00:00`);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }, [dateISO]);

  return (
    <AppShell>
      <div className="flex h-[calc(100dvh-3.25rem)] lg:h-[calc(100dvh-3.5rem)] flex-col bg-[#f7f8fa] text-slate-900 -mx-0 lg:-mt-3">
        {/* Top metrics bar */}
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 sm:gap-5">
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-semibold truncate">{restaurantName}</div>
            <div className="text-xs text-slate-500">{clockLabel}</div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 text-sm">
            <Metric icon={Users} label="Covers Today" value={coversToday} tone="green" />
            <Metric icon={Utensils} label="Dining" value={diningCount} tone="blue" />
            <Metric icon={Clock} label="Waiting" value={waitingCount} tone="orange" />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 h-9">
              <Calendar className="size-3.5 text-slate-400" />
              <input
                type="date"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
                className="bg-transparent text-xs outline-none w-[118px]"
              />
              <button
                type="button"
                onClick={() => setDateISO(todayISO())}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 pl-1.5 border-l border-slate-200"
              >
                Today
              </button>
            </div>
            <button
              type="button"
              className="relative inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell className="size-4 text-slate-600" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 size-4 rounded-full bg-rose-500 text-[10px] font-bold text-white grid place-items-center">
                  {alerts.length}
                </span>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
              <div className="size-7 rounded-full bg-emerald-500/15 text-emerald-700 grid place-items-center text-xs font-bold">
                {(staff?.full_name || "O").slice(0, 1).toUpperCase()}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-semibold">{staff?.full_name?.split(" ")[0] || "Owner"}</div>
                <div className="text-[10px] text-slate-500 capitalize">{staff?.role || "owner"}</div>
              </div>
            </div>
          </div>
        </header>

        {seatTarget && (
          <div className="shrink-0 px-4 py-2.5 bg-emerald-500 text-white flex items-center gap-3">
            <MapPin className="size-4 shrink-0" />
            <div className="text-sm font-semibold flex-1">
              Select a table for {seatTarget.name}
              <span className="font-normal opacity-90"> · party of {seatTarget.party}</span>
            </div>
            <button
              type="button"
              onClick={() => setSeatTarget(null)}
              className="inline-flex items-center gap-1 rounded-md bg-black/10 px-2.5 py-1 text-xs font-semibold hover:bg-black/15"
            >
              <X className="size-3.5" /> Cancel
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
          {/* Up Next */}
          <aside className="min-h-0 border-r border-slate-200 bg-[#f0f2f5] flex flex-col">
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200/80">
              <div className="text-sm font-semibold">Up Next</div>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-800 px-1.5 text-[11px] font-bold text-white">
                {upNext.length}
              </span>
            </div>
            <ul className="flex-1 overflow-y-auto p-3 space-y-2">
              {upNext.map((item) => (
                <li
                  key={item.key}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold truncate">{lastName(item.name)}</div>
                        <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                          {item.whenLabel}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">Party of {item.party}</div>
                      <div
                        className={cn(
                          "mt-1 text-xs font-medium inline-flex items-center gap-1",
                          item.statusTone === "ready" && "text-emerald-600",
                          item.statusTone === "waiting" && "text-amber-600",
                          item.statusTone === "vip" && "text-violet-600",
                          item.statusTone === "note" && "text-pink-600",
                        )}
                      >
                        {item.statusTone === "vip" && <Crown className="size-3" />}
                        {item.statusLabel}
                      </div>
                      {item.tag && item.statusTone !== "vip" && item.statusTone !== "note" && (
                        <span className="mt-1 inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                      disabled={seatingBusy}
                      onClick={() =>
                        startSeat({
                          kind: item.kind,
                          id: item.id,
                          name: item.name,
                          party: item.party,
                          tag: item.tag,
                        })
                      }
                    >
                      Seat
                    </Button>
                  </div>
                  {item.booking && (
                    <button
                      type="button"
                      onClick={() => setDetail(item.booking!)}
                      className="mt-2 text-[11px] text-slate-400 hover:text-emerald-600"
                    >
                      View details
                    </button>
                  )}
                </li>
              ))}
              {upNext.length === 0 && (
                <li className="text-center text-xs text-slate-500 py-12">
                  No parties waiting for {dateShort}.
                </li>
              )}
            </ul>
            <div className="p-3 border-t border-slate-200">
              <Button
                variant="outline"
                className="w-full h-10 border-slate-300 bg-white hover:bg-slate-50"
                onClick={() => setWalkInOpen(true)}
              >
                <UserPlus className="size-4 mr-1.5" /> Add Walk-in
              </Button>
            </div>
          </aside>

          {/* Floor plan */}
          <section className="min-h-0 min-w-0 flex flex-col bg-white">
            <div className="shrink-0 px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-1.5 border-b border-slate-200">
              {SECTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition",
                    section === s
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {s === "All" ? "All Areas" : s === "Main" ? "Main Floor" : s}
                </button>
              ))}
              <div className="ml-auto hidden lg:flex items-center gap-3 text-[11px] text-slate-500">
                <LegendDot className="bg-emerald-500" label="Available" />
                <LegendDot className="bg-sky-500" label="Occupied" />
                <LegendDot className="bg-white ring-2 ring-slate-300" label="Reserved" />
                <LegendDot className="bg-rose-400" label="Late" />
              </div>
            </div>
            <div
              className={cn(
                "flex-1 min-h-0 relative",
                seatTarget && "ring-inset ring-2 ring-emerald-400",
              )}
            >
              <FloorPlan
                fill
                light
                items={floorItems}
                selectedId={selectedTable}
                zoom={1}
                onSelect={onTableClick}
                className="absolute inset-0 h-full w-full"
              />
              {positionedTables.length === 0 && (
                <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-slate-500 bg-white/90 border border-slate-200 px-3 py-1 rounded-full pointer-events-none">
                  Demo layout ·{" "}
                  <Link to="/floorplan" className="text-emerald-600 underline pointer-events-auto">
                    place your tables
                  </Link>
                </p>
              )}
            </div>
          </section>

          {/* Right rail */}
          <aside className="min-h-0 border-l border-slate-200 bg-[#f0f2f5] flex flex-col overflow-y-auto">
            <div className="p-3 space-y-3">
              {/* AI recommendation */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <Sparkles className="size-3.5 text-emerald-500" />
                  AI Assistant
                </div>
                {recommended ? (
                  <>
                    <div className="mt-2 text-sm text-slate-600">Recommended Table:</div>
                    <div className="text-3xl font-bold text-emerald-600 tracking-tight">
                      {recommended.table}
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {recommended.reasons.map((r) => (
                        <li key={r} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-4 w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                      disabled={seatingBusy}
                      onClick={() => {
                        if (seatTarget) {
                          void confirmSeatAt(recommended.table, seatTarget);
                        } else {
                          startSeat(recommended.target);
                          void confirmSeatAt(recommended.table, recommended.target);
                        }
                      }}
                    >
                      Seat Here →
                    </Button>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    No free tables match the next party yet.
                  </p>
                )}
              </div>

              {/* Server load */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Server Load
                </div>
                {servers.length === 0 && (
                  <p className="text-xs text-slate-500">Add staff to see server balance.</p>
                )}
                <ul className="space-y-3">
                  {servers.map((s) => (
                    <li key={s.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-800">{s.name}</span>
                        <span className="text-slate-500">{s.tables} tables</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            s.load > 70 ? "bg-amber-400" : "bg-emerald-500",
                          )}
                          style={{ width: `${s.load}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Alerts */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Alerts
                  </div>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                    {alerts.length}
                  </span>
                </div>
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-500">All clear for this service.</p>
                ) : (
                  <ul className="space-y-2">
                    {alerts.map((a) => (
                      <li key={a.text} className="flex items-start gap-2 text-xs text-slate-700">
                        <AlertTriangle
                          className={cn(
                            "size-3.5 shrink-0 mt-0.5",
                            a.tone === "vip" ? "text-violet-500" : "text-amber-500",
                          )}
                        />
                        {a.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full h-10 border-slate-300 bg-white"
                onClick={() => toast.message("Staff messaging coming soon")}
              >
                <MessageSquare className="size-4 mr-1.5" /> Message Staff
              </Button>
            </div>
          </aside>
        </div>
      </div>

      {/* Walk-in dialog */}
      <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add walk-in</DialogTitle>
            <DialogDescription>Add a party to the waitlist, then seat them from Up Next.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Guest name"
              autoFocus
            />
            <div className="flex gap-2">
              <Select value={newParty} onValueChange={setNewParty}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} guests
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="flex-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalkInOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={!newName.trim() || addWaitlistMut.isPending}
              onClick={() =>
                addWaitlistMut.mutate({
                  name: newName.trim(),
                  party: parseInt(newParty, 10) || 2,
                  phone: newPhone.trim(),
                })
              }
            >
              Add to Up Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking detail */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.name}</SheetTitle>
                <SheetDescription>
                  {detail.time} · party of {detail.people}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <div className="text-[10px] uppercase text-slate-500">Table</div>
                    <div className="font-semibold mt-0.5">{detail.tableNumber ?? "Unassigned"}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <div className="text-[10px] uppercase text-slate-500">Status</div>
                    <div className="font-semibold mt-0.5 capitalize">{detail.status}</div>
                  </div>
                </div>
                {detail.phone && (
                  <a href={`tel:${detail.phone}`} className="flex items-center gap-2 text-sm hover:text-emerald-600">
                    <Phone className="size-4 text-slate-400" /> {detail.phone}
                  </a>
                )}
                {detail.email && (
                  <a href={`mailto:${detail.email}`} className="flex items-center gap-2 text-sm hover:text-emerald-600">
                    <Mail className="size-4 text-slate-400" /> {detail.email}
                  </a>
                )}
                {detail.notes && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-500 mb-1">
                      <StickyNote className="size-3" /> Notes
                    </div>
                    {detail.notes}
                  </div>
                )}
                {detail.customerId && (
                  <Link
                    to="/customers/$id"
                    params={{ id: detail.customerId }}
                    search={{ tab: "overview" }}
                    className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline"
                  >
                    Open customer profile <ExternalLink className="size-3.5" />
                  </Link>
                )}
                {detail.status !== "seated" && (
                  <Button
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() =>
                      startSeat({
                        kind: "booking",
                        id: detail.id,
                        name: detail.name,
                        party: detail.people,
                      })
                    }
                  >
                    Seat this party
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: "green" | "blue" | "orange";
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "size-8 rounded-lg grid place-items-center",
          tone === "green" && "bg-emerald-500/15 text-emerald-600",
          tone === "blue" && "bg-sky-500/15 text-sky-600",
          tone === "orange" && "bg-amber-500/15 text-amber-600",
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-sm font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", className)} />
      {label}
    </span>
  );
}
