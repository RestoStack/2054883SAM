import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useBookings, useUpdateBooking, type BookingRow } from "@/lib/v2-data";
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
  Clock, Users, StickyNote, UserPlus, CheckCircle2, Phone, Mail,
  MapPin, Search, Minus, Plus, X, ExternalLink, Calendar,
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
  | { kind: "booking"; id: string; name: string; party: number }
  | { kind: "waitlist"; id: string; name: string; party: number };

type LeftTab = "reservations" | "waiting" | "seated";
type Shift = "AM" | "PM";

const SECTIONS = ["All", "Main", "Patio", "Bar", "Private"] as const;

function hour24(rawTime: string): number {
  const h = parseInt((rawTime || "0").split(":")[0] || "0", 10);
  return Number.isFinite(h) ? h : 0;
}

function isAm(rawTime: string) {
  return hour24(rawTime) < 15;
}

function minutesSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function HostStandPage() {
  const { staff } = useAuth();
  const qc = useQueryClient();

  const [dateISO, setDateISO] = useState(todayISO);
  const [shift, setShift] = useState<Shift>(() => (new Date().getHours() < 15 ? "AM" : "PM"));
  const [leftTab, setLeftTab] = useState<LeftTab>("reservations");
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<(typeof SECTIONS)[number]>("All");
  const [zoom, setZoom] = useState(1);
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

  const { data: todays = [], isLoading } = useBookings(dateISO);
  const updateBooking = useUpdateBooking();

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
      toast.success("Added to waitlist");
      setWalkInOpen(false);
      setNewName("");
      setNewParty("2");
      setNewPhone("");
      setLeftTab("waiting");
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

  // Esc cancels forced seating
  useEffect(() => {
    if (!seatTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSeatTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seatTarget]);

  const shiftBookings = useMemo(() => {
    return todays.filter((b) => (shift === "AM" ? isAm(b.rawTime) : !isAm(b.rawTime)));
  }, [todays, shift]);

  const q = search.trim().toLowerCase();
  const matchesSearch = (name: string, phone?: string | null, email?: string | null) => {
    if (!q) return true;
    return (
      name.toLowerCase().includes(q) ||
      (phone || "").toLowerCase().includes(q) ||
      (email || "").toLowerCase().includes(q)
    );
  };

  const reservations = useMemo(
    () =>
      shiftBookings.filter(
        (b) =>
          b.status !== "seated" &&
          b.status !== "completed" &&
          b.status !== "cancelled" &&
          matchesSearch(b.name, b.phone, b.email),
      ),
    [shiftBookings, q],
  );

  const seated = useMemo(
    () =>
      shiftBookings.filter(
        (b) => b.status === "seated" && matchesSearch(b.name, b.phone, b.email),
      ),
    [shiftBookings, q],
  );

  const waitingFiltered = useMemo(
    () => waitlist.filter((w) => matchesSearch(w.guest_name, w.phone)),
    [waitlist, q],
  );

  const byTime = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const b of reservations) {
      const key = b.time || b.rawTime;
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const aa = a[1][0]?.rawTime ?? "";
      const bb = b[1][0]?.rawTime ?? "";
      return aa.localeCompare(bb);
    });
  }, [reservations]);

  const occupiedTableIds = useMemo(() => {
    const set = new Set<string>();
    for (const b of shiftBookings) {
      if (b.status === "seated" && b.tableNumber) set.add(String(b.tableNumber));
    }
    return set;
  }, [shiftBookings]);

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
          guest: seatedHere.name,
          time: seatedHere.time,
        };
      }
      if (bookedHere?.status === "no_show") {
        return { ...it, status: "alert" as const, guest: bookedHere.name, time: bookedHere.time };
      }
      if (bookedHere) {
        return { ...it, status: "booked" as const, time: bookedHere.time, guest: bookedHere.name };
      }
      // In forced seating mode, keep free tables obvious
      return { ...it, status: "free" as const };
    });
  }, [positionedTables, section, seated, reservations]);

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

  const confirmSeatAt = async (tableId: number | string) => {
    if (!seatTarget) return;
    if (occupiedTableIds.has(String(tableId))) {
      toast.error(`Table ${tableId} is occupied`);
      return;
    }
    const tableNumber = String(tableId);
    setSeatingBusy(true);
    try {
      if (seatTarget.kind === "waitlist") {
        await updateWaitlistMut.mutateAsync({
          id: seatTarget.id,
          status: "seated",
          table_number: tableNumber,
        });
        await markTableOccupied(tableNumber, null);
      } else {
        await updateBooking.mutateAsync({
          id: seatTarget.id,
          status: "seated",
          table_number: tableNumber,
        });
        await markTableOccupied(tableNumber, seatTarget.id);
      }
      toast.success(`${seatTarget.name} seated at ${tableNumber}`);
      setSeatTarget(null);
      setSelectedTable(tableId);
      setLeftTab("seated");
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
      shiftBookings.find((b) => String(b.tableNumber) === String(id) && b.status !== "cancelled") ??
      null;
    if (match) setDetail(match);
  };

  const dateLabel = useMemo(() => {
    const d = new Date(`${dateISO}T12:00:00`);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [dateISO]);

  const clock = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <AppShell fullBleed>
      <div className="flex-1 min-h-0 flex flex-col bg-[#14171b] text-zinc-100">
        {/* Top bar — date + shift */}
        <header className="shrink-0 h-12 border-b border-white/10 px-3 sm:px-4 flex items-center gap-3 bg-[#1a1e24]">
          <div className="font-semibold text-sm sm:text-base truncate max-w-[180px] sm:max-w-xs">
            {restaurantName}
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0f1216] px-2 h-9">
            <Calendar className="size-3.5 text-zinc-400" />
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="bg-transparent text-sm outline-none [color-scheme:dark] w-[132px]"
            />
            <span className="hidden sm:inline text-xs text-zinc-500 border-l border-white/10 pl-2">
              {dateLabel}
            </span>
          </div>

          <div className="flex rounded-lg border border-white/10 overflow-hidden h-9">
            {(["AM", "PM"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShift(s)}
                className={cn(
                  "px-3.5 text-xs font-semibold transition",
                  shift === s
                    ? "bg-emerald-500 text-zinc-950"
                    : "bg-[#0f1216] text-zinc-400 hover:text-zinc-200",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3 text-xs text-zinc-400">
            <Link to="/floorplan" className="hover:text-emerald-400 hidden sm:inline">
              Edit layout
            </Link>
            <span className="tabular-nums text-zinc-300">{clock}</span>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex">
          {/* Left panel */}
          <aside className="w-full max-w-[340px] shrink-0 border-r border-white/10 bg-[#1a1e24] flex flex-col min-h-0">
            <div className="p-2.5 flex gap-1 border-b border-white/10">
              {(
                [
                  ["reservations", "Reservations", reservations.length],
                  ["waiting", "Waiting", waitingFiltered.length],
                  ["seated", "Seated", seated.length],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLeftTab(id)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition",
                    leftTab === id
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5",
                  )}
                >
                  {label}{" "}
                  <span className="opacity-70">{count}</span>
                </button>
              ))}
            </div>

            <div className="p-2.5 flex gap-1.5 border-b border-white/10">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or phone"
                  className="h-8 pl-7 bg-[#0f1216] border-white/10 text-sm"
                />
              </div>
              <Button
                size="sm"
                className="h-8 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                onClick={() => setWalkInOpen(true)}
              >
                <UserPlus className="size-3.5" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {leftTab === "reservations" && (
                <div className="pb-4">
                  {isLoading && (
                    <p className="text-xs text-zinc-500 text-center py-8">Loading…</p>
                  )}
                  {!isLoading && byTime.length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-10">
                      No {shift} reservations for this date
                    </p>
                  )}
                  {byTime.map(([time, rows]) => {
                    const covers = rows.reduce((s, r) => s + r.people, 0);
                    return (
                      <div key={time} className="mt-3">
                        <div className="px-3 mb-1.5 flex items-center justify-between">
                          <div className="text-[11px] font-bold tracking-wide text-zinc-400">
                            {time}
                          </div>
                          <div className="text-[10px] text-zinc-500 inline-flex items-center gap-1">
                            <Users className="size-3" />
                            {covers}
                          </div>
                        </div>
                        <ul className="px-2 space-y-1">
                          {rows.map((b) => (
                            <li key={b.id}>
                              <button
                                type="button"
                                onClick={() => setDetail(b)}
                                className={cn(
                                  "w-full text-left rounded-lg border px-2.5 py-2 transition",
                                  detail?.id === b.id
                                    ? "border-emerald-500/50 bg-emerald-500/10"
                                    : "border-transparent bg-white/[0.03] hover:bg-white/[0.06]",
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="size-8 rounded-md bg-white/10 grid place-items-center text-xs font-bold shrink-0">
                                    {b.people}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium truncate">{b.name}</div>
                                    <div className="text-[11px] text-zinc-500 truncate">
                                      {b.phone || b.source || "—"}
                                      {b.notes ? " · note" : ""}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <div className="text-xs font-semibold tabular-nums text-zinc-300">
                                      {b.tableNumber ?? "—"}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 capitalize">
                                      {b.status === "confirmed" ? "arrived" : b.status}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}

              {leftTab === "waiting" && (
                <ul className="p-2 space-y-1">
                  {waitingFiltered.map((w) => (
                    <li
                      key={w.id}
                      className="rounded-lg bg-white/[0.03] px-2.5 py-2 flex items-center gap-2.5"
                    >
                      <div className="size-8 rounded-md bg-amber-500/20 text-amber-200 grid place-items-center text-xs font-bold">
                        {w.party_size}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{w.guest_name}</div>
                        <div className="text-[11px] text-zinc-500">
                          waited {minutesSince(w.created_at)}m
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() =>
                          startSeat({
                            kind: "waitlist",
                            id: w.id,
                            name: w.guest_name,
                            party: w.party_size,
                          })
                        }
                      >
                        Seat
                      </Button>
                    </li>
                  ))}
                  {waitingFiltered.length === 0 && (
                    <li className="text-xs text-zinc-500 text-center py-10">Waitlist empty</li>
                  )}
                </ul>
              )}

              {leftTab === "seated" && (
                <ul className="p-2 space-y-1">
                  {seated.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setDetail(b);
                          if (b.tableNumber) setSelectedTable(b.tableNumber);
                        }}
                        className="w-full text-left rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-2 flex items-center gap-2.5 hover:bg-violet-500/15"
                      >
                        <div className="size-8 rounded-md bg-violet-600 grid place-items-center text-xs font-bold">
                          {b.people}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{b.name}</div>
                          <div className="text-[11px] text-violet-200/70">{b.time}</div>
                        </div>
                        <div className="text-xs font-bold tabular-nums">{b.tableNumber ?? "—"}</div>
                      </button>
                    </li>
                  ))}
                  {seated.length === 0 && (
                    <li className="text-xs text-zinc-500 text-center py-10">No one seated yet</li>
                  )}
                </ul>
              )}
            </div>
          </aside>

          {/* Floor plan */}
          <section className="flex-1 min-w-0 relative flex flex-col bg-[#12151a]">
            {/* Forced seating banner */}
            {seatTarget && (
              <div className="shrink-0 px-4 py-2.5 bg-emerald-500 text-zinc-950 flex items-center gap-3">
                <MapPin className="size-4 shrink-0" />
                <div className="text-sm font-semibold flex-1">
                  Select a table for {seatTarget.name}
                  <span className="font-normal opacity-80"> · party of {seatTarget.party}</span>
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

            {/* Section pills */}
            <div className="shrink-0 px-3 pt-3 flex flex-wrap gap-1.5">
              {SECTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold border transition",
                    section === s
                      ? "border-emerald-400 bg-emerald-500/15 text-emerald-300"
                      : "border-white/10 text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  {s === "All" ? "All floors" : s}
                </button>
              ))}
            </div>

            <div
              className={cn(
                "flex-1 min-h-0 p-3 sm:p-4 overflow-auto flex items-center justify-center transition",
                seatTarget && "ring-inset ring-2 ring-emerald-500/40",
              )}
            >
              <div className="w-full max-w-5xl">
                <FloorPlan
                  items={floorItems}
                  selectedId={selectedTable}
                  zoom={zoom}
                  onSelect={onTableClick}
                  className={cn(seatTarget && "brightness-110")}
                />
                {positionedTables.length === 0 && (
                  <p className="text-center text-[11px] text-zinc-500 mt-2">
                    Demo layout —{" "}
                    <Link to="/floorplan" className="text-emerald-400 underline">
                      place your tables
                    </Link>{" "}
                    for a custom floor plan.
                  </p>
                )}
              </div>
            </div>

            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-white/10 bg-[#1a1e24]/95 overflow-hidden">
                <button
                  type="button"
                  className="size-8 grid place-items-center hover:bg-white/5"
                  onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))))}
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-10 text-center text-[11px] tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  className="size-8 grid place-items-center hover:bg-white/5"
                  onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Customer / booking detail */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md bg-[#1a1e24] border-white/10 text-zinc-100">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-zinc-50">{detail.name}</SheetTitle>
                <SheetDescription className="text-zinc-400">
                  {detail.time} · party of {detail.people}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-white/5 p-3">
                    <div className="text-[10px] uppercase text-zinc-500">Table</div>
                    <div className="font-semibold mt-0.5">{detail.tableNumber ?? "Unassigned"}</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3">
                    <div className="text-[10px] uppercase text-zinc-500">Status</div>
                    <div className="font-semibold mt-0.5 capitalize">{detail.status}</div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 p-3 space-y-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-zinc-500" />
                    <span>{detail.phone || "No phone"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-zinc-500" />
                    <span className="truncate">{detail.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-zinc-500" />
                    <span>
                      {detail.date} · {detail.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-3.5 text-zinc-500" />
                    <span>
                      {detail.people} guests · {detail.source}
                    </span>
                  </div>
                  {detail.notes && (
                    <div className="flex items-start gap-2 text-zinc-300">
                      <StickyNote className="size-3.5 text-zinc-500 mt-0.5" />
                      <span>{detail.notes}</span>
                    </div>
                  )}
                </div>

                {detail.customerId && (
                  <Link
                    to="/customers/$id"
                    params={{ id: detail.customerId }}
                    search={{}}
                    className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:underline"
                  >
                    View customer profile <ExternalLink className="size-3.5" />
                  </Link>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  {detail.status !== "seated" && detail.status !== "cancelled" && (
                    <>
                      {detail.status !== "confirmed" && (
                        <Button
                          variant="outline"
                          className="border-white/15"
                          disabled={updateBooking.isPending}
                          onClick={() =>
                            updateBooking.mutate(
                              { id: detail.id, status: "confirmed" },
                              {
                                onSuccess: () => {
                                  toast.success("Marked arrived");
                                  setDetail({ ...detail, status: "confirmed" });
                                },
                              },
                            )
                          }
                        >
                          Mark arrived
                        </Button>
                      )}
                      <Button
                        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                        onClick={() =>
                          startSeat({
                            kind: "booking",
                            id: detail.id,
                            name: detail.name,
                            party: detail.people,
                          })
                        }
                      >
                        <CheckCircle2 className="size-4 mr-1.5" />
                        Seat — pick a table
                      </Button>
                    </>
                  )}
                  {detail.status === "seated" && (
                    <p className="text-xs text-zinc-400 text-center">
                      Seated at table {detail.tableNumber ?? "—"}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Walk-in / waitlist */}
      <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add walk-in</DialogTitle>
            <DialogDescription>They’ll appear under Waiting until you seat them.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Guest name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Select value={newParty} onValueChange={setNewParty}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} guests
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Phone (optional)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalkInOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim() || addWaitlistMut.isPending}
              onClick={() =>
                addWaitlistMut.mutate({
                  name: newName.trim(),
                  party: parseInt(newParty, 10) || 2,
                  phone: newPhone.trim(),
                })
              }
            >
              Add to waitlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {seatingBusy && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 pointer-events-none">
          <div className="rounded-lg bg-[#1a1e24] border border-white/10 px-4 py-2 text-sm">
            Seating…
          </div>
        </div>
      )}
    </AppShell>
  );
}
