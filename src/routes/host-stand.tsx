import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useBookings, useUpdateBooking } from "@/lib/v2-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FloorPlan, mainFloorPlan, type FloorItem } from "@/components/FloorPlan";
import { toast } from "sonner";
import {
  Clock, Users, StickyNote, UserPlus, CheckCircle2,
  CalendarDays, MapPin, Search, Minus, Plus, Maximize2, GripVertical,
} from "lucide-react";

export const Route = createFileRoute("/host-stand")({
  head: () => ({
    meta: [
      { title: "Host Stand — RestoStack" },
      { name: "description", content: "Front of house floor plan planner" },
    ],
  }),
  component: HostStandPage,
});

type Reservation = {
  id: string;
  time: string;
  name: string;
  phone: string;
  party: number;
  table?: string | number;
  status: "Upcoming" | "Arrived" | "Seated" | "Late";
  note?: string;
};

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

type PartyDrag =
  | { kind: "reservation"; id: string; name: string; party: number }
  | { kind: "waitlist"; id: string; name: string; party: number };

const SECTIONS = ["All", "Main", "Patio", "Bar", "Private"] as const;

function minutesSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function HostStandPage() {
  const { staff } = useAuth();
  const qc = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<number | string | null>(null);
  const [highlightResId, setHighlightResId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<(typeof SECTIONS)[number]>("All");
  const [zoom, setZoom] = useState(1);
  const [newName, setNewName] = useState("");
  const [newParty, setNewParty] = useState("2");
  const [newPhone, setNewPhone] = useState("");
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [dbTables, setDbTables] = useState<DbTable[]>([]);
  const [layoutOverride, setLayoutOverride] = useState<Record<string, { x: number; y: number }>>({});
  const [seatTarget, setSeatTarget] = useState<PartyDrag | null>(null);
  const [seatPick, setSeatPick] = useState<number | string | null>(null);
  const [seatingBusy, setSeatingBusy] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const { data: todays = [] } = useBookings(today);
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
        quoted_wait_minutes: 20 + input.party * 3,
        status: "waiting",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["v2_waitlist"] }),
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
      const { data } = await supabase
        .from("v2_tables")
        .select("id, table_number, section, capacity, shape, position_x, position_y, width, height")
        .eq("restaurant_id", staff.restaurant_id);
      setDbTables((data ?? []) as DbTable[]);
    })();
  }, [staff]);

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

  const RESERVATIONS = useMemo<Reservation[]>(
    () =>
      todays.map((b) => ({
        id: b.id,
        time: b.time,
        name: b.name,
        phone: b.phone,
        party: b.people,
        table: b.tableNumber ? Number(b.tableNumber) || b.tableNumber : undefined,
        status:
          b.status === "seated" || b.status === "completed"
            ? "Seated"
            : b.status === "no_show"
              ? "Late"
              : b.status === "confirmed"
                ? "Arrived"
                : "Upcoming",
        note: b.notes || undefined,
      })),
    [todays],
  );

  const upcoming = useMemo(
    () => RESERVATIONS.filter((r) => r.status !== "Seated"),
    [RESERVATIONS],
  );
  const seatedList = useMemo(
    () => RESERVATIONS.filter((r) => r.status === "Seated"),
    [RESERVATIONS],
  );

  const occupiedTableIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of seatedList) {
      if (s.table != null) set.add(String(s.table));
    }
    return set;
  }, [seatedList]);

  const q = search.trim().toLowerCase();
  const filterParty = <T extends { name?: string; guest_name?: string; phone?: string | null }>(
    rows: T[],
  ) => {
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.name ?? r.guest_name ?? "").toLowerCase();
      const phone = (r.phone ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  };

  const filteredUpcoming = filterParty(upcoming);
  const filteredSeated = filterParty(seatedList);
  const filteredWaitlist = filterParty(
    waitlist.map((w) => ({ ...w, name: w.guest_name })),
  );

  const baseFloorItems = useMemo<FloorItem[]>(() => {
    if (positionedTables.length === 0) return mainFloorPlan;
    return positionedTables
      .filter((t) => section === "All" || (t.section || "Main") === section)
      .map((t) => {
        const idNum = Number(t.table_number);
        const id: string | number = Number.isFinite(idNum) ? idNum : t.table_number;
        const ov = layoutOverride[String(id)] ?? layoutOverride[t.table_number];
        const x = ov?.x ?? t.position_x!;
        const y = ov?.y ?? t.position_y!;
        if (t.shape === "round") {
          return {
            kind: "round" as const,
            id,
            x,
            y,
            size: t.width ?? 60,
            label: t.table_number,
          };
        }
        return {
          kind: "rect" as const,
          id,
          x,
          y,
          w: t.width ?? 80,
          h: t.height ?? 60,
          label: t.table_number,
        };
      });
  }, [positionedTables, section, layoutOverride]);

  const floorItems = useMemo<FloorItem[]>(() => {
    return baseFloorItems.map((it) => {
      if (it.kind !== "round" && it.kind !== "rect") return it;
      if (it.id == null) return it;
      const key = String(it.id);
      const seated = seatedList.find((s) => String(s.table) === key);
      const upcomingAt = upcoming.find((r) => String(r.table) === key);
      if (seated) {
        return {
          ...it,
          status: "seated" as const,
          guest: seated.name,
          party: seated.party,
          time: seated.time,
        };
      }
      if (upcomingAt?.status === "Late") {
        return {
          ...it,
          status: "alert" as const,
          guest: upcomingAt.name,
          time: upcomingAt.time,
        };
      }
      if (upcomingAt) {
        return {
          ...it,
          status: "booked" as const,
          time: upcomingAt.time,
          guest: upcomingAt.name,
        };
      }
      return { ...it, status: "free" as const };
    });
  }, [baseFloorItems, seatedList, upcoming]);

  const markTableOccupied = async (tableNumber: string, bookingId: string | null) => {
    if (!staff?.restaurant_id) return;
    await supabase
      .from("v2_tables")
      .update({ status: "occupied", current_booking_id: bookingId } as never)
      .eq("restaurant_id", staff.restaurant_id)
      .eq("table_number", tableNumber);
  };

  const seatPartyAt = async (party: PartyDrag, tableId: number | string) => {
    if (occupiedTableIds.has(String(tableId))) {
      toast.error(`Table ${tableId} is occupied`);
      return;
    }
    const tableNumber = String(tableId);
    setSeatingBusy(true);
    try {
      if (party.kind === "waitlist") {
        await updateWaitlistMut.mutateAsync({
          id: party.id,
          status: "seated",
          table_number: tableNumber,
        });
        await markTableOccupied(tableNumber, null);
      } else {
        await updateBooking.mutateAsync({
          id: party.id,
          status: "seated",
          table_number: tableNumber,
        });
        await markTableOccupied(tableNumber, party.id);
      }
      setSelectedTable(tableId);
      setSeatTarget(null);
      setSeatPick(null);
      toast.success(`${party.name} seated at table ${tableNumber}`);
    } catch (e) {
      toast.error((e as Error).message || "Could not seat guest");
    } finally {
      setSeatingBusy(false);
    }
  };

  const onDropParty = (tableId: number | string, raw: string) => {
    try {
      const party = JSON.parse(raw) as PartyDrag;
      void seatPartyAt(party, tableId);
    } catch {
      toast.error("Invalid drop");
    }
  };

  const onMoveTable = async (tableId: number | string, x: number, y: number) => {
    const key = String(tableId);
    setLayoutOverride((prev) => ({ ...prev, [key]: { x, y } }));
    if (!staff?.restaurant_id || positionedTables.length === 0) return;
    const row = dbTables.find(
      (t) => t.table_number === key || String(Number(t.table_number)) === key,
    );
    if (!row) return;
    const { error } = await supabase
      .from("v2_tables")
      .update({ position_x: x, position_y: y })
      .eq("id", row.id);
    if (error) toast.error(error.message);
  };

  const startDragParty = (e: DragEvent, party: PartyDrag) => {
    e.dataTransfer.setData("application/x-party", JSON.stringify(party));
    e.dataTransfer.effectAllowed = "move";
  };

  const addWaitlist = () => {
    if (!newName.trim()) return;
    const party = parseInt(newParty, 10) || 2;
    addWaitlistMut.mutate(
      { name: newName.trim(), party, phone: newPhone.trim() },
      {
        onSuccess: () => {
          toast.success(`Added ${newName} to waitlist`);
          setNewName("");
          setNewParty("2");
          setNewPhone("");
        },
        onError: (e: unknown) => toast.error((e as Error).message || "Could not add"),
      },
    );
  };

  return (
    <AppShell fullBleed>
      <div className="flex-1 min-h-0 flex flex-col bg-[#1c1f24] text-zinc-100">
        {/* Top bar */}
        <header className="shrink-0 h-12 border-b border-zinc-700/80 px-3 sm:px-4 flex items-center gap-3 bg-[#22262c]">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="size-4 text-emerald-400" />
            <span>{todayLabel}</span>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-0">Dinner</Badge>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 ml-2">
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-zinc-300" /> Free</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-violet-300" /> Booked</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-violet-600" /> Seated</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-rose-400" /> Alert</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/floorplan"
              className="text-xs font-medium text-emerald-400 hover:underline hidden sm:inline"
            >
              Edit layout
            </Link>
            <span className="text-xs text-zinc-500 hidden lg:inline">
              Drag guests onto tables · drag tables to rearrange
            </span>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex">
          {/* Left sidebar */}
          <aside className="w-full max-w-[320px] shrink-0 border-r border-zinc-700/80 bg-[#252a31] flex flex-col min-h-0">
            <div className="p-3 border-b border-zinc-700/60">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or phone"
                  className="h-9 pl-8 bg-[#1c1f24] border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <section className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Reservations
                  </h2>
                  <Badge variant="outline" className="text-[10px] border-zinc-600 text-zinc-300">
                    {filteredUpcoming.length}
                  </Badge>
                </div>
                <ul className="space-y-1.5">
                  {filteredUpcoming.map((r) => {
                    const active = highlightResId === r.id;
                    const late = r.status === "Late";
                    const arrived = r.status === "Arrived";
                    return (
                      <li key={r.id}>
                        <div
                          draggable
                          onDragStart={(e) =>
                            startDragParty(e, {
                              kind: "reservation",
                              id: r.id,
                              name: r.name,
                              party: r.party,
                            })
                          }
                          onClick={() => {
                            setHighlightResId(r.id);
                            if (r.table != null) setSelectedTable(r.table);
                          }}
                          className={[
                            "flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-grab active:cursor-grabbing transition",
                            active
                              ? "border-emerald-500/50 bg-emerald-500/10"
                              : late
                                ? "border-rose-400/40 bg-rose-500/15"
                                : arrived
                                  ? "border-amber-400/30 bg-amber-500/10"
                                  : "border-zinc-700 bg-[#1c1f24] hover:bg-[#2a3038]",
                          ].join(" ")}
                        >
                          <GripVertical className="size-3.5 text-zinc-500 shrink-0" />
                          <div className="size-8 rounded-md bg-zinc-700/80 grid place-items-center text-xs font-bold shrink-0">
                            {r.party}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{r.name}</div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                              <Clock className="size-3" /> {r.time}
                              {r.note && <StickyNote className="size-3" />}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-semibold tabular-nums text-zinc-200">
                              {r.table ?? "—"}
                            </div>
                            <button
                              type="button"
                              className="text-[10px] text-emerald-400 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSeatTarget({
                                  kind: "reservation",
                                  id: r.id,
                                  name: r.name,
                                  party: r.party,
                                });
                                setSeatPick(r.table ?? selectedTable);
                              }}
                            >
                              Seat
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {filteredUpcoming.length === 0 && (
                    <li className="text-xs text-zinc-500 text-center py-6">No upcoming reservations</li>
                  )}
                </ul>
              </section>

              <section className="p-3 border-t border-zinc-700/60">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Seated
                  </h2>
                  <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-300">
                    {filteredSeated.length}
                  </Badge>
                </div>
                <ul className="space-y-1.5">
                  {filteredSeated.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setHighlightResId(r.id);
                          if (r.table != null) setSelectedTable(r.table);
                        }}
                        className="w-full flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-600/15 px-2.5 py-2 text-left hover:bg-violet-600/25"
                      >
                        <div className="size-8 rounded-md bg-violet-600 grid place-items-center text-xs font-bold shrink-0">
                          {r.party}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{r.name}</div>
                          <div className="text-[11px] text-violet-200/70">{r.time}</div>
                        </div>
                        <div className="text-xs font-bold tabular-nums">{r.table ?? "—"}</div>
                      </button>
                    </li>
                  ))}
                  {filteredSeated.length === 0 && (
                    <li className="text-xs text-zinc-500 text-center py-4">No one seated yet</li>
                  )}
                </ul>
              </section>

              {filteredWaitlist.length > 0 && (
                <section className="p-3 border-t border-zinc-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Waitlist
                    </h2>
                    <Badge variant="outline" className="text-[10px] border-zinc-600 text-zinc-300">
                      {filteredWaitlist.length}
                    </Badge>
                  </div>
                  <ul className="space-y-1.5">
                    {filteredWaitlist.map((w) => (
                      <li key={w.id}>
                        <div
                          draggable
                          onDragStart={(e) =>
                            startDragParty(e, {
                              kind: "waitlist",
                              id: w.id,
                              name: w.guest_name,
                              party: w.party_size,
                            })
                          }
                          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-[#1c1f24] px-2.5 py-2 cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="size-3.5 text-zinc-500" />
                          <div className="size-8 rounded-md bg-zinc-700 grid place-items-center text-xs font-bold">
                            {w.party_size}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{w.guest_name}</div>
                            <div className="text-[11px] text-zinc-400">
                              waited {minutesSince(w.created_at)}m
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-[10px] text-emerald-400 hover:underline"
                            onClick={() => {
                              setSeatTarget({
                                kind: "waitlist",
                                id: w.id,
                                name: w.guest_name,
                                party: w.party_size,
                              });
                              setSeatPick(selectedTable);
                            }}
                          >
                            Seat
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="shrink-0 border-t border-zinc-700/60 p-3 space-y-2 bg-[#1f242b]">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={() => setWaitlistOpen(true)}
              >
                <UserPlus className="size-4 mr-1.5" /> Reservation Waitlist
              </Button>
            </div>
          </aside>

          {/* Floor plan viewport */}
          <section className="flex-1 min-w-0 relative flex flex-col bg-[#1a1d22]">
            <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-auto flex items-center justify-center">
              <div className="w-full max-w-6xl">
                <FloorPlan
                  items={floorItems}
                  selectedId={selectedTable}
                  zoom={zoom}
                  onSelect={(id) => {
                    setSelectedTable(id);
                    const match = RESERVATIONS.find((r) => String(r.table) === String(id));
                    setHighlightResId(match?.id ?? null);
                  }}
                  onDropParty={onDropParty}
                  onMoveTable={onMoveTable}
                  className="shadow-2xl"
                />
                {positionedTables.length === 0 && (
                  <p className="text-center text-[11px] text-zinc-500 mt-2">
                    Demo layout — open{" "}
                    <Link to="/floorplan" className="text-emerald-400 underline">
                      Edit layout
                    </Link>{" "}
                    to place your tables, then drag them here anytime.
                  </p>
                )}
              </div>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <Select value={section} onValueChange={(v) => setSection(v as typeof section)}>
                <SelectTrigger className="h-9 w-[120px] bg-[#252a31] border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "All" ? "All floors" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-lg border border-zinc-700 bg-[#252a31] overflow-hidden">
                <button
                  type="button"
                  className="size-9 grid place-items-center hover:bg-zinc-700/50"
                  onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))))}
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  className="size-9 grid place-items-center hover:bg-zinc-700/50"
                  onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
                >
                  <Plus className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="size-9 grid place-items-center hover:bg-zinc-700/50 border-l border-zinc-700"
                  onClick={() => setZoom(1)}
                  title="Reset zoom"
                >
                  <Maximize2 className="size-3.5" />
                </button>
              </div>
            </div>

            {selectedTable != null && (
              <div className="absolute top-4 right-4 w-64 rounded-xl border border-zinc-700 bg-[#252a31]/95 backdrop-blur p-3 shadow-xl">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Selected table</div>
                <div className="text-2xl font-bold mt-0.5">{selectedTable}</div>
                {(() => {
                  const seated = seatedList.find((s) => String(s.table) === String(selectedTable));
                  const booked = upcoming.find((s) => String(s.table) === String(selectedTable));
                  if (seated) {
                    return (
                      <div className="mt-2 text-sm space-y-1">
                        <div className="flex items-center gap-1.5"><Users className="size-3.5 text-violet-300" /> {seated.name}</div>
                        <div className="text-xs text-zinc-400">Party of {seated.party} · {seated.time}</div>
                      </div>
                    );
                  }
                  if (booked) {
                    return (
                      <div className="mt-2 text-sm space-y-1">
                        <div className="flex items-center gap-1.5"><Users className="size-3.5" /> {booked.name}</div>
                        <div className="text-xs text-zinc-400">{booked.status} · {booked.time}</div>
                        <Button
                          size="sm"
                          className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500"
                          onClick={() => {
                            setSeatTarget({
                              kind: "reservation",
                              id: booked.id,
                              name: booked.name,
                              party: booked.party,
                            });
                            setSeatPick(selectedTable);
                          }}
                        >
                          Seat here
                        </Button>
                      </div>
                    );
                  }
                  return (
                    <p className="mt-2 text-xs text-zinc-400">
                      Free — drag a reservation here or tap Seat on a guest.
                    </p>
                  );
                })()}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Waitlist quick-add */}
      <Dialog open={waitlistOpen} onOpenChange={setWaitlistOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to waitlist</DialogTitle>
            <DialogDescription>Walk-in party — drag them onto a table when ready.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Guest name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <div className="flex gap-2">
              <Select value={newParty} onValueChange={setNewParty}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} guests</SelectItem>
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
            <Button variant="outline" onClick={() => setWaitlistOpen(false)}>Cancel</Button>
            <Button onClick={() => { addWaitlist(); setWaitlistOpen(false); }} disabled={!newName.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fallback seat picker */}
      <Dialog
        open={!!seatTarget}
        onOpenChange={(o) => {
          if (!o) {
            setSeatTarget(null);
            setSeatPick(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          {seatTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="size-4 text-emerald-500" />
                  Where should {seatTarget.name} sit?
                </DialogTitle>
                <DialogDescription>
                  Party of {seatTarget.party}. Tap a free table, or drag from the sidebar next time.
                </DialogDescription>
              </DialogHeader>
              <FloorPlan
                items={floorItems}
                selectedId={seatPick}
                onSelect={(id) => {
                  if (occupiedTableIds.has(String(id))) {
                    toast.message(`Table ${id} is occupied`);
                    return;
                  }
                  setSeatPick(id);
                }}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setSeatTarget(null)}>Cancel</Button>
                <Button
                  disabled={seatPick == null || seatingBusy}
                  onClick={() => seatPick != null && seatPartyAt(seatTarget, seatPick)}
                >
                  <CheckCircle2 className="size-4 mr-1" />
                  {seatPick != null ? `Seat at table ${seatPick}` : "Pick a table"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
