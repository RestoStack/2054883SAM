import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  mainFloorPlan,
  normalizeFloorLayout,
  type FloorItem,
} from "@/components/FloorPlan";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import {
  Users,
  MapPin,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutGrid,
  Settings,
  Armchair,
  List,
  Sun,
  Moon,
  Plus,
  Loader2,
  Phone,
} from "lucide-react";
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

export const Route = createFileRoute("/host-stand")({
  head: () => ({
    meta: [
      { title: "Host Stand — RestoStack" },
      { name: "description", content: "Front of house floor plan" },
    ],
  }),
  component: HostStandPage,
});

type ThemeMode = "light" | "dark";
type LeftTab = "upcoming" | "seated";
type MealPeriod = "Lunch" | "Dinner";
type SeatTarget = { id: string; name: string; party: number };

function minutesUntilTime(rawTime: string, now: Date): number | null {
  const t = (rawTime ?? "").slice(0, 5);
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 8);
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function HostStandPage() {
  const { org, staff } = useAuth();
  const orgId = org.activeOrganizationId;
  const [locationId, setLocationId] = useState(org.activeLocationId ?? "");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [dateISO, setDateISO] = useState(localDateISO());
  const [period, setPeriod] = useState<MealPeriod>(() =>
    new Date().getHours() < 16 ? "Lunch" : "Dinner",
  );
  const [theme, setTheme] = useState<ThemeMode>("light");
  const dark = theme === "dark";
  const accent = "#00A36C";
  const [leftTab, setLeftTab] = useState<LeftTab>("upcoming");
  const [headerSearch, setHeaderSearch] = useState("");
  const [tables, setTables] = useState<HostFloorTable[]>([]);
  const [reservations, setReservations] = useState<HostFloorReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [seatTarget, setSeatTarget] = useState<SeatTarget | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"floor" | "list">("floor");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkName, setWalkName] = useState("");
  const [walkParty, setWalkParty] = useState(2);
  const [walkNotes, setWalkNotes] = useState("");
  const [now, setNow] = useState(() => new Date());
  const dateInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  const muted = dark ? "text-white/50" : "text-stone-500";
  const border = dark ? "border-white/10" : "border-stone-200";
  const panelBg = dark ? "bg-[#12151a]" : "bg-white";
  const inputBg = dark
    ? "bg-white/5 border-white/10 text-white"
    : "bg-white border-stone-200 text-stone-900";
  const shellBg = dark ? "bg-[#0b0d10] text-white" : "bg-[#f4f5f7] text-stone-900";

  const refresh = useCallback(async () => {
    if (!orgId || !locationId) {
      setLoading(false);
      setTables([]);
      setReservations([]);
      return;
    }
    const res = await hostListFloor(orgId, locationId, dateISO);
    if (!res.ok) {
      if ("missing" in res && res.missing) {
        toast.error("Host Stand RPCs not applied yet — run Phase 3 migration");
      } else {
        toast.error(res.error);
      }
      setLoading(false);
      return;
    }
    setTables(res.tables);
    setReservations(res.reservations);
    setLoading(false);
  }, [orgId, locationId, dateISO]);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const res = await settingsListLocations(orgId);
      const locs = (res.ok && Array.isArray(res.locations) ? res.locations : []) as Array<{
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

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30000);
    pollRef.current = window.setInterval(() => void refresh(), 15000) as unknown as number;
    return () => {
      clearInterval(tick);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh]);

  const periodFilter = useCallback(
    (r: HostFloorReservation) => {
      const lunch = isLunchTime(r.reserved_time);
      return period === "Lunch" ? lunch : !lunch;
    },
    [period],
  );

  const upcoming = useMemo(
    () =>
      reservations.filter(
        (r) =>
          periodFilter(r) &&
          (r.status === "pending" || r.status === "confirmed"),
      ),
    [reservations, periodFilter],
  );

  const seated = useMemo(
    () => reservations.filter((r) => periodFilter(r) && r.status === "seated"),
    [reservations, periodFilter],
  );

  const q = headerSearch.trim().toLowerCase();
  const filteredUpcoming = useMemo(
    () =>
      upcoming.filter(
        (r) =>
          !q ||
          r.guest_name.toLowerCase().includes(q) ||
          (r.table_number ?? "").toLowerCase().includes(q),
      ),
    [upcoming, q],
  );
  const filteredSeated = useMemo(
    () =>
      seated.filter(
        (r) =>
          !q ||
          r.guest_name.toLowerCase().includes(q) ||
          (r.table_number ?? "").toLowerCase().includes(q),
      ),
    [seated, q],
  );

  const seatedCovers = useMemo(
    () => seated.reduce((s, r) => s + r.party_size, 0),
    [seated],
  );
  const capacityTotal = useMemo(
    () => tables.reduce((s, t) => s + (t.capacity || 0), 0),
    [tables],
  );
  const availableCovers = Math.max(0, capacityTotal - seatedCovers);

  const floorItems: FloorItem[] = useMemo(() => {
    const positioned = tables.filter(
      (t) => t.position_x != null && t.position_y != null && !(t.position_x === 0 && t.position_y === 0),
    );
    if (positioned.length === 0) {
      // Fall back to default layout labels matched by table number when possible
      const byNum = new Map(tables.map((t) => [String(t.table_number), t]));
      return normalizeFloorLayout(mainFloorPlan).map((it) => {
        if (it.kind !== "round" && it.kind !== "rect") return it;
        const label = String(it.label ?? it.id ?? "");
        const t = byNum.get(label);
        if (!t) return { ...it, status: "free" as const };
        return decorateFloorItem(it, t, reservations, now);
      });
    }
    return positioned.map((t) => {
      const kind = t.shape === "round" ? "round" : "rect";
      const base: FloorItem =
        kind === "round"
          ? {
              kind: "round",
              id: t.id,
              x: t.position_x ?? 0,
              y: t.position_y ?? 0,
              size: t.width ?? 72,
              label: t.table_number,
            }
          : {
              kind: "rect",
              id: t.id,
              x: t.position_x ?? 0,
              y: t.position_y ?? 0,
              w: t.width ?? 90,
              h: t.height ?? 60,
              label: t.table_number,
            };
      return decorateFloorItem(base, t, reservations, now);
    });
  }, [tables, reservations, now]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;
  const selectedRes =
    reservations.find((r) => r.id === selectedResId) ??
    (selectedTable?.current_reservation_id
      ? reservations.find((r) => r.id === selectedTable.current_reservation_id)
      : null) ??
    null;

  const dateLong = useMemo(() => {
    const [y, m, d] = dateISO.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [dateISO]);

  const shiftDate = (delta: number) => {
    const [y, m, d] = dateISO.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    setDateISO(localDateISO(dt));
  };

  const startSeat = (r: HostFloorReservation) => {
    setSeatTarget({ id: r.id, name: r.guest_name, party: r.party_size });
    setSelectedResId(r.id);
  };

  const confirmSeatAt = async (tableId: string) => {
    if (!orgId || !seatTarget) return;
    const tbl = tables.find((t) => t.id === tableId);
    if (!tbl) {
      // Fallback layout may use numeric labels — resolve by table_number
      const byLabel = tables.find((t) => String(t.table_number) === String(tableId));
      if (!byLabel) {
        toast.error("Unknown table");
        return;
      }
      return confirmSeatAt(byLabel.id);
    }
    if (tbl.status === "blocked" || tbl.status === "occupied") {
      toast.error(tbl.status === "blocked" ? "Table is blocked" : "Table is occupied");
      return;
    }
    setBusy(true);
    const res = await hostSeat({
      organization_id: orgId,
      reservation_id: seatTarget.id,
      table_id: tbl.id,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`${seatTarget.name} seated at ${res.table_number}`);
    setSeatTarget(null);
    setSelectedTableId(tbl.id);
    await refresh();
  };

  const completeParty = async (reservationId: string) => {
    if (!orgId) return;
    setBusy(true);
    const res = await hostUnseat({
      organization_id: orgId,
      reservation_id: reservationId,
      complete: true,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Party completed — table set to cleaning");
    setSeatTarget(null);
    await refresh();
  };

  const unseatParty = async (reservationId: string) => {
    if (!orgId) return;
    setBusy(true);
    const res = await hostUnseat({
      organization_id: orgId,
      reservation_id: reservationId,
      complete: false,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Party unseated");
    await refresh();
  };

  const setTableStatus = async (status: "available" | "cleaning" | "blocked") => {
    if (!orgId || !selectedTable) return;
    setBusy(true);
    const res = await hostSetTableStatus({
      organization_id: orgId,
      table_id: selectedTable.id,
      status,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Table marked ${status}`);
    await refresh();
  };

  const submitWalkIn = async () => {
    if (!orgId || !locationId) return;
    if (!walkName.trim()) {
      toast.error("Guest name required");
      return;
    }
    setBusy(true);
    const res = await hostCreateWalkIn({
      organization_id: orgId,
      location_id: locationId,
      guest_name: walkName.trim(),
      party_size: walkParty,
      table_id: selectedTable?.status === "available" || selectedTable?.status === "cleaning"
        ? selectedTable.id
        : null,
      notes: walkNotes.trim() || null,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      res.table_id ? "Walk-in seated" : "Walk-in created — select a table to seat",
    );
    setWalkInOpen(false);
    setWalkName("");
    setWalkParty(2);
    setWalkNotes("");
    if (res.table_id) {
      setLeftTab("seated");
    } else if (res.reservation_id) {
      setSeatTarget({
        id: res.reservation_id,
        name: walkName.trim(),
        party: walkParty,
      });
      setLeftTab("upcoming");
    }
    await refresh();
  };

  const onSelectFloor = (id: number | string) => {
    const sid = String(id);
    const byId = tables.find((t) => t.id === sid);
    const byNum = tables.find((t) => String(t.table_number) === sid);
    const tbl = byId ?? byNum;
    if (!tbl) return;
    setSelectedTableId(tbl.id);
    if (seatTarget) {
      void confirmSeatAt(tbl.id);
      return;
    }
    if (tbl.current_reservation_id) {
      setSelectedResId(tbl.current_reservation_id);
      setLeftTab("seated");
    }
  };

  if (!orgId) {
    return (
      <AppShell immersive>
        <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
          Sign in with an organization membership to use Host Stand.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell immersive>
      <div className={cn("flex h-[calc(100dvh-0px)] flex-col", shellBg)}>
        <header
          className={cn(
            "shrink-0 flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2.5 border-b",
            border,
            panelBg,
          )}
        >
          <Link to="/app" className="hidden sm:flex items-center gap-2 mr-1">
            <img src={logo} alt="RestoStack" className="h-7 w-7 rounded-md" />
            <span className="text-sm font-semibold">Host Stand</span>
          </Link>

          {locations.length > 1 && (
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className={cn("w-[160px] h-9 rounded-[10px] text-xs", inputBg)}>
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

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className={cn("size-8 grid place-items-center rounded-lg hover:opacity-80", muted)}
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const el = dateInputRef.current;
                if (el && typeof el.showPicker === "function") el.showPicker();
                else el?.focus();
              }}
              className="inline-flex items-center gap-1.5 px-2 h-8 text-xs sm:text-sm font-medium"
            >
              <Calendar className="size-3.5" style={{ color: accent }} />
              <span className="tabular-nums whitespace-nowrap">{dateLong}</span>
              <input
                ref={dateInputRef}
                type="date"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
                className="sr-only"
                aria-label="Service date"
              />
            </button>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className={cn("size-8 grid place-items-center rounded-lg hover:opacity-80", muted)}
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <Select value={period} onValueChange={(v) => setPeriod(v as MealPeriod)}>
            <SelectTrigger className={cn("w-[110px] h-9 rounded-[10px] text-xs font-semibold", inputBg)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Lunch">Lunch</SelectItem>
              <SelectItem value="Dinner">Dinner</SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden lg:flex items-center gap-4 xl:gap-6 mx-2">
            {(
              [
                ["COVERS", seatedCovers],
                ["RESERVATIONS", upcoming.length],
                ["AVAILABLE", availableCovers],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="text-center min-w-[56px]">
                <div className={cn("text-[10px] font-semibold tracking-wider uppercase", muted)}>
                  {label}
                </div>
                <div className="text-lg font-bold tabular-nums leading-tight">{value}</div>
              </div>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            <div className="relative hidden md:block">
              <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5", muted)} />
              <input
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Search…"
                className={cn(
                  "h-9 w-36 xl:w-48 rounded-[10px] border pl-8 pr-3 text-xs outline-none focus:ring-1",
                  inputBg,
                )}
                style={{ ["--tw-ring-color" as string]: accent }}
              />
            </div>
            <IconBtn dark={dark} label="Floor" onClick={() => setViewMode("floor")} active={viewMode === "floor"}>
              <LayoutGrid className="size-4" />
            </IconBtn>
            <IconBtn dark={dark} label="List" onClick={() => setViewMode("list")} active={viewMode === "list"}>
              <List className="size-4" />
            </IconBtn>
            <IconBtn dark={dark} label="Settings" href="/settings">
              <Settings className="size-4" />
            </IconBtn>
            <IconBtn
              dark={dark}
              label={dark ? "Switch to light" : "Switch to dark"}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </IconBtn>
            <button
              type="button"
              onClick={() => setWalkInOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-xs font-bold text-black hover:brightness-110"
              style={{ backgroundColor: accent }}
            >
              <Plus className="size-3.5" /> Walk-in
            </button>
          </div>
        </header>

        <div
          className={cn(
            "lg:hidden shrink-0 grid grid-cols-3 gap-1 px-3 py-2 border-b",
            border,
            panelBg,
          )}
        >
          {(
            [
              ["COVERS", seatedCovers],
              ["RES", upcoming.length],
              ["FREE", availableCovers],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="text-center">
              <div className={cn("text-[9px] font-semibold tracking-wider", muted)}>{label}</div>
              <div className="text-sm font-bold tabular-nums">{value}</div>
            </div>
          ))}
        </div>

        {seatTarget && (
          <div
            className="shrink-0 px-4 py-2 flex items-center gap-3 text-black"
            style={{ backgroundColor: accent }}
          >
            <MapPin className="size-4 shrink-0" />
            <div className="text-sm font-semibold flex-1">
              Select a table for {seatTarget.name}
              <span className="font-normal opacity-80"> · party of {seatTarget.party}</span>
            </div>
            <button
              type="button"
              onClick={() => setSeatTarget(null)}
              className="size-8 grid place-items-center rounded-lg hover:bg-black/10"
              aria-label="Cancel seating"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Left list */}
          <aside
            className={cn(
              "lg:w-[320px] xl:w-[360px] shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col max-h-[40vh] lg:max-h-none",
              border,
              panelBg,
            )}
          >
            <div className="flex border-b" style={{ borderColor: dark ? "rgba(255,255,255,0.1)" : undefined }}>
              {(
                [
                  ["upcoming", "Upcoming", filteredUpcoming.length],
                  ["seated", "Seated", filteredSeated.length],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLeftTab(key)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors",
                    leftTab === key
                      ? "border-current"
                      : "border-transparent opacity-60 hover:opacity-100",
                  )}
                  style={leftTab === key ? { color: accent, borderColor: accent } : undefined}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
            <ul className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading && (
                <li className={cn("flex items-center justify-center gap-2 py-14 text-xs", muted)}>
                  <Loader2 className="size-4 animate-spin" /> Loading…
                </li>
              )}
              {!loading && leftTab === "upcoming" && filteredUpcoming.length === 0 && (
                <li className={cn("text-center text-xs py-14", muted)}>No upcoming reservations.</li>
              )}
              {!loading && leftTab === "seated" && filteredSeated.length === 0 && (
                <li className={cn("text-center text-xs py-14", muted)}>No seated parties.</li>
              )}
              {!loading &&
                (leftTab === "upcoming" ? filteredUpcoming : filteredSeated).map((r) => {
                  const mins = minutesUntilTime(r.reserved_time, now);
                  const late = leftTab === "upcoming" && mins != null && mins < -10;
                  const active = selectedResId === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedResId(r.id);
                          if (r.table_id) setSelectedTableId(r.table_id);
                        }}
                        className={cn(
                          "w-full text-left rounded-xl px-3 py-2.5 border transition-colors",
                          active
                            ? dark
                              ? "border-emerald-500/50 bg-emerald-500/10"
                              : "border-emerald-500/40 bg-emerald-50"
                            : dark
                              ? "border-transparent hover:bg-white/5"
                              : "border-transparent hover:bg-stone-50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{r.guest_name}</div>
                            <div className={cn("text-[11px] mt-0.5 flex items-center gap-2", muted)}>
                              <span className="tabular-nums">{formatTimeLabel(r.reserved_time)}</span>
                              <span className="inline-flex items-center gap-0.5">
                                <Users className="size-3" /> {r.party_size}
                              </span>
                              {r.table_number && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Armchair className="size-3" /> {r.table_number}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold shrink-0",
                              late
                                ? "bg-rose-500/15 text-rose-500"
                                : leftTab === "seated"
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : "bg-sky-500/15 text-sky-600",
                            )}
                          >
                            {late ? "Late" : leftTab === "seated" ? "Seated" : "Confirmed"}
                          </span>
                        </div>
                        {leftTab === "upcoming" && (
                          <div className="mt-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs font-semibold text-black"
                              style={{ backgroundColor: accent }}
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                startSeat(r);
                              }}
                            >
                              Seat
                            </Button>
                          </div>
                        )}
                        {leftTab === "seated" && (
                          <div className="mt-2 flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                void unseatParty(r.id);
                              }}
                            >
                              Unseat
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs font-semibold text-black"
                              style={{ backgroundColor: accent }}
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                void completeParty(r.id);
                              }}
                            >
                              Complete
                            </Button>
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </aside>

          {/* Main floor / list */}
          <main className="flex-1 min-w-0 min-h-0 flex flex-col">
            {viewMode === "list" ? (
              <div className="flex-1 overflow-auto p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn("text-left text-xs uppercase tracking-wider", muted)}>
                      <th className="pb-2 font-semibold">Time</th>
                      <th className="pb-2 font-semibold">Guest</th>
                      <th className="pb-2 font-semibold">Party</th>
                      <th className="pb-2 font-semibold">Table</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 font-semibold">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.filter(periodFilter).map((r) => (
                      <tr
                        key={r.id}
                        className={cn("border-t cursor-pointer", border)}
                        onClick={() => {
                          setSelectedResId(r.id);
                          if (r.table_id) setSelectedTableId(r.table_id);
                        }}
                      >
                        <td className="py-2.5 tabular-nums">{formatTimeLabel(r.reserved_time)}</td>
                        <td className="py-2.5 font-medium">{r.guest_name}</td>
                        <td className="py-2.5">{r.party_size}</td>
                        <td className="py-2.5">{r.table_number ?? "—"}</td>
                        <td className="py-2.5 capitalize">{r.status}</td>
                        <td className={cn("py-2.5 capitalize", muted)}>{r.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 min-h-0 relative">
                {tables.length === 0 && !loading ? (
                  <div className={cn("absolute inset-0 grid place-items-center text-sm", muted)}>
                    <div className="text-center space-y-2 px-6">
                      <p>No tables for this location yet.</p>
                      <Link to="/settings" className="underline" style={{ color: accent }}>
                        Add tables in Settings
                      </Link>
                    </div>
                  </div>
                ) : (
                  <FloorPlan
                    items={floorItems}
                    fill
                    light={!dark}
                    selectedId={selectedTableId}
                    onSelect={onSelectFloor}
                    className="h-full w-full"
                  />
                )}
              </div>
            )}
          </main>

          {/* Detail rail */}
          <aside
            className={cn(
              "hidden xl:flex w-[280px] shrink-0 border-l flex-col",
              border,
              panelBg,
            )}
          >
            <div className={cn("px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider", border, muted)}>
              {selectedTable ? `Table ${selectedTable.table_number}` : "Details"}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
              {selectedTable && (
                <>
                  <div className="flex items-center justify-between">
                    <span className={muted}>Capacity</span>
                    <span className="font-semibold">{selectedTable.capacity} seats</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={muted}>Status</span>
                    <span className="font-semibold capitalize">{selectedTable.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={muted}>Section</span>
                    <span className="font-medium">{selectedTable.section ?? "—"}</span>
                  </div>
                </>
              )}
              {selectedRes && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: dark ? "rgba(255,255,255,0.1)" : "#e7e5e4" }}>
                  <div className="font-semibold text-base">{selectedRes.guest_name}</div>
                  <div className={cn("flex items-center gap-2 text-xs", muted)}>
                    <Users className="size-3.5" /> Party of {selectedRes.party_size}
                  </div>
                  <div className={cn("flex items-center gap-2 text-xs", muted)}>
                    <Calendar className="size-3.5" /> {formatTimeLabel(selectedRes.reserved_time)}
                  </div>
                  {selectedRes.guest_phone && (
                    <div className={cn("flex items-center gap-2 text-xs", muted)}>
                      <Phone className="size-3.5" /> {selectedRes.guest_phone}
                    </div>
                  )}
                  {selectedRes.notes && (
                    <p className={cn("text-xs pt-1", muted)}>{selectedRes.notes}</p>
                  )}
                </div>
              )}
              {!selectedTable && !selectedRes && (
                <p className={cn("text-xs", muted)}>Select a table or reservation.</p>
              )}
            </div>
            <div className={cn("p-3 border-t space-y-2", border)}>
              {selectedRes?.status === "confirmed" || selectedRes?.status === "pending" ? (
                <Button
                  className="w-full text-black font-semibold"
                  style={{ backgroundColor: accent }}
                  disabled={busy}
                  onClick={() => selectedRes && startSeat(selectedRes)}
                >
                  Seat party
                </Button>
              ) : null}
              {selectedRes?.status === "seated" ? (
                <>
                  <Button
                    className="w-full text-black font-semibold"
                    style={{ backgroundColor: accent }}
                    disabled={busy}
                    onClick={() => selectedRes && void completeParty(selectedRes.id)}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    onClick={() => selectedRes && void unseatParty(selectedRes.id)}
                  >
                    Unseat
                  </Button>
                </>
              ) : null}
              {selectedTable && selectedTable.status !== "occupied" && (
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] px-1"
                    disabled={busy || selectedTable.status === "available"}
                    onClick={() => void setTableStatus("available")}
                  >
                    Free
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] px-1"
                    disabled={busy || selectedTable.status === "cleaning"}
                    onClick={() => void setTableStatus("cleaning")}
                  >
                    Clean
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] px-1"
                    disabled={busy || selectedTable.status === "blocked"}
                    onClick={() => void setTableStatus("blocked")}
                  >
                    Block
                  </Button>
                </div>
              )}
              <p className={cn("text-[10px] text-center pt-1", muted)}>
                {staff?.full_name ?? "Host"} · Edit layout in{" "}
                <Link to="/settings" className="underline" style={{ color: accent }}>
                  Settings → Tables
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Walk-in</DialogTitle>
            <DialogDescription>
              Seat a walk-in now
              {selectedTable && selectedTable.status !== "occupied"
                ? ` at table ${selectedTable.table_number}`
                : " (pick a free table after, or select one first)"}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Guest name</label>
              <Input value={walkName} onChange={(e) => setWalkName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Party size</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={walkParty}
                onChange={(e) => setWalkParty(Number(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Input value={walkNotes} onChange={(e) => setWalkNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalkInOpen(false)}>
              Cancel
            </Button>
            <Button
              className="text-black font-semibold"
              style={{ backgroundColor: accent }}
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

function decorateFloorItem(
  it: FloorItem,
  t: HostFloorTable,
  reservations: HostFloorReservation[],
  now: Date,
): FloorItem {
  if (it.kind !== "round" && it.kind !== "rect") return it;
  if (t.status === "blocked" || t.status === "cleaning") {
    return { ...it, id: t.id, label: t.table_number, status: "alert", guestLabel: t.status === "cleaning" ? "Clean" : "Block" };
  }
  const seatedHere = reservations.find(
    (r) => r.status === "seated" && (r.table_id === t.id || r.table_number === t.table_number),
  );
  if (seatedHere || t.status === "occupied") {
    const guest = seatedHere?.guest_name ?? "Seated";
    return {
      ...it,
      id: t.id,
      label: t.table_number,
      status: "seated",
      guestLabel: abbreviateName(guest),
      party: seatedHere?.party_size,
      time: seatedHere ? formatTimeLabel(seatedHere.reserved_time) : undefined,
    };
  }
  const upcomingHere = reservations.find(
    (r) =>
      (r.status === "confirmed" || r.status === "pending") &&
      (r.table_id === t.id || r.table_number === t.table_number),
  );
  if (upcomingHere) {
    const mins = minutesUntilTime(upcomingHere.reserved_time, now);
    const late = mins != null && mins < -10;
    return {
      ...it,
      id: t.id,
      label: t.table_number,
      status: late ? "alert" : "booked",
      guestLabel: abbreviateName(upcomingHere.guest_name),
      party: upcomingHere.party_size,
      time: formatTimeLabel(upcomingHere.reserved_time),
    };
  }
  return { ...it, id: t.id, label: t.table_number, status: "free" };
}

function IconBtn({
  dark,
  label,
  onClick,
  href,
  children,
  active,
}: {
  dark: boolean;
  label: string;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
  active?: boolean;
}) {
  const cls = cn(
    "size-9 grid place-items-center rounded-[10px] border transition-colors",
    dark ? "border-white/10 hover:bg-white/5" : "border-stone-200 hover:bg-stone-50",
    active && (dark ? "bg-white/10" : "bg-stone-100"),
  );
  if (href) {
    return (
      <Link to={href} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
