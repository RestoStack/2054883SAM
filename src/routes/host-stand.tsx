import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useBookings, useUpdateBooking } from "@/lib/v2-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Clock, Users, Phone, StickyNote, UserPlus, CheckCircle2, AlertCircle,
  CalendarClock, Utensils, Timer, MapPin,
} from "lucide-react";

type SeatTarget =
  | { kind: "waitlist"; id: string; name: string; party: number }
  | { kind: "reservation"; id: string; name: string; party: number; existingTable?: string | number };

export const Route = createFileRoute("/host-stand")({
  head: () => ({
    meta: [
      { title: "Host Stand — RestoStack" },
      { name: "description", content: "Floor plan, reservations and waitlist for hostesses" },
    ],
  }),
  component: HostStandPage,
});

type Reservation = {
  id: string; time: string; name: string; phone: string; party: number;
  table?: string | number; status: "Upcoming" | "Arrived" | "Seated" | "Late";
  note?: string; server?: string;
};

type DbTable = {
  id: string; table_number: string; section: string | null; capacity: number;
  shape: "round" | "square" | "rectangle"; position_x: number | null; position_y: number | null;
  width: number | null; height: number | null;
};

type WaitlistRow = {
  id: string; guest_name: string; party_size: number; phone: string | null;
  quoted_wait_minutes: number | null; status: string; created_at: string;
};

const SERVERS = ["Michael B.", "Sarah T.", "James W.", "Olivia M."];

const statusColor = (s: Reservation["status"]) =>
  s === "Arrived" ? "bg-success/15 text-success border-success/30"
  : s === "Seated"  ? "bg-muted text-muted-foreground border-border"
  : s === "Late"    ? "bg-destructive/15 text-destructive border-destructive/30"
                    : "bg-blue-50 text-blue-700 border-blue-200";

function minutesSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function fmtSeated(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function HostStandPage() {
  const { staff } = useAuth();
  const qc = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<number | string | null>(null);
  const [activeRes, setActiveRes] = useState<Reservation | null>(null);
  const [seatTarget, setSeatTarget] = useState<SeatTarget | null>(null);
  const [seatPick, setSeatPick] = useState<number | string | null>(null);
  const [seatingBusy, setSeatingBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParty, setNewParty] = useState("2");
  const [newPhone, setNewPhone] = useState("");
  const [dbTables, setDbTables] = useState<DbTable[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const { data: todays = [] } = useBookings(today);
  const updateBooking = useUpdateBooking();

  const { data: waitlist = [] } = useQuery({
    queryKey: ["v2_waitlist", staff?.restaurant_id],
    enabled: !!staff?.restaurant_id,
    queryFn: async (): Promise<WaitlistRow[]> => {
      const { data, error } = await supabase
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
      const { error } = await supabase.from("v2_waitlist").insert({
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
      const { error } = await supabase.from("v2_waitlist").update(patch).eq("id", input.id);
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
    () => dbTables.filter((t) => t.position_x != null && t.position_y != null && (t.position_x !== 0 || t.position_y !== 0)),
    [dbTables]
  );

  const floorItems = useMemo<FloorItem[]>(() => {
    if (positionedTables.length === 0) return mainFloorPlan;
    return positionedTables.map((t) => {
      const idNum = Number(t.table_number);
      const id: string | number = Number.isFinite(idNum) ? idNum : t.table_number;
      if (t.shape === "round") {
        return { kind: "round", id, x: t.position_x!, y: t.position_y!, size: t.width ?? 60, label: t.table_number };
      }
      return { kind: "rect", id, x: t.position_x!, y: t.position_y!, w: t.width ?? 80, h: t.height ?? 60, label: t.table_number };
    });
  }, [positionedTables]);

  const RESERVATIONS = useMemo<Reservation[]>(
    () =>
      todays.map((b) => ({
        id: b.id,
        time: b.time,
        name: b.name,
        phone: b.phone,
        party: b.people,
        table: b.tableNumber ? (Number(b.tableNumber) || b.tableNumber) : undefined,
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
    [todays]
  );

  const seatedList = useMemo(
    () =>
      todays
        .filter((b) => b.status === "seated")
        .map((b) => ({
          id: b.id,
          table: b.tableNumber ? (Number(b.tableNumber) || b.tableNumber) : "—",
          guest: b.name,
          party: b.people,
          server: SERVERS[0],
        })),
    [todays]
  );

  const occupiedTableIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of seatedList) {
      if (s.table != null && s.table !== "—") set.add(String(s.table));
    }
    return set;
  }, [seatedList]);

  const floorItemsWithStatus = useMemo<FloorItem[]>(
    () =>
      floorItems.map((it) => {
        if (it.kind !== "round" && it.kind !== "rect") return it;
        if (it.id == null) return it;
        const occupied = occupiedTableIds.has(String(it.id));
        return { ...it, status: occupied ? "booked" : "free" };
      }),
    [floorItems, occupiedTableIds],
  );

  const matchedRes = selectedTable != null ? RESERVATIONS.find((r) => r.table === selectedTable) : null;
  const matchedSeated = selectedTable != null ? seatedList.find((s) => s.table === selectedTable) : null;

  const openSeatPicker = (target: SeatTarget) => {
    const pre =
      selectedTable ??
      ("existingTable" in target ? target.existingTable ?? null : null);
    const usable =
      pre != null && !occupiedTableIds.has(String(pre)) ? pre : null;
    setSeatPick(usable);
    setSeatTarget(target);
    setActiveRes(null);
  };

  const markTableOccupied = async (tableNumber: string, bookingId: string | null) => {
    if (!staff?.restaurant_id) return;
    await supabase
      .from("v2_tables")
      .update({ status: "occupied", current_booking_id: bookingId } as never)
      .eq("restaurant_id", staff.restaurant_id)
      .eq("table_number", tableNumber);
  };

  const addWaitlist = () => {
    if (!newName.trim()) return;
    const party = parseInt(newParty) || 2;
    addWaitlistMut.mutate(
      { name: newName.trim(), party, phone: newPhone.trim() },
      {
        onSuccess: () => {
          toast.success(`Added ${newName} (${party}) to waitlist`);
          setNewName(""); setNewParty("2"); setNewPhone("");
        },
        onError: (e: unknown) => toast.error((e as Error).message || "Could not add"),
      }
    );
  };

  const askSeatWaitlist = (id: string) => {
    const w = waitlist.find((x) => x.id === id);
    if (!w) return;
    openSeatPicker({ kind: "waitlist", id: w.id, name: w.guest_name, party: w.party_size });
  };

  const removeWaitlist = (id: string) => {
    updateWaitlistMut.mutate({ id, status: "cancelled" });
  };

  const markArrived = (res: Reservation) => {
    updateBooking.mutate(
      { id: res.id, status: "confirmed" },
      { onSuccess: () => { toast.success(`${res.name} marked arrived`); setActiveRes(null); } }
    );
  };

  const askSeatReservation = (res: Reservation) => {
    openSeatPicker({
      kind: "reservation",
      id: res.id,
      name: res.name,
      party: res.party,
      existingTable: res.table,
    });
  };

  const confirmSeat = async () => {
    if (!seatTarget) return;
    if (seatPick == null) {
      toast.error("Tap a table on the floor plan");
      return;
    }
    if (occupiedTableIds.has(String(seatPick))) {
      toast.error("That table is already occupied — pick another");
      return;
    }

    const tableNumber = String(seatPick);
    setSeatingBusy(true);
    try {
      if (seatTarget.kind === "waitlist") {
        await updateWaitlistMut.mutateAsync({
          id: seatTarget.id,
          status: "seated",
          table_number: tableNumber,
        });
        await markTableOccupied(tableNumber, null);
        toast.success(`${seatTarget.name} seated at table ${tableNumber}`);
      } else {
        await updateBooking.mutateAsync({
          id: seatTarget.id,
          status: "seated",
          table_number: tableNumber,
        });
        await markTableOccupied(tableNumber, seatTarget.id);
        toast.success(`${seatTarget.name} seated at table ${tableNumber}`);
      }
      setSelectedTable(seatPick);
      setSeatTarget(null);
      setSeatPick(null);
    } catch (e) {
      toast.error((e as Error).message || "Could not seat guest");
    } finally {
      setSeatingBusy(false);
    }
  };

  const markSelectedSeated = () => {
    if (!matchedRes) {
      toast.message(`No reservation on table ${selectedTable}`);
      return;
    }
    askSeatReservation(matchedRes);
  };

  const seatNextWaitlistHere = () => {
    if (selectedTable == null) return;
    if (occupiedTableIds.has(String(selectedTable))) {
      toast.error("This table is occupied");
      return;
    }
    const next = waitlist[0];
    if (!next) {
      toast.message("No one on the waitlist");
      return;
    }
    openSeatPicker({ kind: "waitlist", id: next.id, name: next.guest_name, party: next.party_size });
    setSeatPick(selectedTable);
  };

  // KPIs from real data
  const covers = todays.reduce((s, b) => s + (b.people || 0), 0);
  const remaining = todays.filter((b) => b.status === "pending" || b.status === "confirmed").length;
  const nextRes = todays.find((b) => b.status === "pending" || b.status === "confirmed");
  const tablesSeated = todays.filter((b) => b.status === "seated").length;
  const totalTables = dbTables.length || positionedTables.length || 0;
  const avgWait = waitlist.length
    ? Math.round(waitlist.reduce((s, w) => s + minutesSince(w.created_at), 0) / waitlist.length)
    : 0;

  return (
    <AppShell>
      <div className="px-4 sm:px-8 pt-4 pb-12 space-y-6">
        <PageHeader
          title="Host Stand"
          description="Floor, reservations and waitlist"
        />

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Tonight's covers",   value: String(covers),  hint: `${todays.length} bookings`, icon: Users },
            { label: "Reservations left",  value: String(remaining),  hint: nextRes ? `next at ${nextRes.time}` : "—",  icon: CalendarClock },
            { label: "Tables seated",      value: totalTables ? `${tablesSeated} / ${totalTables}` : String(tablesSeated), hint: totalTables ? `${Math.round((tablesSeated / totalTables) * 100)}% occupancy` : "—", icon: Utensils },
            { label: "Avg wait time",      value: `${avgWait} min`,  hint: `${waitlist.length} waiting`, icon: Timer },
          ].map(({ label, value, hint, icon: Icon }) => (
            <Card key={label} className="p-4 bg-muted/40 border-0 rounded-xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
                </div>
                <Icon className="size-4 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Floor plan */}
          <Card className="xl:col-span-2 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Floor plan</h2>
                <p className="text-xs text-muted-foreground">
                  Tap any table to seat a guest or view status
                  {positionedTables.length === 0 && " · using demo layout"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-zinc-300" /> Free</span>
                <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-zinc-700" /> Booked</span>
                <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-red-500" /> Alert</span>
                <Link to="/floorplan" className="text-success hover:underline font-medium">Edit floor plan</Link>
              </div>
            </div>
            <FloorPlan
              items={floorItemsWithStatus}
              selectedId={selectedTable}
              onSelect={(id) => setSelectedTable(id)}
            />
          </Card>

          {/* Right column — Waitlist + selected info */}
          <div className="space-y-4">
            <Card className="p-4 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground">Waitlist</h2>
                <Badge variant="outline" className="text-[10px]">{waitlist.length} parties</Badge>
              </div>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Guest name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9"
                />
                <Select value={newParty} onValueChange={setNewParty}>
                  <SelectTrigger className="w-20 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addWaitlist} className="h-9" disabled={addWaitlistMut.isPending}>
                  <UserPlus className="size-4" />
                </Button>
              </div>
              <Input
                placeholder="Phone (optional)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-9 mb-3"
              />
              <ul className="space-y-2">
                {waitlist.map((w) => {
                  const waited = minutesSince(w.created_at);
                  return (
                    <li key={w.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{w.guest_name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <Users className="size-3" />{w.party_size}
                          <Clock className="size-3 ml-1" />waited {waited}m · quoted {w.quoted_wait_minutes ?? 20}m
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => askSeatWaitlist(w.id)}>Seat</Button>
                        <Button size="sm" variant="ghost" onClick={() => removeWaitlist(w.id)}>×</Button>
                      </div>
                    </li>
                  );
                })}
                {waitlist.length === 0 && (
                  <li className="text-xs text-muted-foreground text-center py-4">No one waiting.</li>
                )}
              </ul>
            </Card>

            <Card className="p-4 rounded-xl">
              <h2 className="text-lg font-semibold text-foreground mb-3">Selected table</h2>
              {!selectedTable && (
                <p className="text-sm text-muted-foreground">Tap a table on the floor plan to see details and seat guests.</p>
              )}
              {selectedTable && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Table</div>
                      <div className="text-2xl font-semibold">{selectedTable}</div>
                    </div>
                  </div>
                  {matchedSeated && (
                    <div className="rounded-lg border border-border p-3 text-sm space-y-1">
                      <div className="flex items-center gap-2"><Users className="size-3.5 text-muted-foreground" /> {matchedSeated.guest} · party of {matchedSeated.party}</div>
                      <div className="text-xs text-muted-foreground">Server: <span className="text-foreground">{matchedSeated.server}</span></div>
                    </div>
                  )}
                  {matchedRes && !matchedSeated && (
                    <button
                      onClick={() => setActiveRes(matchedRes)}
                      className="w-full text-left rounded-lg border border-border p-3 hover:bg-accent transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{matchedRes.name}</span>
                        <Badge variant="outline" className={statusColor(matchedRes.status)}>{matchedRes.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{matchedRes.time} · party of {matchedRes.party}</div>
                      {matchedRes.note && (
                        <div className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1">
                          <StickyNote className="size-3 mt-0.5" /> {matchedRes.note}
                        </div>
                      )}
                    </button>
                  )}
                  {!matchedRes && !matchedSeated && (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-3">
                        Table free. Seat the next waitlist party here.
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={seatNextWaitlistHere}
                        disabled={waitlist.length === 0}
                      >
                        <MapPin className="size-4 mr-1" /> Seat next waitlist here
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={markSelectedSeated} disabled={!matchedRes || updateBooking.isPending}>
                      <CheckCircle2 className="size-4 mr-1" /> Seat guest
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => toast.message(`Server assigned to table ${selectedTable}`)}>
                      Assign server
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Reservations + Seated tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Tonight's reservations</h2>
              <Badge variant="outline" className="text-[10px]">{RESERVATIONS.length} bookings</Badge>
            </div>
            <ul className="divide-y divide-border">
              {RESERVATIONS.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => { setActiveRes(r); if (r.table) setSelectedTable(r.table); }}
                    className="w-full text-left py-2.5 px-1 hover:bg-accent/40 rounded-md transition flex items-center gap-3"
                  >
                    <div className="w-16 text-sm font-semibold text-foreground">{r.time}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Party {r.party} · Table {r.table ?? "—"}
                        {r.note && <span className="ml-2 inline-flex items-center gap-1"><StickyNote className="size-3" />note</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColor(r.status) + " text-[10px]"}>{r.status}</Badge>
                  </button>
                </li>
              ))}
              {RESERVATIONS.length === 0 && (
                <li className="text-sm text-muted-foreground text-center py-6">No reservations today.</li>
              )}
            </ul>
          </Card>

          <Card className="p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Seated tables</h2>
              <Badge variant="outline" className="text-[10px]">{seatedList.length} active</Badge>
            </div>
            <ul className="space-y-2">
              {seatedList.map((s) => {
                const b = todays.find((x) => x.id === s.id);
                const waited = b ? minutesSince(`${b.date}T${b.rawTime}`) : 0;
                return (
                  <li key={s.id} className="rounded-lg border border-border p-3 flex items-center gap-3">
                    <div className="size-9 rounded-md bg-muted flex items-center justify-center text-xs font-semibold">{s.table}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.guest} · {s.party}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Timer className="size-3" /> {waited > 0 ? `${waited}m` : fmtSeated(new Date().toISOString())}
                        <span>· {s.server}</span>
                        {waited > 90 && <AlertCircle className="size-3 text-amber-600" />}
                      </div>
                    </div>
                  </li>
                );
              })}
              {seatedList.length === 0 && (
                <li className="text-sm text-muted-foreground text-center py-6">No tables seated yet.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>

      <Sheet open={!!activeRes} onOpenChange={(o) => !o && setActiveRes(null)}>
        <SheetContent className="sm:max-w-md">
          {activeRes && (
            <>
              <SheetHeader>
                <SheetTitle>{activeRes.name}</SheetTitle>
                <SheetDescription>{activeRes.time} · party of {activeRes.party}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-[11px] text-muted-foreground">Table</div>
                    <div className="font-semibold">{activeRes.table ?? "—"}</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-[11px] text-muted-foreground">Status</div>
                    <div className="font-semibold">{activeRes.status}</div>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Phone className="size-3.5 text-muted-foreground" /> {activeRes.phone || "—"}</div>
                  {activeRes.note && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <StickyNote className="size-3.5 mt-0.5" /> <span className="text-foreground">{activeRes.note}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Assign server</label>
                  <Select defaultValue={activeRes.server ?? SERVERS[0]}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={() => markArrived(activeRes)} disabled={updateBooking.isPending}>
                    Mark arrived
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => askSeatReservation(activeRes)}
                    disabled={updateBooking.isPending || activeRes.status === "Seated"}
                  >
                    Seat now
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!seatTarget} onOpenChange={(o) => { if (!o) { setSeatTarget(null); setSeatPick(null); } }}>
        <DialogContent className="sm:max-w-3xl">
          {seatTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Where should {seatTarget.name} sit?</DialogTitle>
                <DialogDescription>
                  Party of {seatTarget.party}. Tap a free table on the floor plan, then confirm.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-zinc-300" /> Free</span>
                  <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-zinc-700" /> Occupied</span>
                  {seatPick != null && (
                    <Badge variant="outline" className="text-[11px] border-success/40 text-success">
                      Selected table {seatPick}
                    </Badge>
                  )}
                  {positionedTables.length === 0 && (
                    <span className="text-amber-600">Using demo layout — edit floor plan to save your own</span>
                  )}
                </div>
                <FloorPlan
                  items={floorItemsWithStatus}
                  selectedId={seatPick}
                  onSelect={(id) => {
                    if (occupiedTableIds.has(String(id))) {
                      toast.message(`Table ${id} is occupied`);
                      return;
                    }
                    setSeatPick(id);
                    setSelectedTable(id);
                  }}
                  className="max-h-[420px]"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setSeatTarget(null); setSeatPick(null); }}
                  disabled={seatingBusy}
                >
                  Cancel
                </Button>
                <Button onClick={confirmSeat} disabled={seatPick == null || seatingBusy}>
                  {seatingBusy ? "Seating…" : `Seat at table ${seatPick ?? "—"}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
