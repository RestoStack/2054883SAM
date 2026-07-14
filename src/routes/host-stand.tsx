import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useBookings, useUpdateBooking } from "@/lib/v2-data";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FloorPlan, mainFloorPlan, type FloorItem } from "@/components/FloorPlan";
import { toast } from "sonner";
import {
  Clock, Users, Phone, StickyNote, UserPlus, CheckCircle2, AlertCircle,
  CalendarClock, Utensils, Timer, Loader2,
} from "lucide-react";

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
  note?: string; server?: string; rawStatus: string;
};

type DbTable = {
  id: string; table_number: string; section: string | null; capacity: number;
  shape: "round" | "square" | "rectangle"; position_x: number | null; position_y: number | null;
  width: number | null; height: number | null;
};

type Waitlist = {
  id: string; name: string; party: number; quoted: number; waited: number; phone: string;
};

type SeatedTable = {
  id: string; table: string | number; guest: string; party: number;
  seatedAt: string; minutes: number; server: string;
};

const SERVERS = ["Michael B.", "Sarah T.", "James W.", "Olivia M."];

const statusColor = (s: Reservation["status"]) =>
  s === "Arrived" ? "bg-success/15 text-success border-success/30"
  : s === "Seated"  ? "bg-muted text-muted-foreground border-border"
  : s === "Late"    ? "bg-destructive/15 text-destructive border-destructive/30"
                    : "bg-blue-50 text-blue-700 border-blue-200";

