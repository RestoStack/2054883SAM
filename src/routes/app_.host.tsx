import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { ensureGuestIdForContact } from "@/lib/guests-api";
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
import { useI18n } from "@/lib/i18n";
import {
  Armchair,
  Ban,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  NotebookPen,
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
  const navigate = useNavigate();
  const { org, staff } = useAuth();
  const { t } = useI18n();
  const orgId = org.activeOrganizationId;
  const restaurantId = staff?.restaurant_id ?? null;
  const tenantReady = Boolean(orgId || restaurantId);
  const scopeId = orgId ?? restaurantId ?? "";
  const [locationId, setLocationId] = useState(org.activeLocationId ?? "");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [dateISO, setDateISO] = useState(() => localDateISO());
  const [period, setPeriod] = useState<MealPeriod>(() =>
    new Date().getHours() < 16 ? "Lunch" : "Dinner",
  );
  const [partyFilter, setPartyFilter] = useState<number | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [serviceNotes, setServiceNotes] = useState(() => {
    try {
      return localStorage.getItem(`restostack:service-notes:${localDateISO()}`) ?? "";
    } catch {
      return "";
    }
  });

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
    if (!orgId && !restaurantId) return;
    (async () => {
      const res = await settingsListLocations(orgId, restaurantId);
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
        restaurantId ||
        "";
      setLocationId((prev) => prev || preferred);
    })();
  }, [orgId, restaurantId, org.activeLocationId]);

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

  const seatedCount = useMemo(
    () => periodReservations.filter((r) => r.status === "seated").length,
    [periodReservations],
  );
  const upcomingCount = useMemo(
    () =>
      periodReservations.filter((r) => r.status === "pending" || r.status === "confirmed").length,
    [periodReservations],
  );
  const noShowCount = useMemo(
    () => periodReservations.filter((r) => r.status === "no_show").length,
    [periodReservations],
  );
  const coversTonight = useMemo(
    () =>
      periodReservations
        .filter((r) => !["cancelled", "no_show"].includes(r.status))
        .reduce((s, r) => s + r.party_size, 0),
    [periodReservations],
  );
  const toSeat = useMemo(
    () =>
      activeReservations.filter(
        (r) =>
          (r.status === "pending" || r.status === "confirmed") &&
          (partyFilter == null ||
            (partyFilter >= 6 ? r.party_size >= 6 : r.party_size === partyFilter)),
      ),
    [activeReservations, partyFilter],
  );
  const occupiedTables = tables.filter((t) => t.status === "occupied" || t.status === "reserved").length;
  const tableTotal = tables.length || 1;
  const occupancyPct = Math.round((occupiedTables / tableTotal) * 100);
  const noShowRate =
    periodReservations.length > 0
      ? Math.round((noShowCount / periodReservations.length) * 1000) / 10
      : 0;

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

  const openGuestProfile = async (r: HostFloorReservation) => {
    let id = r.guest_id;
    if (!id) {
      id = await ensureGuestIdForContact(restaurantId, {
        full_name: r.guest_name,
        email: r.guest_email,
        phone: r.guest_phone,
      });
    }
    if (!id) {
      toast.error("Could not open guest profile");
      return;
    }
    void navigate({ to: "/app/guests/$id", params: { id } });
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
      <div className="flex h-full min-h-0 flex-col bg-[#F7F8FA]">
        <header className="shrink-0 flex flex-wrap items-center gap-2 border-b border-black/5 bg-white px-3 sm:px-4 py-2.5">
          <div className="mr-1 flex items-center gap-2">
            <h1 className="text-sm font-semibold">Host Stand</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {t("host.live")}
            </span>
          </div>

          {locations.length > 0 && (
            <Select value={locationId || "none"} onValueChange={(v) => setLocationId(v === "none" ? "" : v)}>
              <SelectTrigger className="h-10 w-[160px] text-xs">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
                {locations.length === 0 && <SelectItem value="none">—</SelectItem>}
              </SelectContent>
            </Select>
          )}

          <input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            className="h-10 rounded-lg border border-border bg-white px-2 text-xs"
            aria-label="Date"
          />

          <Select value={period} onValueChange={(v) => setPeriod(v as MealPeriod)}>
            <SelectTrigger className="h-10 w-[120px] text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Lunch">Lunch</SelectItem>
              <SelectItem value="Dinner">Dinner</SelectItem>
            </SelectContent>
          </Select>

          <Link
            to="/app/reservations"
            search={{ from: dateISO, to: dateISO }}
            className="ml-auto grid size-10 place-items-center rounded-xl border border-border bg-white text-muted-foreground hover:bg-muted"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </Link>

          <Link
            to="/settings"
            className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-white py-1.5 pl-1.5 pr-3 hover:bg-muted"
          >
            <div className="grid size-8 place-items-center rounded-full bg-emerald-500 text-xs font-bold text-white">
              {(staff?.full_name?.[0] ?? "A").toUpperCase()}
            </div>
            <div className="leading-tight">
              <div className="text-xs font-semibold">{staff?.full_name ?? "Admin"}</div>
              <div className="text-[10px] text-muted-foreground">Admin</div>
            </div>
          </Link>

          <Button asChild className="h-10 px-4 font-semibold bg-stone-900 hover:bg-stone-800">
            <Link to="/app/reservations" search={{ from: dateISO, to: dateISO, create: "1" }}>
              <Plus className="size-4" /> {t("dashboard.newReservation")}
            </Link>
          </Button>
        </header>

        {/* Metrics */}
        <div className="shrink-0 grid grid-cols-2 gap-2 border-b border-black/5 bg-white px-3 py-3 sm:grid-cols-5 sm:px-4">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("dashboard.occupancy")}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div
                className="grid size-10 place-items-center rounded-full border-4 border-emerald-500 text-xs font-bold"
                style={{
                  background: `conic-gradient(#22c55e ${occupancyPct}%, #e7e5e4 0)`,
                }}
              >
                <span className="rounded-full bg-white px-1">{occupancyPct}%</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {occupiedTables}/{tables.length || "—"}
              </div>
            </div>
          </div>
          <MetricCard label={t("host.coversTonight")} value={String(coversTonight)} />
          <MetricCard label={t("host.resTonight")} value={String(periodReservations.length)} />
          <MetricCard label={t("host.arrivals")} value={String(seatedCount)} />
          <MetricCard
            label={t("dashboard.noShows")}
            value={`${noShowCount}`}
            sub={`${noShowRate}%`}
          />
        </div>

        {target && (
          <div className="shrink-0 flex items-center gap-3 bg-emerald-600 px-4 py-2.5 text-white">
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

        <div className="flex-1 min-h-0 flex flex-col xl:flex-row">
          {/* Left: to-seat + quick assign */}
          <aside className="xl:w-[280px] shrink-0 border-b xl:border-b-0 xl:border-r border-border bg-white flex flex-col max-h-[40vh] xl:max-h-none">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("host.toSeat")}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[2, 4, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPartyFilter((p) => (p === n ? null : n))}
                    className={cn(
                      "h-8 rounded-lg px-2.5 text-xs font-semibold border",
                      partyFilter === n
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-white text-stone-600 border-border hover:bg-muted",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPartyFilter((p) => (p === 7 ? null : 7))}
                  className={cn(
                    "h-8 rounded-lg px-2.5 text-xs font-semibold border",
                    partyFilter === 7
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-white text-stone-600 border-border hover:bg-muted",
                  )}
                >
                  6+
                </button>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">{t("host.quickAssign")}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {toSeat.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">{t("common.empty")}</div>
              )}
              {toSeat.slice(0, 20).map((r) => (
                <div
                  key={r.id}
                  className="w-full rounded-xl border border-border bg-card p-3 text-left hover:border-emerald-300 hover:bg-emerald-50/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void openGuestProfile(r)}
                      className="truncate text-sm font-semibold text-left hover:underline text-emerald-700"
                      title="View guest profile"
                    >
                      {r.guest_name}
                    </button>
                    <div className="text-xs font-semibold tabular-nums text-muted-foreground">
                      {formatTimeLabel(r.reserved_time)}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Users className="size-3" /> {r.party_size}
                      {r.table_number && <span>· T{r.table_number}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => startSeat(r)}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline"
                    >
                      Seat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Center: floor */}
          <main className="flex-1 min-w-0 min-h-0 relative border-b xl:border-b-0 xl:border-r border-border bg-white">
            <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold">{t("dashboard.floor")}</div>
              <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                <LegendDot className="bg-emerald-500" label={t("dashboard.available")} />
                <LegendDot className="border border-stone-300 bg-white" label={t("dashboard.reserved")} />
                <LegendDot className="bg-stone-800" label={t("dashboard.occupied")} />
                <LegendDot className="bg-amber-500" label="Wait" />
                <LegendDot className="bg-rose-500" label={t("dashboard.attention")} />
              </div>
            </div>
            {loading ? (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : tables.length === 0 ? (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground px-6 text-center">
                No tables configured yet.{" "}
                <Link to="/floorplan" className="text-emerald-600 underline">
                  {t("host.seeFloor")}
                </Link>
              </div>
            ) : (
              <FloorPlan
                items={floorItems}
                fill
                light
                selectedId={selectedTableId}
                onSelect={onSelectFloorTable}
                className="h-full w-full min-h-[280px] pt-10"
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
                {selectedTable.status !== "blocked" && (
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    disabled={busy}
                    onClick={() => void setTableClean("blocked")}
                  >
                    <Ban className="size-4" /> {t("host.blockTable")}
                  </Button>
                )}
              </div>
            )}
          </main>

          {/* Right: arrivals + actions */}
          <aside className="xl:w-[340px] shrink-0 flex flex-col max-h-[46vh] xl:max-h-none bg-white">
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("host.upcomingArrivals")}
              </div>
              <Link
                to="/app/reservations"
                search={{ from: dateISO, to: dateISO }}
                className="text-[11px] font-medium text-emerald-600 hover:underline"
              >
                {t("dashboard.seeAll")}
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-14 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading…
                </div>
              )}
              {!loading && upcomingCount === 0 && (
                <div className="text-center text-xs text-muted-foreground py-14">
                  No upcoming arrivals.
                </div>
              )}
              {!loading &&
                activeReservations
                  .filter((r) => r.status === "pending" || r.status === "confirmed" || r.status === "seated")
                  .slice(0, 25)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-border p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            type="button"
                            onClick={() => void openGuestProfile(r)}
                            className="text-sm font-semibold hover:underline text-left text-emerald-700"
                            title="View guest profile"
                          >
                            {r.guest_name}
                          </button>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <Clock className="size-3" /> {formatTimeLabel(r.reserved_time)}
                            <Users className="size-3" /> {r.party_size}
                            {r.table_number && <span>T{r.table_number}</span>}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                          {r.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(r.status === "pending" || r.status === "confirmed") && (
                          <>
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              disabled={busy}
                              onClick={() => startSeat(r)}
                            >
                              <Armchair className="size-3" /> {t("host.seat")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={busy}
                              onClick={() => startAssign(r)}
                            >
                              <MapPin className="size-3" /> Assign
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={busy}
                              onClick={() => void markNoShow(r)}
                            >
                              <UserX className="size-3" /> {t("host.noShow")}
                            </Button>
                          </>
                        )}
                        {r.status === "seated" && (
                          <>
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              disabled={busy}
                              onClick={() => void unseat(r)}
                            >
                              <CheckCircle2 className="size-3" /> {t("host.unseat")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={busy}
                              onClick={() => startAssign(r)}
                            >
                              {t("host.transfer")}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
            </div>

            <div className="shrink-0 border-t border-border p-3 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
                {t("host.quickActions")}
              </div>
              <Button className="w-full h-10 justify-start font-semibold" onClick={() => setWalkInOpen(true)}>
                <Plus className="size-4" /> {t("host.walkIn")}
              </Button>
              <Button
                variant="outline"
                className="w-full h-10 justify-start"
                onClick={() => {
                  if (!selectedTable) {
                    toast.message("Select a table on the floor first");
                    return;
                  }
                  void setTableClean("blocked");
                }}
              >
                <Ban className="size-4" /> {t("host.blockTable")}
              </Button>
              <Button variant="outline" className="w-full h-10 justify-start" onClick={() => setNotesOpen(true)}>
                <NotebookPen className="size-4" /> {t("host.serviceNotes")}
              </Button>
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

      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("host.serviceNotes")}</DialogTitle>
            <DialogDescription>Shared notes for this service period (local to this device).</DialogDescription>
          </DialogHeader>
          <textarea
            value={serviceNotes}
            onChange={(e) => setServiceNotes(e.target.value)}
            className="min-h-[120px] w-full rounded-lg border border-border bg-background p-3 text-sm"
            placeholder="VIP arrivals, large parties, kitchen notes…"
          />
          <DialogFooter>
            <Button
              className="h-11 font-semibold"
              onClick={() => {
                try {
                  localStorage.setItem(`restostack:service-notes:${dateISO}`, serviceNotes);
                } catch {
                  /* ignore */
                }
                toast.success("Service notes saved");
                setNotesOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums">
        {value}
        {sub && <span className="ml-1 text-xs font-medium text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("size-2.5 rounded-sm", className)} />
      {label}
    </span>
  );
}
