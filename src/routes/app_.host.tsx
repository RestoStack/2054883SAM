import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FloorPlan,
  normalizeFloorLayout,
  type FloorItem,
  type FloorStatus,
} from "@/components/FloorPlan";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  formatTimeLabel,
  hostCreateWalkIn,
  hostListFloor,
  hostSeat,
  hostSetTableStatus,
  hostUnseat,
  isLunchTime,
  localDateISO,
  type HostFloorReservation,
  type HostFloorTable,
} from "@/lib/host-stand-api";
import { settingsListLocations } from "@/lib/settings-api";
import {
  Armchair,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  UserX,
  Users,
  X,
} from "lucide-react";

export const Route = createFileRoute("/app_/host")({
  head: () => ({
    meta: [
      { title: "Host Stand — RestoStack" },
      { name: "description", content: "Live floor plan and reservation timeline" },
    ],
  }),
  component: HostStandLive,
});

type MealPeriod = "Lunch" | "Dinner";
type TargetMode = "assign" | "seat";
type Target = { id: string; name: string; party: number; mode: TargetMode };

/** Round a HH:MM(:SS) time string down to its enclosing 15-minute block key, e.g. "12:07" -> "12:00". */
function blockKeyFor(time: string): string {
  const raw = (time ?? "").slice(0, 5);
  const [hStr, mStr] = raw.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "00:00";
  const flooredM = Math.floor(m / 15) * 15;
  return `${String(h).padStart(2, "0")}:${String(flooredM).padStart(2, "0")}`;
}

function groupInto15MinBlocks(
  reservations: HostFloorReservation[],
): Array<{ key: string; label: string; items: HostFloorReservation[] }> {
  const map = new Map<string, HostFloorReservation[]>();
  for (const r of reservations) {
    const key = blockKeyFor(r.reserved_time);
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, items]) => ({
      key,
      label: formatTimeLabel(`${key}:00`),
      items: items.slice().sort((a, b) => a.reserved_time.localeCompare(b.reserved_time)),
    }));
}

const statusDot: Record<HostFloorReservation["status"], string> = {
  pending: "bg-sky-500",
  confirmed: "bg-sky-500",
  seated: "bg-emerald-500",
  completed: "bg-stone-400",
  cancelled: "bg-stone-400",
  no_show: "bg-rose-500",
};

function tableToFloorItem(t: HostFloorTable, reservations: HostFloorReservation[]): FloorItem {
  const kind = t.shape === "round" ? "round" : "rect";
  const current = t.current_reservation_id
    ? reservations.find((r) => r.id === t.current_reservation_id)
    : reservations.find(
        (r) =>
          r.table_id === t.id &&
          (r.status === "seated" || r.status === "confirmed" || r.status === "pending"),
      );

  const statusMap: Record<HostFloorTable["status"], FloorStatus> = {
    available: "free",
    reserved: "booked",
    occupied: "seated",
    cleaning: "waiting",
    blocked: "alert",
  };

  const base = {
    id: t.id,
    label: t.table_number,
    status: statusMap[t.status],
    guestLabel: current ? abbreviateGuest(current.guest_name) : undefined,
    party: current?.party_size,
    time: current ? formatTimeLabel(current.reserved_time) : undefined,
  } as const;

  if (kind === "round") {
    return {
      kind: "round",
      x: t.position_x ?? 0,
      y: t.position_y ?? 0,
      size: t.width ?? 72,
      ...base,
    };
  }
  return {
    kind: "rect",
    x: t.position_x ?? 0,
    y: t.position_y ?? 0,
    w: t.width ?? 90,
    h: t.height ?? 60,
    ...base,
  };
}