function HostStandPage() {
  const { staff } = useAuth();
  const updateBooking = useUpdateBooking();
  const [selectedTable, setSelectedTable] = useState<number | string | null>(null);
  const [activeRes, setActiveRes] = useState<Reservation | null>(null);
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [waitLoading, setWaitLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParty, setNewParty] = useState("2");
  const [dbTables, setDbTables] = useState<DbTable[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const { data: todays = [], isLoading: bookingsLoading } = useBookings(today);

  const loadWaitlist = useCallback(async () => {
    if (!staff) return;
    setWaitLoading(true);
    const { data, error } = await supabase
      .from("v2_waitlist")
      .select("id, guest_name, party_size, phone, quoted_wait_minutes, status, created_at")
      .eq("restaurant_id", staff.restaurant_id)
      .in("status", ["waiting", "notified"])
      .order("created_at", { ascending: true });
    setWaitLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    setWaitlist(
      (data ?? []).map((w) => {
        const waited = Math.max(
          0,
          Math.floor((Date.now() - new Date(w.created_at).getTime()) / 60000),
        );
        return {
          id: w.id,
          name: w.guest_name,
          party: w.party_size,
          quoted: w.quoted_wait_minutes ?? 15,
          waited,
          phone: w.phone || "—",
        };
      }),
    );
  }, [staff]);

  useEffect(() => {
    if (!staff) return;
    (async () => {
      const { data } = await supabase
        .from("v2_tables")
        .select("id, table_number, section, capacity, shape, position_x, position_y, width, height")
        .eq("restaurant_id", staff.restaurant_id);
      setDbTables((data ?? []) as DbTable[]);
    })();
    loadWaitlist();
  }, [staff, loadWaitlist]);

  const positionedTables = useMemo(
    () => dbTables.filter((t) => t.position_x != null && t.position_y != null && (t.position_x !== 0 || t.position_y !== 0)),
    [dbTables],
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
      todays
        .filter((b) => b.status !== "cancelled" && b.status !== "completed")
        .map((b) => ({
          id: b.id,
          time: b.time,
          name: b.name,
          phone: b.phone,
          party: b.people,
          table: b.tableNumber
            ? (Number(b.tableNumber.replace(/\D/g, "")) || b.tableNumber)
            : undefined,
          status:
            b.status === "seated"
              ? "Seated"
              : b.status === "no_show"
                ? "Late"
                : "Upcoming",
          note: b.notes || undefined,
          rawStatus: b.status,
        })),
    [todays],
  );

  const SEATED = useMemo<SeatedTable[]>(
    () =>
      todays
        .filter((b) => b.status === "seated")
        .map((b) => ({
          id: b.id,
          table: b.tableNumber
            ? (Number(b.tableNumber.replace(/\D/g, "")) || b.tableNumber)
            : "—",
          guest: b.name,
          party: b.people,
          seatedAt: b.time,
          minutes: 0,
          server: "Floor",
        })),
    [todays],
  );

  const matchedRes = selectedTable != null
    ? RESERVATIONS.find((r) => String(r.table) === String(selectedTable) && r.status !== "Seated")
    : null;
  const matchedSeated = selectedTable
    ? SEATED.find((s) => String(s.table) === String(selectedTable))
    : null;

  const coversTonight = todays
    .filter((b) => b.status !== "cancelled" && b.status !== "no_show")
    .reduce((sum, b) => sum + b.people, 0);
  const reservationsLeft = RESERVATIONS.filter((r) => r.status === "Upcoming" || r.status === "Arrived").length;

  const markBooking = async (
    bookingId: string,
    status: "confirmed" | "seated" | "no_show",
    tableNumber?: string | null,
  ) => {
    try {
      await updateBooking.mutateAsync({
        id: bookingId,
        status,
        table_number: tableNumber,
      });
      toast.success(
        status === "seated"
          ? "Guest seated"
          : status === "confirmed"
            ? "Marked arrived"
            : "Updated booking",
      );
      setActiveRes(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update booking");
    }
  };

  const addWaitlist = async () => {
    if (!newName.trim() || !staff) return;
    const party = parseInt(newParty) || 2;
    const quoted = 20 + party * 3;
    const { error } = await supabase.from("v2_waitlist").insert({
      restaurant_id: staff.restaurant_id,
      guest_name: newName.trim(),
      party_size: party,
      quoted_wait_minutes: quoted,
      status: "waiting",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewName("");
    setNewParty("2");
    toast.success(`Added ${newName} (${party}) to waitlist`);
    loadWaitlist();
  };

  const seatWaitlist = async (id: string) => {
    const w = waitlist.find((x) => x.id === id);
    const tableNum = selectedTable != null ? String(selectedTable) : null;
    const { error } = await supabase
      .from("v2_waitlist")
      .update({ status: "seated", table_number: tableNum })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      tableNum
        ? `${w?.name} seated at table ${tableNum}`
        : `${w?.name} seated — pick a table on the floor if needed`,
    );
    loadWaitlist();
  };

  return (
    <AppShell>
      <div className="px-4 sm:px-8 pt-4 pb-12 space-y-6">
        <PageHeader
          title="Host Stand"
          description="Floor, reservations and waitlist"
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Tonight's covers", value: String(coversTonight), hint: "party sizes combined", icon: Users },
            { label: "Reservations left", value: String(reservationsLeft), hint: "not yet seated", icon: CalendarClock },
            { label: "Tables seated", value: `${SEATED.length}`, hint: "active seated bookings", icon: Utensils },
            { label: "Waitlist", value: String(waitlist.length), hint: "parties waiting", icon: Timer },
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
                <Link to="/floorplan" className="text-success hover:underline font-medium">Edit floor plan</Link>
              </div>
            </div>
            <FloorPlan
              items={floorItems}
              selectedId={selectedTable}
              onSelect={(id) => setSelectedTable(id)}
            />
          </Card>

          <div className="space-y-4">
            <Card className="p-4 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground">Waitlist</h2>
                <Badge variant="outline" className="text-[10px]">{waitlist.length} parties</Badge>
              </div>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Guest name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9"
                />
                <Select value={newParty} onValueChange={setNewParty}>
                  <SelectTrigger className="w-20 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addWaitlist} className="h-9" disabled={!staff}>
                  <UserPlus className="size-4" />
                </Button>
              </div>
              {waitLoading ? (
                <div className="text-xs text-muted-foreground flex items-center gap-2 py-4 justify-center">
                  <Loader2 className="size-3.5 animate-spin" /> Loading…
                </div>
              ) : (
                <ul className="space-y-2">
                  {waitlist.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{w.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <Users className="size-3" />{w.party}
                          <Clock className="size-3 ml-1" />waited {w.waited}m · quoted {w.quoted}m
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => seatWaitlist(w.id)}>
                        Seat
                      </Button>
                    </li>
                  ))}
                  {waitlist.length === 0 && (
                    <li className="text-xs text-muted-foreground text-center py-4">No one waiting.</li>
                  )}
                </ul>
              )}
            </Card>

            <Card className="p-4 rounded-xl">
              <h2 className="text-lg font-semibold text-foreground mb-3">Selected table</h2>
              {!selectedTable && (
                <p className="text-sm text-muted-foreground">Tap a table on the floor plan to see details and seat guests.</p>
              )}
              {selectedTable && (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Table</div>
                    <div className="text-2xl font-semibold">{selectedTable}</div>
                  </div>
                  {matchedSeated && (
                    <div className="rounded-lg border border-border p-3 text-sm space-y-1">
                      <div className="flex items-center gap-2"><Users className="size-3.5 text-muted-foreground" /> {matchedSeated.guest} · party of {matchedSeated.party}</div>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Timer className="size-3.5" /> Seated for {matchedSeated.seatedAt}</div>
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
                    </button>
                  )}
                  {!matchedRes && !matchedSeated && (
                    <div className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-3">
                      Table free. Seat the next waitlist party here.
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={!matchedRes || updateBooking.isPending}
                      onClick={() => matchedRes && markBooking(matchedRes.id, "seated", String(selectedTable))}
                    >
                      <CheckCircle2 className="size-4 mr-1" /> Mark seated
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => toast.message(`Assign a server from the reservation drawer`)}
                    >
                      Assign server
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Tonight's reservations</h2>
              <Badge variant="outline" className="text-[10px]">{RESERVATIONS.length} bookings</Badge>
            </div>
            {bookingsLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2 py-6 justify-center">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : RESERVATIONS.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No reservations for today yet.</p>
            ) : (
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
              </ul>
            )}
          </Card>

          <Card className="p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Seated tables</h2>
              <Badge variant="outline" className="text-[10px]">{SEATED.length} active</Badge>
            </div>
            <ul className="space-y-2">
              {SEATED.map((s) => (
                <li key={s.id} className="rounded-lg border border-border p-3 flex items-center gap-3">
                  <div className="size-9 rounded-md bg-muted flex items-center justify-center text-xs font-semibold">{s.table}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.guest} · {s.party}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Timer className="size-3" /> {s.seatedAt}
                      {s.minutes > 30 && <AlertCircle className="size-3 text-amber-600" />}
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Seated</Badge>
                </li>
              ))}
              {SEATED.length === 0 && (
                <li className="text-sm text-muted-foreground text-center py-6">No seated tables yet.</li>
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
                    <div className="font-semibold">{activeRes.table ?? selectedTable ?? "—"}</div>
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
                      {SERVERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    disabled={updateBooking.isPending}
                    onClick={() => markBooking(activeRes.id, "confirmed", activeRes.table != null ? String(activeRes.table) : null)}
                  >
                    Mark arrived
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={updateBooking.isPending}
                    onClick={() =>
                      markBooking(
                        activeRes.id,
                        "seated",
                        activeRes.table != null
                          ? String(activeRes.table)
                          : selectedTable != null
                            ? String(selectedTable)
                            : null,
                      )
                    }
                  >
                    Seat now
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
