import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  useBookings,
  useCreateBooking,
  useStaffUsers,
  useUpdateBooking,
  stripServerTag,
  type BookingRow,
} from "@/lib/v2-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FloorPlan, mainFloorPlan, normalizeFloorLayout, type FloorItem } from "@/components/FloorPlan";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import {
  Users, Phone, Mail, MapPin, X, ExternalLink, UserRound,
  Calendar, Bell, MessageSquare, AlertTriangle,
  Crown, ChevronLeft, ChevronRight, Search, Cake, LayoutGrid,
  Settings, Armchair, List, Sun, Moon, Minus, Plus, Leaf,
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
  status?: string | null;
  current_booking_id?: string | null;
};

type AlertItem = {
  id: string;
  text: string;
  tone: "warn" | "vip" | "info";
  focus?: { kind: "booking" | "waitlist"; id: string; table?: string | null };
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
  statusTone: "confirmed" | "birthday" | "upcoming" | "waiting" | "vip" | "seated";
  tag?: string;
  notes?: string | null;
  booking?: BookingRow;
  tableLabel?: string | null;
  visits?: string;
};

type ThemeMode = "light" | "dark";
type LeftTab = "upcoming" | "waiting" | "seated";
type MealPeriod = "Lunch" | "Dinner";

function minutesSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function minutesUntilTime(rawTime: string, now: Date) {
  const [hh, mm] = (rawTime || "00:00").split(":").map(Number);
  if (Number.isNaN(hh)) return null;
  const target = new Date(now);
  target.setHours(hh, mm || 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function abbreviateName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 8);
  return `${parts[0][0]}. ${parts[parts.length - 1]}`.slice(0, 12);
}

function noteFlags(notes: string) {
  const n = (notes || "").toLowerCase();
  return {
    vip: n.includes("vip"),
    birthday: n.includes("birthday") || n.includes("anniversaire") || n.includes("cake"),
    allergy: n.includes("allerg") || n.includes("gluten") || n.includes("nut"),
  };
}