function abbreviateGuest(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 10);
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function HostStandLive() {
  const { org, staff } = useAuth();
  const orgId = org.activeOrganizationId;
  const restaurantId = staff?.restaurant_id ?? null;
  const tenantReady = Boolean(orgId || restaurantId);
  const scopeId = orgId ?? restaurantId ?? "";
  const [locationId, setLocationId] = useState(org.activeLocationId ?? "");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const dateISO = useMemo(() => localDateISO(), []);
  const [period, setPeriod] = useState<MealPeriod>(() =>
    new Date().getHours() < 16 ? "Lunch" : "Dinner",
  );

  const [tables, setTables] = useState<HostFloorTable[]>([]);
  const [reservations, setReservations] = useState<HostFloorReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkName, setWalkName] = useState("");
  const [walkParty, setWalkParty] = useState(2);
  const [walkNotes, setWalkNotes] = useState("");

  const stateRef = useRef({ tables, reservations });
  stateRef.current = { tables, reservations };

  const refresh = useCallback(async () => {
    if (!tenantReady) {
      setLoading(false);
      setTables([]);
      setReservations([]);
      return;
    }
    const res = await hostListFloor(
      orgId,
      locationId || null,
      dateISO,
      restaurantId,
    );
    if (!res.ok) {
      toast.error(res.error);
      setLoading(false);
      return;
    }
    setTables(res.tables);
    setReservations(res.reservations);
    setLoading(false);
  }, [tenantReady, orgId, locationId, dateISO, restaurantId]);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const res = await settingsListLocations(orgId);
      const locs = (
        res.ok && Array.isArray((res as any).locations) ? (res as any).locations : []
      ) as Array<{
        id: string;
        name: string;
      }>;
      setLocations(locs);
      const preferred =
        (org.activeLocationId && locs.find((l) => l.id === org.activeLocationId)?.id) ||
        locs[0]?.id ||
        "";
      setLocationId((prev) => prev || preferred);
    })();
  }, [orgId, org.activeLocationId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  // Realtime: org reservations or legacy v2_bookings
  useEffect(() => {
    if (!tenantReady) return;
    const channel = supabase.channel(`host-stand:${scopeId || "legacy"}`);
    if (orgId && locationId) {
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "reservations",
            filter: `location_id=eq.${locationId}`,
          },
          () => void refresh(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tables",
            filter: `location_id=eq.${locationId}`,
          },
          () => void refresh(),
        );
    } else if (restaurantId) {
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "v2_bookings",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          () => void refresh(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "v2_tables",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          () => void refresh(),
        );
    }
    void channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantReady, orgId, locationId, restaurantId, scopeId, refresh]);

  const periodReservations = useMemo(
    () =>
      reservations.filter((r) =>
        period === "Lunch" ? isLunchTime(r.reserved_time) : !isLunchTime(r.reserved_time),
      ),
    [reservations, period],
  );
  const activeReservations = useMemo(
    () => periodReservations.filter((r) => r.status !== "cancelled" && r.status !== "completed"),
    [periodReservations],
  );
  const blocks = useMemo(() => groupInto15MinBlocks(activeReservations), [activeReservations]);

  const seatedCount = useMemo(
    () => periodReservations.filter((r) => r.status === "seated").length,
    [periodReservations],
  );
  const upcomingCount = useMemo(
    () =>
      periodReservations.filter((r) => r.status === "pending" || r.status === "confirmed").length,
    [periodReservations],
  );

  const floorItems: FloorItem[] = useMemo(() => {
    const positioned = tables.filter(
      (t) =>
        t.position_x != null && t.position_y != null && !(t.position_x === 0 && t.position_y === 0),
    );
    const items = (positioned.length ? positioned : tables).map((t) =>
      tableToFloorItem(t, reservations),
    );
    return positioned.length ? items : normalizeFloorLayout(items);
  }, [tables, reservations]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;

  // ---- Optimistic actions with rollback ----

  const startAssign = (r: HostFloorReservation) => {
    setTarget({ id: r.id, name: r.guest_name, party: r.party_size, mode: "assign" });
  };
  const startSeat = (r: HostFloorReservation) => {
    setTarget({ id: r.id, name: r.guest_name, party: r.party_size, mode: "seat" });
  };

  const resolveTableId = (rawId: string): HostFloorTable | undefined =>
    tables.find((t) => t.id === rawId) ?? tables.find((t) => String(t.table_number) === rawId);

  const assignTable = async (reservationId: string, table: HostFloorTable) => {
    const snapshot = stateRef.current;
    setReservations((rs) =>
      rs.map((r) =>
        r.id === reservationId
          ? { ...r, table_id: table.id, table_number: table.table_number, section: table.section }
          : r,
      ),
    );
    setTables((ts) =>
      ts.map((t) =>
        t.id === table.id && t.status === "available" ? { ...t, status: "reserved" } : t,
      ),
    );
    setBusy(true);
    // Prefer RPC; fall back to seating with table assignment on legacy.
    const { data, error } = await (supabase as any).rpc("staff_assign_table", {
      _organization_id: scopeId,
      _reservation_id: reservationId,
      _table_id: table.id,
    });
    if (error || !data?.ok) {
      const seat = await hostSeat({
        organization_id: scopeId,
        reservation_id: reservationId,
        table_id: table.id,
      });
      setBusy(false);
      if (!seat.ok) {
        setReservations(snapshot.reservations);
        setTables(snapshot.tables);
        toast.error(seat.error);
        return;
      }
      toast.success(`Assigned table ${seat.table_number || table.table_number}`);
      setTarget(null);
      void refresh();
      return;
    }
    setBusy(false);
    toast.success(`Assigned table ${data.table_number ?? table.table_number}`);
    setTarget(null);
    void refresh();
  };

  const seatAt = async (reservationId: string, table: HostFloorTable, guestName: string) => {
    if (table.status === "blocked" || table.status === "occupied") {
      toast.error(table.status === "blocked" ? "Table is blocked" : "Table is occupied");
      return;
    }
    const snapshot = stateRef.current;
    setReservations((rs) =>
      rs.map((r) =>
        r.id === reservationId
          ? { ...r, status: "seated", table_id: table.id, table_number: table.table_number }
          : r,
      ),
    );
    setTables((ts) =>
      ts.map((t) =>
        t.id === table.id ? { ...t, status: "occupied", current_reservation_id: reservationId } : t,
      ),
    );
    setBusy(true);
    const res = await hostSeat({
      organization_id: scopeId,
      reservation_id: reservationId,
      table_id: table.id,
    });
    setBusy(false);
    if (!res.ok) {
      setReservations(snapshot.reservations);
      setTables(snapshot.tables);
      toast.error(res.error);
      return;
    }
    toast.success(`${guestName} seated at ${res.table_number}`);
    setTarget(null);
    setSelectedTableId(table.id);
    void refresh();
  };

  const unseat = async (r: HostFloorReservation) => {
    const snapshot = stateRef.current;
    setReservations((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: "completed" } : x)));
    if (r.table_id) {
      setTables((ts) =>
        ts.map((t) =>
          t.id === r.table_id ? { ...t, status: "cleaning", current_reservation_id: null } : t,
        ),
      );
    }
    setBusy(true);
    const res = await hostUnseat({ organization_id: scopeId, reservation_id: r.id, complete: true });
    setBusy(false);
    if (!res.ok) {
      setReservations(snapshot.reservations);
      setTables(snapshot.tables);
      toast.error(res.error);
      return;
    }
    toast.success("Table freed — marked for cleaning");
    void refresh();
  };

  const markNoShow = async (r: HostFloorReservation) => {
    const snapshot = stateRef.current;
    setReservations((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: "no_show" } : x)));
    if (r.table_id) {
      setTables((ts) =>
        ts.map((t) =>
          t.id === r.table_id ? { ...t, status: "available", current_reservation_id: null } : t,
        ),
      );
    }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("staff_mark_no_show", {
      _organization_id: scopeId,
      _reservation_id: r.id,
    });
    if (error || !data?.ok) {
      const { error: updErr } = await (supabase as any)
        .from("v2_bookings")
        .update({ status: "no_show" })
        .eq("id", r.id);
      setBusy(false);
      if (updErr) {
        setReservations(snapshot.reservations);
        setTables(snapshot.tables);
        toast.error(updErr.message);
        return;
      }
      toast.success(`${r.guest_name} marked no-show`);
      void refresh();
      return;
    }
    setBusy(false);
    toast.success(`${r.guest_name} marked no-show`);
  };

  const setTableClean = async (status: "available" | "cleaning" | "blocked") => {
    if (!tenantReady || !selectedTable) return;
    const snapshot = stateRef.current;
    setTables((ts) => ts.map((t) => (t.id === selectedTable.id ? { ...t, status } : t)));
    setBusy(true);
    const res = await hostSetTableStatus({
      organization_id: scopeId,
      table_id: selectedTable.id,
      status,
    });
    setBusy(false);
    if (!res.ok) {
      setTables(snapshot.tables);
      toast.error(res.error);
      return;
    }
    toast.success(`Table ${selectedTable.table_number} marked ${status}`);
  };

  const submitWalkIn = async () => {
    if (!tenantReady) return;
    if (!walkName.trim()) {
      toast.error("Guest name required");
      return;
    }
    setBusy(true);
    const res = await hostCreateWalkIn({
      organization_id: scopeId,
      location_id: locationId || restaurantId || scopeId,
      restaurant_id: restaurantId,
      guest_name: walkName.trim(),
      party_size: walkParty,
      table_id:
        selectedTable &&
        (selectedTable.status === "available" || selectedTable.status === "cleaning")
          ? selectedTable.id
          : null,
      notes: walkNotes.trim() || null,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.table_id ? "Walk-in seated" : "Walk-in added — assign a table");
    setWalkInOpen(false);
    setWalkName("");
    setWalkParty(2);
    setWalkNotes("");
    if (!res.table_id && res.reservation_id) {
      setTarget({ id: res.reservation_id, name: walkName.trim(), party: walkParty, mode: "seat" });
    }
    void refresh();
  };

  const onSelectFloorTable = (rawId: number | string) => {
    const table = resolveTableId(String(rawId));
    if (!table) return;
    setSelectedTableId(table.id);
    if (target) {
      if (target.mode === "assign") void assignTable(target.id, table);
      else void seatAt(target.id, table, target.name);
    }
  };

  if (!tenantReady) {
    return (
      <AppShell immersive>
        <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
          Sign in to use Host Stand.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell immersive>
      <div className="flex h-full min-h-0 flex-col bg-background">
        <header className="shrink-0 flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 sm:px-4 py-2.5">
          <h1 className="text-sm font-semibold mr-1 hidden sm:block">Host Stand</h1>

          {locations.length > 1 && (
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="h-11 w-[170px] text-xs">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={period} onValueChange={(v) => setPeriod(v as MealPeriod)}>
            <SelectTrigger className="h-11 w-[120px] text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Lunch">Lunch</SelectItem>
              <SelectItem value="Dinner">Dinner</SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden md:flex items-center gap-4 mx-2 text-xs">
            <div className="text-center">
              <div className="font-semibold tracking-wide uppercase text-muted-foreground text-[10px]">
                Seated
              </div>
              <div className="text-lg font-bold tabular-nums leading-tight">{seatedCount}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold tracking-wide uppercase text-muted-foreground text-[10px]">
                Upcoming
              </div>
              <div className="text-lg font-bold tabular-nums leading-tight">{upcomingCount}</div>
            </div>
          </div>

          <Button className="ml-auto h-11 px-4 font-semibold" onClick={() => setWalkInOpen(true)}>
            <Plus className="size-4" /> Walk-in
          </Button>
        </header>

        {target && (
          <div className="shrink-0 flex items-center gap-3 bg-primary px-4 py-2.5 text-primary-foreground">
            <MapPin className="size-4 shrink-0" />
            <div className="flex-1 text-sm font-semibold">
              {target.mode === "assign" ? "Tap a table to assign to" : "Tap a table to seat"}{" "}
              {target.name}
              <span className="font-normal opacity-80"> · party of {target.party}</span>
            </div>
            <button
              type="button"
              onClick={() => setTarget(null)}
              className="grid size-11 place-items-center rounded-lg hover:bg-black/10"
              aria-label="Cancel"
            >
              <X className="size-5" />
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Left: floor plan */}
          <main className="flex-1 min-w-0 min-h-0 relative border-b lg:border-b-0 lg:border-r border-border">
            {loading ? (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : tables.length === 0 ? (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground px-6 text-center">
                No tables configured for this location yet.
              </div>
            ) : (
              <FloorPlan
                items={floorItems}
                fill
                light
                selectedId={selectedTableId}
                onSelect={onSelectFloorTable}
                className="h-full w-full min-h-[280px]"
              />
            )}

            {selectedTable && (
              <div className="absolute bottom-3 left-3 right-3 sm:left-3 sm:right-auto sm:w-72 rounded-xl border border-border bg-card/95 backdrop-blur p-3 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">Table {selectedTable.table_number}</div>
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-md hover:bg-muted"
                    onClick={() => setSelectedTableId(null)}
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Capacity {selectedTable.capacity}</span>
                  <span className="capitalize font-medium text-foreground">
                    {selectedTable.status}
                  </span>
                </div>
                {(selectedTable.status === "cleaning" || selectedTable.status === "blocked") && (
                  <Button
                    className="w-full h-11 font-semibold"
                    disabled={busy}
                    onClick={() => void setTableClean("available")}
                  >
                    <Sparkles className="size-4" /> Mark available
                  </Button>
                )}
                {selectedTable.status === "available" && (
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    disabled={busy}
                    onClick={() => void setTableClean("cleaning")}
                  >
                    Mark dirty
                  </Button>
                )}
              </div>
            )}
          </main>

          {/* Right: reservation timeline */}
          <aside className="lg:w-[360px] xl:w-[400px] shrink-0 flex flex-col max-h-[46vh] lg:max-h-none bg-card">
            <div className="shrink-0 px-4 py-2.5 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {period} timeline
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-14 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading…
                </div>
              )}
              {!loading && blocks.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-14">
                  No reservations this {period.toLowerCase()}.
                </div>
              )}
              {!loading &&
                blocks.map((block) => (
                  <div key={block.key}>
                    <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground tracking-wide">
                      {block.label}
                    </div>
                    <div className="space-y-2">
                      {block.items.map((r) => (
                        <ReservationRow
                          key={r.id}
                          r={r}
                          busy={busy}
                          onAssign={() => startAssign(r)}
                          onSeat={() => startSeat(r)}
                          onUnseat={() => void unseat(r)}
                          onNoShow={() => void markNoShow(r)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Walk-in</DialogTitle>
            <DialogDescription>
              Add a walk-in party
              {selectedTable && selectedTable.status !== "occupied"
                ? ` — will seat at table ${selectedTable.table_number}`
                : " — assign a table after"}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Guest name</Label>
              <Input
                value={walkName}
                onChange={(e) => setWalkName(e.target.value)}
                autoFocus
                className="h-11"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Party size</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={walkParty}
                onChange={(e) => setWalkParty(Number(e.target.value) || 1)}
                className="h-11"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
              <Input
                value={walkNotes}
                onChange={(e) => setWalkNotes(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setWalkInOpen(false)}>
              Cancel
            </Button>
            <Button
              className="h-11 font-semibold"
              disabled={busy}
              onClick={() => void submitWalkIn()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Create walk-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ReservationRow({
  r,
  busy,
  onAssign,
  onSeat,
  onUnseat,
  onNoShow,
}: {
  r: HostFloorReservation;
  busy: boolean;
  onAssign: () => void;
  onSeat: () => void;
  onUnseat: () => void;
  onNoShow: () => void;
}) {
  const upcoming = r.status === "pending" || r.status === "confirmed";
  const seated = r.status === "seated";

  return (
    <div
      className={cn(
        "rounded-xl border border-border p-3",
        seated && "bg-emerald-500/5 border-emerald-500/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{r.guest_name}</div>
          <div className="mt-0.5 flex items-center gap-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="size-3" /> {formatTimeLabel(r.reserved_time)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3" /> {r.party_size}
            </span>
            {r.table_number && (
              <span className="inline-flex items-center gap-1">
                <Armchair className="size-3" /> {r.table_number}
              </span>
            )}
          </div>
        </div>
        <span
          className={cn("mt-0.5 size-2 rounded-full shrink-0", statusDot[r.status])}
          title={r.status}
        />
      </div>

      {(upcoming || seated) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {upcoming && !r.table_id && (
            <Button
              size="sm"
              className="h-11 flex-1 min-w-[110px] font-semibold"
              disabled={busy}
              onClick={onAssign}
            >
              <MapPin className="size-4" /> Assign table
            </Button>
          )}
          {upcoming && (
            <Button
              size="sm"
              variant={r.table_id ? "default" : "outline"}
              className="h-11 flex-1 min-w-[90px] font-semibold"
              disabled={busy}
              onClick={onSeat}
            >
              <CheckCircle2 className="size-4" /> Seat
            </Button>
          )}
          {upcoming && (
            <Button
              size="sm"
              variant="outline"
              className="h-11 min-w-[44px] px-3"
              disabled={busy}
              onClick={onNoShow}
              title="Mark no-show"
            >
              <UserX className="size-4" />
            </Button>
          )}
          {seated && (
            <Button
              size="sm"
              variant="outline"
              className="h-11 flex-1 font-semibold"
              disabled={busy}
              onClick={onUnseat}
            >
              <Ban className="size-4" /> Unseat
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