function HostStandPage() {
  const { staff } = useAuth();
  const qc = useQueryClient();

  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [dateISO, setDateISO] = useState(todayISO);
  const [section, setSection] = useState<string>("Main Floor");
  const [selectedTable, setSelectedTable] = useState<number | string | null>(null);
  const [detail, setDetail] = useState<BookingRow | null>(null);
  const [seatTarget, setSeatTarget] = useState<SeatTarget | null>(null);
  const [seatMode, setSeatMode] = useState<"seat" | "move">("seat");
  const [seatingBusy, setSeatingBusy] = useState(false);
  const [dbTables, setDbTables] = useState<DbTable[]>([]);
  const [restaurantName, setRestaurantName] = useState("RestoStack");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("upcoming");
  const [mainView, setMainView] = useState<"floor" | "list">("floor");
  const [period, setPeriod] = useState<MealPeriod>("Dinner");
  const [listQuery, setListQuery] = useState("");
  const [headerSearch, setHeaderSearch] = useState("");
  const [tableNotes, setTableNotes] = useState("");
  const [zoom, setZoom] = useState(1);
  const [resName, setResName] = useState("");
  const [resParty, setResParty] = useState("2");
  const [resPhone, setResPhone] = useState("");
  const [resTime, setResTime] = useState("18:00");
  const [resNotes, setResNotes] = useState("");
  const [staffMsgOpen, setStaffMsgOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [msgTargetId, setMsgTargetId] = useState<string | null>(null);
  const [staffMessage, setStaffMessage] = useState("");
  const [sessionAlerts, setSessionAlerts] = useState<AlertItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newParty, setNewParty] = useState("2");
  const [newPhone, setNewPhone] = useState("");
  const [now, setNow] = useState(() => new Date());
  const dateInputRef = useRef<HTMLInputElement>(null);

  const dark = theme === "dark";
  const accent = dark ? "#39D400" : "#00A36C";

  const { data: todays = [] } = useBookings(dateISO);
  const updateBooking = useUpdateBooking();
  const createBooking = useCreateBooking();
  const { data: staffUsers = [] } = useStaffUsers();

  const { data: waitlistAll = [] } = useQuery({
    queryKey: ["v2_waitlist", staff?.restaurant_id, "all"],
    enabled: !!staff?.restaurant_id,
    queryFn: async (): Promise<WaitlistRow[]> => {
      const { data, error } = await (supabase as any)
        .from("v2_waitlist")
        .select("id, guest_name, party_size, phone, quoted_wait_minutes, status, created_at")
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return (data ?? []) as WaitlistRow[];
    },
    refetchInterval: 15_000,
  });
  const waitlist = useMemo(
    () => waitlistAll.filter((w) => w.status === "waiting"),
    [waitlistAll],
  );

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

  const reloadTables = async () => {
    if (!staff?.restaurant_id) return;
    const { data: tables } = await supabase
      .from("v2_tables")
      .select(
        "id, table_number, section, capacity, shape, position_x, position_y, width, height, status, current_booking_id",
      )
      .eq("restaurant_id", staff.restaurant_id);
    setDbTables((tables ?? []) as DbTable[]);
  };

  useEffect(() => {
    if (!staff) return;
    (async () => {
      const [{ data: tables }, { data: rest }] = await Promise.all([
        supabase
          .from("v2_tables")
          .select(
            "id, table_number, section, capacity, shape, position_x, position_y, width, height, status, current_booking_id",
          )
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
      if (e.key === "Escape") {
        setSeatTarget(null);
        setSeatMode("seat");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seatTarget]);

  useEffect(() => {
    if (detail) setTableNotes(detail.displayNotes || stripServerTag(detail.notes) || "");
    else setTableNotes("");
  }, [detail?.id, detail?.notes, detail?.displayNotes]);

  const activeStaffList = useMemo(
    () => staffUsers.filter((s) => s.active),
    [staffUsers],
  );

  const serverOptions = useMemo(
    () =>
      activeStaffList.filter((s) => {
        const role = s.role.toLowerCase();
        return role === "server" || role === "hostess" || role === "admin";
      }),
    [activeStaffList],
  );

  const serverLoad = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of todays) {
      if (!b.assignedServerId) continue;
      if (b.status === "cancelled" || b.status === "no_show" || b.status === "completed") continue;
      counts[b.assignedServerId] = (counts[b.assignedServerId] ?? 0) + 1;
    }
    return counts;
  }, [todays]);

  const sendStaffMessage = async () => {
    const target = activeStaffList.find((s) => s.id === msgTargetId);
    if (!target) {
      toast.error("Select a staff member");
      return;
    }
    if (!staffMessage.trim()) {
      toast.error("Enter a message");
      return;
    }
    const text = `To ${target.name}: ${staffMessage.trim()}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard may be unavailable */
    }
    setSessionAlerts((prev) => [
      {
        id: `staff-${Date.now()}`,
        text: `Staff note → ${target.name}: ${staffMessage.trim()}`,
        tone: "info",
      },
      ...prev,
    ].slice(0, 12));
    toast.success(`Message copied for ${target.name}`);
    setStaffMsgOpen(false);
    setStaffMessage("");
    setMsgTargetId(null);
  };

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

  const inPeriod = (rawTime: string) => {
    const h = Number((rawTime || "12:00").slice(0, 2));
    if (Number.isNaN(h)) return true;
    return period === "Dinner" ? h >= 15 : h < 15;
  };

  const upcomingItems = useMemo<UpNextItem[]>(() => {
    return reservations
      .filter((b) => inPeriod(b.rawTime))
      .map((b) => {
        const flags = noteFlags(b.displayNotes || b.notes);
        let statusTone: UpNextItem["statusTone"] = "upcoming";
        let statusLabel = "Upcoming";
        if (flags.birthday) {
          statusTone = "birthday";
          statusLabel = "Birthday";
        } else if (flags.vip) {
          statusTone = "vip";
          statusLabel = "VIP";
        } else if (b.status === "confirmed") {
          statusTone = "confirmed";
          statusLabel = "Confirmed";
        }
        return {
          key: `b-${b.id}`,
          kind: "booking" as const,
          id: b.id,
          name: b.name,
          party: b.people,
          whenLabel: b.time || "—",
          statusLabel,
          statusTone,
          tag: flags.vip ? "VIP" : flags.birthday ? "Birthday" : undefined,
          notes: b.displayNotes || stripServerTag(b.notes),
          booking: b,
          tableLabel: b.tableNumber,
          visits: b.visits,
        };
      })
      .sort((a, b) => (a.booking?.rawTime || "").localeCompare(b.booking?.rawTime || ""));
  }, [reservations, period, now]);

  const seatedItems = useMemo<UpNextItem[]>(() => {
    return seated
      .filter((b) => inPeriod(b.rawTime))
      .map((b) => {
        const mins = minutesUntilTime(b.rawTime, now);
        const duration = mins != null ? Math.max(0, -mins) : 0;
        return {
          key: `s-${b.id}`,
          kind: "booking" as const,
          id: b.id,
          name: b.name,
          party: b.people,
          whenLabel: duration > 0 ? `${duration}m` : b.time || "—",
          statusLabel: "Seated",
          statusTone: "seated" as const,
          notes: b.displayNotes || stripServerTag(b.notes),
          booking: b,
          tableLabel: b.tableNumber,
          visits: b.visits,
        };
      });
  }, [seated, period, now]);

  const occupiedTableIds = useMemo(() => {
    const set = new Set<string>();
    for (const b of todays) {
      if (b.status === "seated" && b.tableNumber) set.add(String(b.tableNumber));
    }
    return set;
  }, [todays]);

  const blockedTableIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of dbTables) {
      if (t.status === "cleaning") set.add(String(t.table_number));
    }
    return set;
  }, [dbTables]);

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

  const sectionFilter = (tSection: string | null) => {
    const s = tSection || "Main";
    if (section === "All" || section === "Main Floor") {
      return section === "All" || s === "Main" || s === "Main Floor" || !tSection;
    }
    if (section === "Private Room") return s === "Private" || s === "Private Room";
    return s === section || s.startsWith(section);
  };

  const floorItems = useMemo<FloorItem[]>(() => {
    const base: FloorItem[] =
      positionedTables.length === 0
        ? mainFloorPlan
        : positionedTables
            .filter((t) => sectionFilter(t.section))
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

    const withStatus = base.map((it) => {
      if (it.kind !== "round" && it.kind !== "rect") return it;
      if (it.id == null) return it;
      const key = String(it.id);
      if (blockedTableIds.has(key)) {
        return {
          ...it,
          status: "alert" as const,
          guestLabel: "Blocked",
        };
      }
      const seatedHere = seated.find((b) => String(b.tableNumber) === key);
      const bookedHere = reservations.find((b) => String(b.tableNumber) === key);
      if (seatedHere) {
        const mins = minutesUntilTime(seatedHere.rawTime, now);
        const duration = mins != null ? Math.max(1, -mins) : null;
        return {
          ...it,
          status: "seated" as const,
          guestLabel: duration != null ? `${duration}m` : abbreviateName(seatedHere.name),
          time: seatedHere.time,
        };
      }
      if (bookedHere) {
        const flags = noteFlags(bookedHere.displayNotes || bookedHere.notes);
        const late =
          bookedHere.status === "confirmed" &&
          !!bookedHere.rawTime &&
          bookedHere.rawTime < now.toTimeString().slice(0, 5);
        const waitingNote =
          (bookedHere.displayNotes || bookedHere.notes || "").toLowerCase().includes("arrived") ||
          (bookedHere.displayNotes || bookedHere.notes || "").toLowerCase().includes("waiting");
        return {
          ...it,
          status: late
            ? ("alert" as const)
            : waitingNote
              ? ("waiting" as const)
              : ("booked" as const),
          time: bookedHere.time,
          guestLabel: late
            ? "Late"
            : abbreviateName(bookedHere.name) || (flags.vip ? "VIP" : undefined),
        };
      }
      return { ...it, status: "free" as const };
    });

    // Autofit so sparse section layouts fill the pane instead of hugging the top.
    return normalizeFloorLayout(withStatus, 1000, 560, 52);
  }, [positionedTables, section, seated, reservations, now, blockedTableIds]);

  type FreeTable = { table_number: string; capacity: number };

  const freeTables = useMemo<FreeTable[]>(() => {
    if (positionedTables.length > 0) {
      return positionedTables
        .filter(
          (t) =>
            !occupiedTableIds.has(String(t.table_number)) &&
            !blockedTableIds.has(String(t.table_number)),
        )
        .map((t) => ({ table_number: t.table_number, capacity: t.capacity || 2 }))
        .sort((a, b) => a.capacity - b.capacity);
    }
    return floorItems
      .filter((it): it is Extract<FloorItem, { kind: "round" | "rect" }> =>
        (it.kind === "round" || it.kind === "rect") &&
        it.id != null &&
        (it.status ?? "free") === "free",
      )
      .map((it) => ({
        table_number: String(it.label ?? it.id),
        capacity: it.party ?? (it.kind === "round" ? 2 : 4),
      }))
      .sort((a, b) => a.capacity - b.capacity);
  }, [positionedTables, occupiedTableIds, blockedTableIds, floorItems]);

  const capacityTotal = useMemo(() => {
    if (dbTables.length) return dbTables.reduce((s, t) => s + (t.capacity || 0), 0);
    return 227;
  }, [dbTables]);

  const seatedCovers = useMemo(
    () => seated.reduce((s, b) => s + (b.people || 0), 0),
    [seated],
  );

  const availableCovers = Math.max(0, capacityTotal - seatedCovers);

  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];
    const late = reservations.filter((b) => {
      if (!b.rawTime) return false;
      return b.rawTime < now.toTimeString().slice(0, 5);
    });
    for (const b of late.slice(0, 5)) {
      items.push({
        id: `late-${b.id}`,
        text: `${b.name} is late (${b.time || b.rawTime})`,
        tone: "warn",
        focus: { kind: "booking", id: b.id, table: b.tableNumber },
      });
    }
    if (late.length > 5) {
      items.push({
        id: "late-more",
        text: `+${late.length - 5} more late reservation${late.length - 5 > 1 ? "s" : ""}`,
        tone: "warn",
      });
    }
    const vip = upcomingItems.filter((u) => u.statusTone === "vip");
    for (const u of vip.slice(0, 3)) {
      items.push({
        id: `vip-${u.id}`,
        text: `VIP arriving — ${u.name} at ${u.whenLabel}`,
        tone: "vip",
        focus: { kind: "booking", id: u.id, table: u.tableLabel },
      });
    }
    if (waitlist.length > 0) {
      items.push({
        id: "waitlist-count",
        text: `${waitlist.length} ${waitlist.length === 1 ? "party" : "parties"} on waitlist`,
        tone: "warn",
        focus: waitlist[0]
          ? { kind: "waitlist", id: waitlist[0].id }
          : undefined,
      });
    }
    return [...sessionAlerts, ...items].slice(0, 12);
  }, [reservations, now, upcomingItems, waitlist, sessionAlerts]);

  const focusAlert = (alert: AlertItem) => {
    setAlertsOpen(false);
    if (!alert.focus) return;
    if (alert.focus.kind === "waitlist") {
      setLeftTab("waiting");
      return;
    }
    const booking = todays.find((b) => b.id === alert.focus!.id);
    if (booking) {
      setDetail(booking);
      if (booking.tableNumber) setSelectedTable(booking.tableNumber);
      else if (alert.focus.table) setSelectedTable(alert.focus.table);
      setLeftTab(booking.status === "seated" ? "seated" : "upcoming");
    }
  };

  const startSeat = (target: SeatTarget, mode: "seat" | "move" = "seat") => {
    setSeatMode(mode);
    setSeatTarget(target);
    toast.message(
      mode === "move"
        ? `Tap a free table to move ${target.name}`
        : `Select a free table for ${target.name}`,
    );
  };

  const markTableOccupied = async (tableNumber: string, bookingId: string | null) => {
    if (!staff?.restaurant_id) return;
    await supabase
      .from("v2_tables")
      .update({ status: "occupied", current_booking_id: bookingId } as never)
      .eq("restaurant_id", staff.restaurant_id)
      .eq("table_number", tableNumber);
  };

  const markTableAvailable = async (tableNumber: string) => {
    if (!staff?.restaurant_id) return;
    await supabase
      .from("v2_tables")
      .update({ status: "available", current_booking_id: null } as never)
      .eq("restaurant_id", staff.restaurant_id)
      .eq("table_number", tableNumber);
  };

  const confirmSeatAt = async (tableId: number | string, target = seatTarget) => {
    if (!target) return;
    const tableNumber = String(tableId);
    if (blockedTableIds.has(tableNumber)) {
      toast.error(`Table ${tableId} is blocked`);
      return;
    }

    const existingBooking =
      target.kind === "booking" ? todays.find((b) => b.id === target.id) : undefined;
    const isMove =
      seatMode === "move" ||
      (existingBooking?.status === "seated" &&
        existingBooking.tableNumber != null &&
        String(existingBooking.tableNumber) !== tableNumber);

    if (occupiedTableIds.has(tableNumber)) {
      toast.error(`Table ${tableId} is occupied`);
      return;
    }

    setSeatingBusy(true);
    try {
      if (target.kind === "waitlist") {
        await updateWaitlistMut.mutateAsync({
          id: target.id,
          status: "seated",
          table_number: tableNumber,
        });
        await markTableOccupied(tableNumber, null);
        qc.invalidateQueries({ queryKey: ["v2_waitlist"] });
      } else if (isMove && existingBooking) {
        const oldTable = existingBooking.tableNumber
          ? String(existingBooking.tableNumber)
          : null;
        await updateBooking.mutateAsync({
          id: target.id,
          status: "seated",
          table_number: tableNumber,
        });
        if (oldTable && oldTable !== tableNumber) {
          await markTableAvailable(oldTable);
        }
        await markTableOccupied(tableNumber, target.id);
        toast.success(`${target.name} moved to ${tableNumber}`);
        setSeatTarget(null);
        setSeatMode("seat");
        setSelectedTable(tableId);
        setDetail({
          ...existingBooking,
          tableNumber,
          table: `Table ${tableNumber}`,
          status: "seated",
        });
        await reloadTables();
        return;
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
      setSeatMode("seat");
      setSelectedTable(tableId);
      const seatedBooking = todays.find((b) => b.id === target.id);
      if (seatedBooking) {
        setDetail({
          ...seatedBooking,
          tableNumber,
          table: `Table ${tableNumber}`,
          status: "seated",
        });
      }
      await reloadTables();
    } catch (e) {
      toast.error((e as Error).message || "Could not seat");
    } finally {
      setSeatingBusy(false);
    }
  };

  const onTableClick = (id: number | string) => {
    if (seatTarget) {
      if (blockedTableIds.has(String(id))) {
        toast.message(`Table ${id} is blocked — pick another`);
        return;
      }
      if (occupiedTableIds.has(String(id))) {
        toast.message(`Table ${id} is occupied — pick another`);
        return;
      }
      void confirmSeatAt(id);
      return;
    }
    setSelectedTable(id);
    const seatedMatch = todays.find(
      (b) => String(b.tableNumber) === String(id) && b.status === "seated",
    );
    const match =
      seatedMatch ??
      todays.find(
        (b) =>
          String(b.tableNumber) === String(id) &&
          b.status !== "cancelled" &&
          b.status !== "completed" &&
          b.status !== "no_show",
      ) ??
      null;
    setDetail(match);
    if (match) setTableNotes(match.displayNotes || stripServerTag(match.notes) || "");
    else setTableNotes("");
  };

  const clearTableSelection = () => {
    setSelectedTable(null);
    setDetail(null);
    setTableNotes("");
  };

  const openGuestDetail = (booking: BookingRow) => {
    setDetail(booking);
    setTableNotes(booking.displayNotes || stripServerTag(booking.notes) || "");
    if (booking.tableNumber) setSelectedTable(booking.tableNumber);
  };

  const assignServer = async (
    serverId: string | null,
    booking: BookingRow | null = detail,
  ) => {
    if (!booking) {
      toast.error("Select a reservation or seated party first");
      return;
    }
    try {
      await updateBooking.mutateAsync({
        id: booking.id,
        assignedServerId: serverId,
      });
      const name = serverId
        ? serverOptions.find((s) => s.id === serverId)?.name ?? "server"
        : null;
      setDetail({
        ...booking,
        assignedServerId: serverId,
      });
      toast.success(name ? `Assigned ${name}` : "Server cleared");
    } catch (e) {
      toast.error((e as Error).message || "Could not assign server");
    }
  };

  const saveTableNotes = async () => {
    if (!detail) return;
    try {
      await updateBooking.mutateAsync({
        id: detail.id,
        notes: tableNotes,
      });
      setDetail({
        ...detail,
        notes: tableNotes,
        displayNotes: tableNotes,
      });
      toast.success("Notes saved");
    } catch (e) {
      toast.error((e as Error).message || "Could not save notes");
    }
  };

  const dateLong = useMemo(() => {
    const d = new Date(`${dateISO}T12:00:00`);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [dateISO]);

  const shiftDate = (delta: number) => {
    const d = new Date(`${dateISO}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setDateISO(d.toISOString().slice(0, 10));
  };

  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.focus();
      el.click();
    }
  };

  const areaTabs = useMemo(() => {
    const fromDb = Array.from(
      new Set(dbTables.map((t) => t.section || "Main").filter(Boolean)),
    );
    const mapped = (fromDb.length ? fromDb : ["Main", "Patio", "Bar", "Private"]).map((s) => {
      if (s === "Main") return "Main Floor";
      if (s === "Private") return "Private Room";
      return s;
    });
    return Array.from(new Set(mapped));
  }, [dbTables]);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of areaTabs) counts[tab] = 0;
    for (const t of dbTables) {
      const raw = t.section || "Main";
      const label =
        raw === "Main" || raw === "Main Floor"
          ? "Main Floor"
          : raw === "Private" || raw === "Private Room"
            ? "Private Room"
            : raw;
      const match = areaTabs.find((a) => a === label || label.startsWith(a) || a.startsWith(label));
      if (match) counts[match] = (counts[match] ?? 0) + 1;
    }
    return counts;
  }, [areaTabs, dbTables]);

  useEffect(() => {
    if (areaTabs.length && !areaTabs.includes(section) && section !== "All") {
      setSection(areaTabs[0]);
    }
  }, [areaTabs, section]);

  const selectedDbTable = useMemo(() => {
    if (selectedTable == null) return null;
    return (
      dbTables.find((t) => String(t.table_number) === String(selectedTable)) ?? null
    );
  }, [dbTables, selectedTable]);

  const nextForTable = useMemo(() => {
    if (selectedTable == null) return null;
    const key = String(selectedTable);
    const candidates = reservations
      .filter((b) => String(b.tableNumber) === key || !b.tableNumber)
      .filter((b) => inPeriod(b.rawTime))
      .sort((a, b) => (a.rawTime || "").localeCompare(b.rawTime || ""));
    const assigned = candidates.find((b) => String(b.tableNumber) === key);
    return assigned ?? candidates[0] ?? null;
  }, [selectedTable, reservations, period]);

  const laterTonight = useMemo(() => {
    if (selectedTable == null) return [];
    const key = String(selectedTable);
    return reservations
      .filter((b) => String(b.tableNumber) === key && b.id !== nextForTable?.id)
      .filter((b) => inPeriod(b.rawTime))
      .slice(0, 3);
  }, [selectedTable, reservations, nextForTable, period]);

  const minutesUntilNext = nextForTable
    ? minutesUntilTime(nextForTable.rawTime, now)
    : null;

  const searchFilter = (name: string, phone?: string | null, notes?: string | null) => {
    const q = (headerSearch || listQuery).trim().toLowerCase();
    if (!q) return true;
    return (
      name.toLowerCase().includes(q) ||
      (phone || "").includes(q) ||
      (notes || "").toLowerCase().includes(q)
    );
  };

  const filteredUpcoming = upcomingItems.filter((u) =>
    searchFilter(u.name, u.booking?.phone, u.notes),
  );
  const filteredWaitlist = waitlist.filter((w) =>
    searchFilter(w.guest_name, w.phone),
  );
  const filteredSeated = seatedItems.filter((u) =>
    searchFilter(u.name, u.booking?.phone, u.notes),
  );

  const completeService = async (booking?: BookingRow | null) => {
    const target = booking ?? detail;
    if (!target || target.status !== "seated") return;
    const tableNumber = target.tableNumber
      ? String(target.tableNumber)
      : selectedTable != null
        ? String(selectedTable)
        : null;
    setSeatingBusy(true);
    try {
      await updateBooking.mutateAsync({ id: target.id, status: "completed" });
      if (tableNumber) await markTableAvailable(tableNumber);
      toast.success(`${target.name} completed · table cleared`);
      setDetail(null);
      setTableNotes("");
      await reloadTables();
    } catch (e) {
      toast.error((e as Error).message || "Could not complete");
    } finally {
      setSeatingBusy(false);
    }
  };

  const blockTable = async () => {
    if (selectedTable == null || !staff?.restaurant_id) return;
    const tableNumber = String(selectedTable);
    try {
      const { error } = await supabase
        .from("v2_tables")
        .update({ status: "cleaning", current_booking_id: null } as never)
        .eq("restaurant_id", staff.restaurant_id)
        .eq("table_number", tableNumber);
      if (error) throw error;
      await reloadTables();
      toast.success(`Table ${tableNumber} blocked`);
    } catch (e) {
      toast.error((e as Error).message || "Could not block table");
    }
  };

  const unblockTable = async () => {
    if (selectedTable == null || !staff?.restaurant_id) return;
    const tableNumber = String(selectedTable);
    try {
      await markTableAvailable(tableNumber);
      await reloadTables();
      toast.success(`Table ${tableNumber} unblocked`);
    } catch (e) {
      toast.error((e as Error).message || "Could not unblock table");
    }
  };

  const openEditReservation = (b: BookingRow) => {
    setEditingBookingId(b.id);
    setResName(b.name);
    setResParty(String(b.people));
    setResPhone(b.phone || "");
    setResTime(b.rawTime || "18:00");
    setResNotes(b.displayNotes || stripServerTag(b.notes) || "");
    setReservationOpen(true);
  };

  const openNewReservation = () => {
    setEditingBookingId(null);
    setResName("");
    setResParty("2");
    setResPhone("");
    setResTime("18:00");
    setResNotes("");
    setReservationOpen(true);
  };

  const saveReservation = async () => {
    try {
      if (editingBookingId) {
        await updateBooking.mutateAsync({
          id: editingBookingId,
          guest_name: resName.trim(),
          guest_phone: resPhone.trim() || null,
          party_size: parseInt(resParty, 10) || 2,
          time: resTime,
          notes: resNotes.trim() || null,
          date: dateISO,
        });
        toast.success("Reservation updated");
        if (detail?.id === editingBookingId) {
          setDetail({
            ...detail,
            name: resName.trim(),
            phone: resPhone.trim(),
            people: parseInt(resParty, 10) || 2,
            rawTime: resTime,
            time: resTime,
            notes: resNotes.trim(),
            displayNotes: resNotes.trim(),
            date: dateISO,
          });
          setTableNotes(resNotes.trim());
        }
      } else {
        await createBooking.mutateAsync({
          guest_name: resName.trim(),
          guest_phone: resPhone.trim() || undefined,
          party_size: parseInt(resParty, 10) || 2,
          date: dateISO,
          time: resTime,
          notes: resNotes.trim() || undefined,
          source: "phone",
        });
        toast.success("Reservation added");
        setLeftTab("upcoming");
      }
      setReservationOpen(false);
      setEditingBookingId(null);
      setResName("");
      setResPhone("");
      setResNotes("");
    } catch (e) {
      toast.error((e as Error).message || "Could not save reservation");
    }
  };

  const isSelectedBlocked =
    selectedTable != null && blockedTableIds.has(String(selectedTable));
  const seatedOnSelected =
    selectedTable != null
      ? seated.find((b) => String(b.tableNumber) === String(selectedTable)) ?? null
      : null;

  const shellBg = dark ? "bg-[#121212] text-zinc-100" : "bg-[#F8F9FA] text-slate-900";
  const panelBg = dark ? "bg-[#161616]" : "bg-white";
  const border = dark ? "border-white/10" : "border-slate-200";
  const muted = dark ? "text-zinc-500" : "text-slate-500";
  const cardBg = dark ? "bg-[#1e1e1e]" : "bg-[#F8F9FA]";
  const inputBg = dark ? "bg-[#1e1e1e] border-white/10 text-white placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400";

  const statusBadgeCls = (tone: UpNextItem["statusTone"]) => {
    switch (tone) {
      case "confirmed":
        return dark
          ? "bg-emerald-500/20 text-emerald-300"
          : "bg-emerald-100 text-emerald-700";
      case "birthday":
        return dark
          ? "bg-orange-500/20 text-orange-300"
          : "bg-orange-100 text-orange-700";
      case "upcoming":
        return dark
          ? "bg-sky-500/20 text-sky-300"
          : "bg-sky-100 text-sky-700";
      case "waiting":
        return dark
          ? "bg-amber-500/20 text-amber-300"
          : "bg-amber-100 text-amber-700";
      case "vip":
        return dark
          ? "bg-violet-500/20 text-violet-300"
          : "bg-violet-100 text-violet-700";
      case "seated":
        return dark
          ? "bg-emerald-500/20 text-emerald-300"
          : "bg-emerald-100 text-emerald-700";
      default:
        return muted;
    }
  };

  const dialogSkin = dark
    ? "bg-[#1e1e1e] border-white/10 text-white"
    : "bg-white border-slate-200 text-slate-900";

  return (
    <AppShell immersive>
      <div className={cn("flex flex-1 min-h-0 flex-col w-full", shellBg)}>
        {/* TOP HEADER */}
        <header
          className={cn(
            "shrink-0 border-b px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-2.5 sm:gap-3",
            border,
            panelBg,
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="size-9 rounded-[10px] grid place-items-center shrink-0 overflow-hidden"
              style={{ backgroundColor: accent }}
            >
              <img src={logo} alt="" className="size-6 object-contain brightness-0 invert" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-semibold tracking-tight truncate max-w-[160px] sm:max-w-[220px]">
                {restaurantName}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex items-center gap-1 rounded-[10px] border px-1 py-1",
              border,
              cardBg,
            )}
          >
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
              onClick={openDatePicker}
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
            <SelectTrigger
              className={cn("w-[110px] h-9 rounded-[10px] text-xs font-semibold", inputBg)}
            >
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
                ["RESERVATIONS", upcomingItems.length],
                ["WAITING", waitlist.length],
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

            <IconBtn dark={dark} label="Message staff" onClick={() => setStaffMsgOpen(true)}>
              <MessageSquare className="size-4" />
            </IconBtn>
            <IconBtn dark={dark} label="Notifications" onClick={() => setAlertsOpen(true)}>
              <span className="relative">
                <Bell className="size-4" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-rose-500 text-[9px] font-bold text-white grid place-items-center">
                    {alerts.length}
                  </span>
                )}
              </span>
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
              onClick={openNewReservation}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-xs font-bold text-black hover:brightness-110"
              style={{ backgroundColor: accent }}
            >
              <Plus className="size-3.5" /> Reservation
            </button>
          </div>
        </header>

        {/* Mobile metrics strip */}
        <div
          className={cn(
            "lg:hidden shrink-0 grid grid-cols-4 gap-1 px-3 py-2 border-b",
            border,
            panelBg,
          )}
        >
          {(
            [
              ["COVERS", seatedCovers],
              ["RES", upcomingItems.length],
              ["WAIT", waitlist.length],
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
              {seatMode === "move"
                ? `Tap a free table to move ${seatTarget.name}`
                : `Select a table for ${seatTarget.name}`}
              <span className="font-normal opacity-80"> · party of {seatTarget.party}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSeatTarget(null);
                setSeatMode("seat");
              }}
              className="inline-flex items-center gap-1 rounded-md bg-black/10 px-2.5 py-1 text-xs font-semibold"
            >
              <X className="size-3.5" /> Cancel
            </button>
          </div>
        )}

        <div
          className={cn(
            "flex-1 min-h-0 grid grid-cols-1",
            selectedTable != null || detail
              ? "xl:grid-cols-[300px_minmax(0,1fr)_320px]"
              : "xl:grid-cols-[300px_minmax(0,1fr)]",
            "lg:grid-cols-[280px_minmax(0,1fr)]",
          )}
        >
          {/* LEFT — UP NEXT */}
          <aside
            className={cn(
              "min-h-0 border-b lg:border-b-0 lg:border-r flex flex-col order-1 max-h-[42vh] lg:max-h-none",
              border,
              panelBg,
            )}
          >
            <div className="shrink-0 px-4 pt-4 pb-2">
              <h2 className="text-xs font-bold tracking-[0.14em] uppercase opacity-80">
                Up Next
              </h2>
            </div>

            <div className={cn("shrink-0 flex border-b", border)}>
              {(
                [
                  ["upcoming", "Upcoming", filteredUpcoming.length],
                  ["waiting", "Waiting", filteredWaitlist.length],
                  ["seated", "Seated", filteredSeated.length],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLeftTab(id)}
                  className={cn(
                    "flex-1 py-2.5 text-[11px] font-semibold border-b-2 transition",
                    leftTab === id
                      ? "text-inherit"
                      : cn("border-transparent", muted, "hover:opacity-80"),
                  )}
                  style={
                    leftTab === id
                      ? { borderBottomColor: accent, color: dark ? "#fff" : "#111" }
                      : undefined
                  }
                >
                  {label}{" "}
                  <span style={leftTab === id ? { color: accent } : undefined}>{count}</span>
                </button>
              ))}
            </div>

            <div className="shrink-0 p-3 md:hidden">
              <div className="relative">
                <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5", muted)} />
                <input
                  value={listQuery}
                  onChange={(e) => setListQuery(e.target.value)}
                  placeholder="Search guests…"
                  className={cn(
                    "w-full h-9 rounded-[10px] border pl-8 pr-3 text-xs outline-none",
                    inputBg,
                  )}
                />
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
              {leftTab === "upcoming" &&
                filteredUpcoming.map((u) => {
                  const flags = noteFlags(u.notes || "");
                  const selected = detail?.id === u.id;
                  return (
                    <li
                      key={u.key}
                      className={cn(
                        "rounded-[12px] border p-3 transition",
                        border,
                        cardBg,
                        selected && (dark ? "ring-1 ring-[#39D400]/60" : "ring-1 ring-[#00A36C]/50"),
                      )}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => {
                          if (u.booking) openGuestDetail(u.booking);
                        }}
                      >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-sm font-bold tabular-nums"
                              style={{ color: accent }}
                            >
                              {u.whenLabel}
                            </span>
                            <span
                              className={cn(
                                "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                                statusBadgeCls(u.statusTone),
                              )}
                            >
                              {u.statusLabel}
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-semibold truncate flex items-center gap-1.5">
                            {u.name}
                            {flags.vip && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold",
                                  statusBadgeCls("vip"),
                                )}
                              >
                                <Crown className="size-2.5" /> VIP
                              </span>
                            )}
                            {flags.birthday && <Cake className="size-3.5 text-orange-400" />}
                          </div>
                          <div className={cn("mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]", muted)}>
                            <span className="inline-flex items-center gap-1">
                              <Users className="size-3" /> {u.party}
                            </span>
                            {u.tableLabel && (
                              <span className="inline-flex items-center gap-1">
                                <Armchair className="size-3" /> T{u.tableLabel}
                              </span>
                            )}
                            {u.visits && u.visits !== "—" && (
                              <span>{u.visits} visits</span>
                            )}
                            {u.booking?.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="size-3" /> {u.booking.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      </button>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className={cn("text-[11px] font-medium hover:underline", muted)}
                          onClick={() => {
                            if (u.booking) openGuestDetail(u.booking);
                          }}
                        >
                          View details
                        </button>
                        <button
                          type="button"
                          disabled={seatingBusy}
                          onClick={() =>
                            startSeat({
                              kind: "booking",
                              id: u.id,
                              name: u.name,
                              party: u.party,
                              tag: u.tag,
                            })
                          }
                          className="shrink-0 h-8 px-2.5 rounded-lg text-[11px] font-bold text-black hover:brightness-110 disabled:opacity-50"
                          style={{ backgroundColor: accent }}
                        >
                          Seat
                        </button>
                      </div>
                    </li>
                  );
                })}

              {leftTab === "upcoming" && filteredUpcoming.length === 0 && (
                <li className={cn("text-center text-xs py-14 px-4", muted)}>
                  No upcoming reservations for {period}.
                </li>
              )}

              {leftTab === "waiting" &&
                filteredWaitlist.map((w) => {
                  const waited = minutesSince(w.created_at);
                  return (
                    <li
                      key={w.id}
                      className={cn("rounded-[12px] border p-3", border, cardBg)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold tabular-nums text-amber-500">
                              {waited}m
                            </span>
                            <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", statusBadgeCls("waiting"))}>
                              Waiting
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-semibold">{w.guest_name}</div>
                          <div className={cn("text-[11px] mt-1", muted)}>
                            Party of {w.party_size}
                            {w.phone ? ` · ${w.phone}` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="h-8 px-2.5 rounded-lg text-[11px] font-bold text-black"
                          style={{ backgroundColor: accent }}
                          onClick={() =>
                            startSeat({
                              kind: "waitlist",
                              id: w.id,
                              name: w.guest_name,
                              party: w.party_size,
                              tag: "Walk-in",
                            })
                          }
                        >
                          Seat
                        </button>
                      </div>
                    </li>
                  );
                })}

              {leftTab === "waiting" && filteredWaitlist.length === 0 && (
                <li className={cn("text-center text-xs py-14", muted)}>No one waiting.</li>
              )}

              {leftTab === "seated" &&
                filteredSeated.map((u) => (
                  <li
                    key={u.key}
                    className={cn("rounded-[12px] border p-3", border, cardBg)}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        if (u.booking) openGuestDetail(u.booking);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tabular-nums" style={{ color: accent }}>
                          {u.whenLabel}
                        </span>
                        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", statusBadgeCls("seated"))}>
                          Seated
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-semibold">{u.name}</div>
                      <div className={cn("text-[11px] mt-1", muted)}>
                        {u.party} guests
                        {u.tableLabel ? ` · Table ${u.tableLabel}` : ""}
                      </div>
                    </button>
                  </li>
                ))}

              {leftTab === "seated" && filteredSeated.length === 0 && (
                <li className={cn("text-center text-xs py-14", muted)}>No seated parties.</li>
              )}
            </ul>

            <div className={cn("shrink-0 p-3 border-t", border)}>
              <button
                type="button"
                onClick={() => setWalkInOpen(true)}
                className={cn(
                  "w-full h-10 rounded-[10px] border-2 text-sm font-semibold hover:opacity-90",
                  dark ? "border-white/25 bg-transparent" : "border-slate-300 bg-white",
                )}
              >
                Walk-in
              </button>
            </div>
          </aside>

          {/* CENTER — Floor */}
          <section
            className={cn(
              "min-h-0 min-w-0 flex flex-col order-2 relative",
              dark ? "bg-[#121212]" : "bg-[#F8F9FA]",
            )}
          >
            <div
              className={cn(
                "shrink-0 px-3 py-3 flex items-center gap-3 border-b",
                border,
                panelBg,
              )}
            >
              <div
                className={cn(
                  "flex flex-1 min-w-0 overflow-x-auto gap-1 rounded-[12px] border p-1",
                  border,
                  dark ? "bg-black/30" : "bg-slate-100/80",
                )}
              >
                {areaTabs.map((s) => {
                  const active = section === s;
                  const count = sectionCounts[s] ?? 0;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSection(s)}
                      className={cn(
                        "relative shrink-0 rounded-[10px] px-3.5 py-2 text-sm font-bold tracking-tight transition min-w-[7.5rem]",
                        active
                          ? dark
                            ? "bg-[#39D400] text-black shadow-sm"
                            : "bg-[#00A36C] text-white shadow-sm"
                          : dark
                            ? "text-zinc-300 hover:bg-white/5"
                            : "text-slate-600 hover:bg-white",
                      )}
                    >
                      <span className="block leading-tight">{s}</span>
                      <span
                        className={cn(
                          "block text-[10px] font-semibold mt-0.5",
                          active
                            ? dark
                              ? "text-black/70"
                              : "text-white/85"
                            : muted,
                        )}
                      >
                        {count} table{count === 1 ? "" : "s"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div
                className={cn(
                  "shrink-0 inline-flex rounded-[10px] border p-0.5",
                  border,
                  cardBg,
                )}
              >
                <button
                  type="button"
                  onClick={() => setMainView("floor")}
                  className={cn(
                    "size-8 grid place-items-center rounded-lg transition",
                    mainView === "floor"
                      ? dark
                        ? "bg-white/15 text-white"
                        : "bg-white shadow-sm text-slate-900"
                      : muted,
                  )}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMainView("list")}
                  className={cn(
                    "size-8 grid place-items-center rounded-lg transition",
                    mainView === "list"
                      ? dark
                        ? "bg-white/15 text-white"
                        : "bg-white shadow-sm text-slate-900"
                      : muted,
                  )}
                  aria-label="List view"
                >
                  <List className="size-3.5" />
                </button>
              </div>
            </div>

            {mainView === "floor" && (
              <>
                <div
                  className={cn(
                    "flex-1 min-h-[280px] relative",
                    seatTarget && "ring-inset ring-2",
                  )}
                  style={seatTarget ? { ["--tw-ring-color" as string]: accent } : undefined}
                >
                  <FloorPlan
                    fill
                    light={!dark}
                    items={floorItems}
                    selectedId={selectedTable}
                    zoom={zoom}
                    onSelect={onTableClick}
                    className="absolute inset-0 h-full w-full !border-0 !rounded-none"
                  />
                  {positionedTables.length === 0 && (
                    <p
                      className={cn(
                        "absolute bottom-16 left-1/2 -translate-x-1/2 text-[11px] px-3 py-1 rounded-full pointer-events-none border",
                        dark
                          ? "text-zinc-400 bg-black/70 border-white/10"
                          : "text-slate-600 bg-white/90 border-slate-200",
                      )}
                    >
                      Demo layout ·{" "}
                      <Link
                        to="/floorplan"
                        className="underline pointer-events-auto"
                        style={{ color: accent }}
                      >
                        place your tables
                      </Link>
                    </p>
                  )}

                  {/* Legend + zoom */}
                  <div
                    className={cn(
                      "absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none",
                    )}
                  >
                    <div
                      className={cn(
                        "pointer-events-auto inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] border px-3 py-1.5 text-[10px] font-medium backdrop-blur",
                        dark
                          ? "bg-black/60 border-white/10 text-zinc-300"
                          : "bg-white/90 border-slate-200 text-slate-600",
                      )}
                    >
                      <LegendDot color="#9CA3AF" label="Available" />
                      <LegendDot color="#3B82F6" label="Reserved" />
                      <LegendDot color="#00A36C" label="Seated" />
                      <LegendDot color="#F59E0B" label="Waiting" />
                      <LegendDot color="#EF4444" label="Late / Blocked" />
                    </div>
                    <div
                      className={cn(
                        "pointer-events-auto inline-flex items-center gap-1 rounded-[10px] border p-0.5 backdrop-blur",
                        dark
                          ? "bg-black/60 border-white/10"
                          : "bg-white/90 border-slate-200",
                      )}
                    >
                      <button
                        type="button"
                        aria-label="Zoom out"
                        onClick={() => setZoom((z) => Math.max(0.7, Math.round((z - 0.1) * 10) / 10))}
                        className={cn("size-8 grid place-items-center rounded-lg", muted)}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="text-[11px] font-semibold tabular-nums w-10 text-center">
                        {Math.round(zoom * 100)}%
                      </span>
                      <button
                        type="button"
                        aria-label="Zoom in"
                        onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}
                        className={cn("size-8 grid place-items-center rounded-lg", muted)}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {mainView === "list" && (
              <div className="flex-1 overflow-y-auto p-4">
                <h2 className="text-lg font-semibold mb-3">Reservations · {dateLong}</h2>
                <div className={cn("overflow-x-auto rounded-[12px] border", border)}>
                  <table className="w-full text-sm">
                    <thead className={cn(cardBg, muted, "text-xs uppercase")}>
                      <tr>
                        <th className="text-left px-3 py-2.5 font-semibold">Time</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Guest</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Party</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Table</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todays
                        .filter((b) => inPeriod(b.rawTime))
                        .map((b) => (
                          <tr
                            key={b.id}
                            className={cn(
                              "border-t cursor-pointer",
                              dark ? "border-white/5 hover:bg-white/[0.03]" : "border-slate-100 hover:bg-slate-50",
                            )}
                            onClick={() => openGuestDetail(b)}
                          >
                            <td className="px-3 py-2.5 tabular-nums" style={{ color: accent }}>
                              {b.time}
                            </td>
                            <td className="px-3 py-2.5 font-medium">{b.name}</td>
                            <td className="px-3 py-2.5">{b.people}</td>
                            <td className="px-3 py-2.5">{b.tableNumber ?? "—"}</td>
                            <td className={cn("px-3 py-2.5 capitalize", muted)}>{b.status}</td>
                          </tr>
                        ))}
                      {todays.length === 0 && (
                        <tr>
                          <td colSpan={5} className={cn("px-3 py-12 text-center text-xs", muted)}>
                            No bookings for this date.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* RIGHT — Table / guest detail */}
          {(selectedTable != null || detail) && (
            <aside
              className={cn(
                "min-h-0 border-t xl:border-t-0 xl:border-l flex flex-col order-3 max-h-[48vh] xl:max-h-none overflow-y-auto",
                border,
                panelBg,
              )}
            >
              <div className="shrink-0 px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {selectedTable != null
                      ? `TABLE ${selectedTable}`
                      : detail?.name ?? "Guest"}
                  </h2>
                  <p className={cn("text-xs mt-0.5", muted)}>
                    {selectedTable != null ? (
                      <>
                        {selectedDbTable?.section || section || "Main"} ·{" "}
                        {selectedDbTable?.capacity ?? "—"} seats
                        {isSelectedBlocked ? " · Blocked" : ""}
                      </>
                    ) : (
                      <>
                        {detail?.time} · party of {detail?.people}
                        {detail?.tableNumber ? ` · Table ${detail.tableNumber}` : " · Unassigned"}
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearTableSelection}
                  className={cn(
                    "size-8 grid place-items-center rounded-lg border",
                    border,
                    muted,
                  )}
                  aria-label="Close detail"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="px-4 pb-4 space-y-4 flex-1">
                {/* Customer card */}
                {(detail || nextForTable) && (
                  <div className={cn("rounded-[12px] border p-3", border, cardBg)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className={cn("text-[10px] font-bold uppercase tracking-wider", muted)}>
                        {detail?.status === "seated" ? "Guest" : "Reservation"}
                      </div>
                      {minutesUntilNext != null && detail?.status !== "seated" && (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                            minutesUntilNext <= 0
                              ? "bg-rose-500/15 text-rose-500"
                              : dark
                                ? "bg-sky-500/20 text-sky-300"
                                : "bg-sky-100 text-sky-700",
                          )}
                        >
                          {minutesUntilNext <= 0 ? "now" : `in ${minutesUntilNext}m`}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const guest = detail ?? nextForTable;
                      if (!guest) return null;
                      const flags = noteFlags(guest.displayNotes || guest.notes);
                      return (
                        <div className="mt-2 flex items-start gap-3">
                          <div
                            className="size-11 rounded-full grid place-items-center text-sm font-bold text-black shrink-0"
                            style={{ backgroundColor: accent }}
                          >
                            {guest.name
                              .split(/\s+/)
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                              {guest.name}
                              {flags.vip && (
                                <span className={cn("inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold", statusBadgeCls("vip"))}>
                                  <Crown className="size-2.5" /> VIP
                                </span>
                              )}
                              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize", muted)}>
                                {guest.status}
                              </span>
                            </div>
                            <div className={cn("text-[11px] mt-0.5", muted)}>
                              {guest.time} · party of {guest.people}
                              {guest.visits && guest.visits !== "—"
                                ? ` · ${guest.visits} visits`
                                : ""}
                              {guest.last ? ` · last ${guest.last}` : ""}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                              {guest.phone && (
                                <a
                                  href={`tel:${guest.phone}`}
                                  className="inline-flex items-center gap-1.5 hover:underline"
                                  style={{ color: accent }}
                                >
                                  <Phone className="size-3" /> {guest.phone}
                                </a>
                              )}
                              {guest.email && (
                                <a
                                  href={`mailto:${guest.email}`}
                                  className={cn("inline-flex items-center gap-1.5", muted)}
                                >
                                  <Mail className="size-3" /> {guest.email}
                                </a>
                              )}
                            </div>
                            {guest.customerId && (
                              <Link
                                to="/customers/$id"
                                params={{ id: guest.customerId }}
                                search={{ tab: "overview" }}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                                style={{ color: accent }}
                              >
                                Full customer profile <ExternalLink className="size-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Assign server */}
                {(detail || seatedOnSelected || nextForTable) && (
                  <div className={cn("rounded-[12px] border p-3", border, cardBg)}>
                    <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", muted)}>
                      Assign Server
                    </div>
                    <Select
                      value={
                        (detail ?? seatedOnSelected ?? nextForTable)?.assignedServerId ??
                        "__none__"
                      }
                      onValueChange={(v) => {
                        const booking = detail ?? seatedOnSelected ?? nextForTable;
                        if (!booking) return;
                        void assignServer(v === "__none__" ? null : v, booking);
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full h-10 rounded-[10px] border text-sm",
                          border,
                          dark ? "bg-[#161616]" : "bg-white",
                        )}
                      >
                        <SelectValue placeholder="Choose server" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {serverOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {serverLoad[s.id] != null
                              ? ` · ${serverLoad[s.id]} assigned`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {serverOptions.length === 0 && (
                      <p className={cn("text-[11px] mt-2", muted)}>
                        Add servers on the Staff page to assign tables here.
                      </p>
                    )}
                    {activeStaffList.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {serverOptions.slice(0, 4).map((s) => (
                          <li
                            key={s.id}
                            className={cn(
                              "flex items-center justify-between text-[11px] px-1",
                              muted,
                            )}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound className="size-3" /> {s.name}
                            </span>
                            <span className="tabular-nums">
                              {serverLoad[s.id] ?? 0} tables
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {isSelectedBlocked && (
                  <div
                    className={cn(
                      "rounded-[12px] border px-3 py-2 text-xs flex items-start gap-2",
                      dark
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                        : "border-rose-200 bg-rose-50 text-rose-800",
                    )}
                  >
                    <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                    <span>This table is blocked. Unblock it before seating guests.</span>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className={cn("text-[10px] font-bold uppercase tracking-wider", muted)}>
                    Notes
                  </label>
                  <textarea
                    value={tableNotes}
                    onChange={(e) => setTableNotes(e.target.value)}
                    rows={3}
                    placeholder="Guest preferences, allergies…"
                    disabled={!detail}
                    className={cn(
                      "mt-1.5 w-full rounded-[10px] border px-3 py-2 text-sm resize-y outline-none disabled:opacity-50",
                      inputBg,
                    )}
                  />
                  {detail &&
                    tableNotes !== (detail.displayNotes || stripServerTag(detail.notes) || "") && (
                    <button
                      type="button"
                      onClick={() => void saveTableNotes()}
                      className="mt-1.5 text-[11px] font-semibold hover:underline"
                      style={{ color: accent }}
                    >
                      Save notes
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {isSelectedBlocked ? null : seatedOnSelected || detail?.status === "seated" ? (
                    <button
                      type="button"
                      disabled={seatingBusy}
                      onClick={() =>
                        void completeService(
                          seatedOnSelected ?? (detail?.status === "seated" ? detail : null),
                        )
                      }
                      className="w-full h-11 rounded-[10px] text-sm font-bold text-black hover:brightness-110 disabled:opacity-50"
                      style={{ backgroundColor: accent }}
                    >
                      Complete / Clear Table
                    </button>
                  ) : (
                    (nextForTable ||
                      (detail && detail.status !== "completed")) &&
                    selectedTable != null && (
                      <button
                        type="button"
                        disabled={seatingBusy}
                        onClick={() => {
                          const b = nextForTable ?? detail;
                          if (!b || selectedTable == null) return;
                          void confirmSeatAt(selectedTable, {
                            kind: "booking",
                            id: b.id,
                            name: b.name,
                            party: b.people,
                          });
                        }}
                        className="w-full h-11 rounded-[10px] text-sm font-bold text-black hover:brightness-110 disabled:opacity-50"
                        style={{ backgroundColor: accent }}
                      >
                        Seat Party
                      </button>
                    )
                  )}
                  {detail && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditReservation(detail)}
                        className={cn(
                          "w-full h-10 rounded-[10px] border text-sm font-semibold",
                          border,
                          cardBg,
                        )}
                      >
                        Edit Reservation
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          startSeat(
                            {
                              kind: "booking",
                              id: detail.id,
                              name: detail.name,
                              party: detail.people,
                            },
                            detail.status === "seated" ? "move" : "seat",
                          )
                        }
                        className={cn(
                          "w-full h-10 rounded-[10px] border text-sm font-semibold",
                          border,
                          cardBg,
                        )}
                      >
                        Change Table
                      </button>
                    </>
                  )}
                </div>

                {/* Later tonight */}
                {laterTonight.length > 0 && (
                  <div>
                    <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", muted)}>
                      Later Tonight
                    </div>
                    <ul className="space-y-1.5">
                      {laterTonight.map((b) => (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => openGuestDetail(b)}
                            className={cn(
                              "w-full rounded-[10px] border px-3 py-2 flex items-center justify-between gap-2 text-sm text-left hover:opacity-90",
                              border,
                              cardBg,
                            )}
                          >
                            <span className="font-medium truncate">{b.name}</span>
                            <span className={cn("tabular-nums text-xs shrink-0", muted)}>
                              {b.time} · {b.people}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!detail && !nextForTable && !isSelectedBlocked && selectedTable != null && (
                  <div className={cn("rounded-[12px] border p-4 text-center", border, cardBg)}>
                    <Leaf className="size-5 mx-auto mb-2" style={{ color: accent }} />
                    <p className="text-sm font-semibold">Table available</p>
                    <p className={cn("text-[11px] mt-1", muted)}>
                      Available since {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                )}

                {selectedTable != null &&
                  (isSelectedBlocked ? (
                  <button
                    type="button"
                    onClick={() => void unblockTable()}
                    className={cn(
                      "w-full h-10 rounded-[10px] border text-sm font-semibold",
                      dark
                        ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
                    )}
                  >
                    Unblock Table
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void blockTable()}
                    className={cn(
                      "w-full h-10 rounded-[10px] border text-sm font-semibold",
                      dark
                        ? "border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                        : "border-rose-300 text-rose-600 hover:bg-rose-50",
                    )}
                  >
                    Block Table
                  </button>
                ))}

                {(detail?.displayNotes || detail?.notes) &&
                  noteFlags(detail.displayNotes || detail.notes).allergy && (
                  <div
                    className={cn(
                      "rounded-[10px] border px-3 py-2 text-xs flex items-start gap-2",
                      dark
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        : "border-amber-200 bg-amber-50 text-amber-800",
                    )}
                  >
                    <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                    <span>{detail.displayNotes || stripServerTag(detail.notes)}</span>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Staff message */}
      <Dialog
        open={staffMsgOpen}
        onOpenChange={(o) => {
          setStaffMsgOpen(o);
          if (!o) {
            setStaffMessage("");
            setMsgTargetId(null);
          }
        }}
      >
        <DialogContent className={cn("sm:max-w-md", dialogSkin)}>
          <DialogHeader>
            <DialogTitle>Message staff</DialogTitle>
            <DialogDescription className={muted}>
              Send a note to an active team member on the floor. Copied to clipboard and saved to Alerts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {activeStaffList.length === 0 ? (
              <p className={cn("text-sm", muted)}>No active staff accounts for this restaurant.</p>
            ) : (
              <ul className={cn("max-h-40 overflow-y-auto space-y-1 rounded-lg border p-2", border)}>
                {activeStaffList.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setMsgTargetId(s.id)}
                      className={cn(
                        "w-full text-left rounded-md px-3 py-2 text-sm transition",
                        msgTargetId === s.id
                          ? "font-semibold"
                          : dark
                            ? "hover:bg-white/5"
                            : "hover:bg-slate-50",
                      )}
                      style={
                        msgTargetId === s.id
                          ? { backgroundColor: `${accent}33`, color: accent }
                          : undefined
                      }
                    >
                      {s.name}
                      <span className={cn("text-xs font-normal ml-2 capitalize", muted)}>
                        {s.role}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <textarea
              value={staffMessage}
              onChange={(e) => setStaffMessage(e.target.value)}
              rows={4}
              placeholder="e.g. Table 12 needs bread, VIP on patio…"
              className={cn("w-full rounded-lg border px-3 py-2 text-sm resize-y", inputBg)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className={border} onClick={() => setStaffMsgOpen(false)}>
              Cancel
            </Button>
            <Button
              className="text-black hover:brightness-110"
              style={{ backgroundColor: accent }}
              disabled={!msgTargetId || !staffMessage.trim()}
              onClick={sendStaffMessage}
            >
              Send note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerts / notifications */}
      <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}>
        <DialogContent className={cn("sm:max-w-md", dialogSkin)}>
          <DialogHeader>
            <DialogTitle>Alerts</DialogTitle>
            <DialogDescription className={muted}>
              Late parties, VIPs, waitlist, and staff notes.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-72 overflow-y-auto space-y-2 py-1">
            {alerts.length === 0 && (
              <li className={cn("text-sm text-center py-8", muted)}>No alerts right now.</li>
            )}
            {alerts.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => focusAlert(a)}
                  className={cn(
                    "w-full text-left rounded-[10px] border px-3 py-2.5 text-sm transition",
                    border,
                    cardBg,
                    a.focus ? "hover:opacity-90 cursor-pointer" : "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide mr-2",
                      a.tone === "vip"
                        ? dark
                          ? "bg-violet-500/20 text-violet-300"
                          : "bg-violet-100 text-violet-700"
                        : a.tone === "info"
                          ? dark
                            ? "bg-sky-500/20 text-sky-300"
                            : "bg-sky-100 text-sky-700"
                          : dark
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {a.tone === "vip" ? "VIP" : a.tone === "info" ? "Note" : "Alert"}
                  </span>
                  {a.text}
                </button>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" className={border} onClick={() => setAlertsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Walk-in */}
      <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
        <DialogContent className={cn("sm:max-w-md", dialogSkin)}>
          <DialogHeader>
            <DialogTitle>Add walk-in</DialogTitle>
            <DialogDescription className={muted}>
              Add a party to the waitlist, then seat them from Waiting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Guest name"
              autoFocus
              className={inputBg}
            />
            <div className="flex gap-2">
              <Select value={newParty} onValueChange={setNewParty}>
                <SelectTrigger className={cn("w-28", inputBg)}>
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
                className={cn("flex-1", inputBg)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className={border} onClick={() => setWalkInOpen(false)}>
              Cancel
            </Button>
            <Button
              className="text-black hover:brightness-110"
              style={{ backgroundColor: accent }}
              disabled={!newName.trim() || addWaitlistMut.isPending}
              onClick={() =>
                addWaitlistMut.mutate({
                  name: newName.trim(),
                  party: parseInt(newParty, 10) || 2,
                  phone: newPhone.trim(),
                })
              }
            >
              Add to Waiting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New / edit reservation */}
      <Dialog
        open={reservationOpen}
        onOpenChange={(o) => {
          setReservationOpen(o);
          if (!o) setEditingBookingId(null);
        }}
      >
        <DialogContent className={cn("sm:max-w-md", dialogSkin)}>
          <DialogHeader>
            <DialogTitle>
              {editingBookingId ? "Edit reservation" : "New reservation"}
            </DialogTitle>
            <DialogDescription className={muted}>
              {editingBookingId
                ? `Update booking details for ${dateLong}.`
                : `Creates a booking for ${dateLong}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={resName}
              onChange={(e) => setResName(e.target.value)}
              placeholder="Guest name"
              className={inputBg}
            />
            <div className="flex gap-2">
              <Input
                type="time"
                value={resTime}
                onChange={(e) => setResTime(e.target.value)}
                className={cn("w-32", inputBg)}
              />
              <Select value={resParty} onValueChange={setResParty}>
                <SelectTrigger className={cn("w-28", inputBg)}>
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
                value={resPhone}
                onChange={(e) => setResPhone(e.target.value)}
                placeholder="Phone"
                className={cn("flex-1", inputBg)}
              />
            </div>
            <Input
              value={resNotes}
              onChange={(e) => setResNotes(e.target.value)}
              placeholder="Notes (VIP, allergy, birthday…)"
              className={inputBg}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className={border}
              onClick={() => {
                setReservationOpen(false);
                setEditingBookingId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="text-black hover:brightness-110"
              style={{ backgroundColor: accent }}
              disabled={
                !resName.trim() || createBooking.isPending || updateBooking.isPending
              }
              onClick={() => void saveReservation()}
            >
              {editingBookingId ? "Save changes" : "Save reservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  href,
  dark,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  dark: boolean;
}) {
  const cls = cn(
    "inline-flex size-9 items-center justify-center rounded-[10px] border",
    dark
      ? "border-white/10 bg-[#1e1e1e] text-zinc-300 hover:bg-white/5 hover:text-white"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
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
