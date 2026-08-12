import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useBookings, useCreateBooking, useStaffUsers, useUpdateBooking, type BookingRow } from "@/lib/v2-data";
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
  Calendar, Bell, MessageSquare, Check, AlertTriangle, Utensils,
  Clock, Crown, ChevronLeft, ChevronRight, Search, Cake, LayoutGrid,
  Settings, HelpCircle, Globe, Armchair, Grid3X3,
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
  const [section, setSection] = useState<string>("All");
  const [selectedTable, setSelectedTable] = useState<number | string | null>(null);
  const [detail, setDetail] = useState<BookingRow | null>(null);
  const [seatTarget, setSeatTarget] = useState<SeatTarget | null>(null);
  const [seatingBusy, setSeatingBusy] = useState(false);
  const [dbTables, setDbTables] = useState<DbTable[]>([]);
  const [restaurantName, setRestaurantName] = useState("RestoStack");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<"reservations" | "waiting" | "history">("reservations");
  const [mainView, setMainView] = useState<"floor" | "list" | "servers">("floor");
  const [period, setPeriod] = useState<"AM" | "PM">("PM");
  const [listQuery, setListQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resName, setResName] = useState("");
  const [resParty, setResParty] = useState("2");
  const [resPhone, setResPhone] = useState("");
  const [resTime, setResTime] = useState("18:00");
  const [resNotes, setResNotes] = useState("");
  const [staffMsgOpen, setStaffMsgOpen] = useState(false);
  const [msgTargetId, setMsgTargetId] = useState<string | null>(null);
  const [staffMessage, setStaffMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [newParty, setNewParty] = useState("2");
  const [newPhone, setNewPhone] = useState("");
  const [now, setNow] = useState(() => new Date());
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  const activeStaffList = useMemo(
    () => staffUsers.filter((s) => s.active),
    [staffUsers],
  );

  const sendStaffMessage = () => {
    const target = activeStaffList.find((s) => s.id === msgTargetId);
    if (!target) {
      toast.error("Select a staff member");
      return;
    }
    if (!staffMessage.trim()) {
      toast.error("Enter a message");
      return;
    }
    toast.success(`Message noted for ${target.name}`);
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

  type FreeTable = { table_number: string; capacity: number };

  const freeTables = useMemo<FreeTable[]>(() => {
    // Match what's actually on the floor map (placed tables, or demo layout)
    if (positionedTables.length > 0) {
      return positionedTables
        .filter((t) => !occupiedTableIds.has(String(t.table_number)))
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
  }, [positionedTables, occupiedTableIds, floorItems]);

  const recommended = useMemo(() => {
    const nextParty = seatTarget
      ? { party: seatTarget.party, name: seatTarget.name, target: seatTarget }
      : upNext[0]
        ? {
            party: upNext[0].party,
            name: upNext[0].name,
            target: {
              kind: upNext[0].kind,
              id: upNext[0].id,
              name: upNext[0].name,
              party: upNext[0].party,
              tag: upNext[0].tag,
            } as SeatTarget,
          }
        : null;

    if (!nextParty) {
      return { kind: "idle" as const, freeCount: freeTables.length };
    }
    const fit =
      freeTables.find((t) => t.capacity >= nextParty.party) ?? freeTables[0] ?? null;
    if (!fit) {
      return { kind: "no_fit" as const, name: nextParty.name, party: nextParty.party };
    }
    return {
      kind: "match" as const,
      table: fit.table_number,
      party: nextParty.party,
      name: nextParty.name,
      reasons: [
        `Seats ${fit.capacity}`,
        "Server balance",
        seatTarget ? "No conflict now" : "Open now",
        "Est. dining time 1h 10m",
      ],
      target: nextParty.target,
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
  });

  const dateLong = useMemo(() => {
    const d = new Date(`${dateISO}T12:00:00`);
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [dateISO]);

  const shiftDate = (delta: number) => {
    const d = new Date(`${dateISO}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setDateISO(d.toISOString().slice(0, 10));
  };

  const inPeriod = (rawTime: string) => {
    const h = Number((rawTime || "12:00").slice(0, 2));
    if (Number.isNaN(h)) return true;
    return period === "PM" ? h >= 12 : h < 12;
  };

  const capacityTotal = useMemo(() => {
    if (dbTables.length) return dbTables.reduce((s, t) => s + (t.capacity || 0), 0);
    return 227;
  }, [dbTables]);

  const seatedCovers = useMemo(
    () => seated.reduce((s, b) => s + (b.people || 0), 0),
    [seated],
  );

  const historyBookings = useMemo(
    () =>
      todays.filter((b) =>
        ["seated", "completed", "cancelled", "no_show"].includes(b.status),
      ),
    [todays],
  );

  const reservationCards = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return reservations
      .filter((b) => inPeriod(b.rawTime))
      .filter((b) => {
        if (!q) return true;
        return (
          b.name.toLowerCase().includes(q) ||
          b.phone.includes(q) ||
          (b.tableNumber || "").includes(q) ||
          (b.notes || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.rawTime || "").localeCompare(b.rawTime || ""));
  }, [reservations, listQuery, period]);

  const timelineSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 11; h <= 23; h++) {
      for (const m of [0, 15, 30, 45]) {
        const hh = ((h + 11) % 12) + 1;
        const ap = h >= 12 ? "P" : "A";
        slots.push(`${hh}:${m.toString().padStart(2, "0")}${ap}`);
      }
    }
    return slots;
  }, []);

  const bookingBySlot = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const b of todays) {
      if (b.status === "cancelled") continue;
      const key = (b.time || "").replace(/\s/g, "").replace("M", "").replace(":", ":");
      // Match loosely on displayed time like "5:15 PM" -> look for hour:minute
      const raw = b.rawTime || "";
      const [hh, mm] = raw.split(":").map(Number);
      if (Number.isNaN(hh)) continue;
      const h12 = ((hh + 11) % 12) + 1;
      const ap = hh >= 12 ? "P" : "A";
      const slot = `${h12}:${(mm || 0).toString().padStart(2, "0")}${ap}`;
      const list = map.get(slot) ?? [];
      list.push(b);
      map.set(slot, list);
    }
    return map;
  }, [todays]);

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

  const noteFlags = (notes: string) => {
    const n = (notes || "").toLowerCase();
    return {
      vip: n.includes("vip"),
      birthday: n.includes("birthday") || n.includes("anniversaire") || n.includes("cake"),
      allergy: n.includes("allerg") || n.includes("gluten") || n.includes("nut"),
    };
  };

  const areaTabs = useMemo(() => {
    const fromDb = Array.from(
      new Set(dbTables.map((t) => t.section || "Main").filter(Boolean)),
    );
    const base = fromDb.length ? fromDb : ["Main", "Patio", "Bar", "Private"];
    return ["All", ...base];
  }, [dbTables]);

  return (
    <AppShell immersive>
      <div className="flex flex-1 min-h-0 flex-col bg-[#121212] text-zinc-100 w-full">
        {/* Top bar — mockup */}
        <header className="shrink-0 border-b border-white/10 bg-[#161616] px-3 sm:px-5 py-2.5 flex flex-wrap items-center gap-3">
          <div className="min-w-0 text-sm sm:text-base font-semibold tracking-tight truncate max-w-[220px] sm:max-w-xs">
            {restaurantName}
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-[#1e1e1e] border border-white/10 px-1.5 py-1">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="size-8 grid place-items-center rounded-md hover:bg-white/5 text-zinc-400"
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={openDatePicker}
              className="inline-flex items-center gap-2 px-2 h-8 text-xs sm:text-sm font-medium hover:text-white"
            >
              <Calendar className="size-3.5 text-emerald-400" />
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
              className="size-8 grid place-items-center rounded-md hover:bg-white/5 text-zinc-400"
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="inline-flex rounded-lg border border-white/10 bg-[#1e1e1e] p-0.5">
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 h-8 text-xs font-bold rounded-md transition",
                  period === p
                    ? "bg-[#39D400] text-black"
                    : "text-zinc-400 hover:text-white",
                )}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#1e1e1e] px-3 h-9 text-sm font-semibold tabular-nums">
            <Users className="size-3.5 text-emerald-400" />
            <span>
              {seatedCovers} <span className="text-zinc-500 font-normal">/</span> {capacityTotal}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <IconBtn label="Floor grid" onClick={() => setMainView("floor")}>
              <Grid3X3 className="size-4" />
            </IconBtn>
            <IconBtn label="Message staff" onClick={() => setStaffMsgOpen(true)}>
              <MessageSquare className="size-4" />
            </IconBtn>
            <IconBtn label="Alerts">
              <span className="relative">
                <Bell className="size-4" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-rose-500 text-[9px] font-bold text-white grid place-items-center">
                    {alerts.length}
                  </span>
                )}
              </span>
            </IconBtn>
            <IconBtn label="Settings" href="/settings">
              <Settings className="size-4" />
            </IconBtn>
            <div className="hidden sm:block text-sm font-semibold tabular-nums text-zinc-300 pl-2 border-l border-white/10">
              {clockLabel}
            </div>
          </div>
        </header>

        {seatTarget && (
          <div className="shrink-0 px-4 py-2 bg-[#39D400] text-black flex items-center gap-3">
            <MapPin className="size-4 shrink-0" />
            <div className="text-sm font-semibold flex-1">
              Select a table for {seatTarget.name}
              <span className="font-normal opacity-80"> · party of {seatTarget.party}</span>
            </div>
            <button
              type="button"
              onClick={() => setSeatTarget(null)}
              className="inline-flex items-center gap-1 rounded-md bg-black/10 px-2.5 py-1 text-xs font-semibold"
            >
              <X className="size-3.5" /> Cancel
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)_72px]">
          {/* Left — all reservations */}
          <aside className="min-h-0 border-r border-white/10 bg-[#161616] flex flex-col">
            <div className="shrink-0 flex border-b border-white/10">
              {(
                [
                  ["reservations", "Reservations", reservationCards.length],
                  ["waiting", "Waiting", waitlist.length],
                  ["history", "History", historyBookings.length],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLeftTab(id)}
                  className={cn(
                    "flex-1 py-3 text-xs font-semibold border-b-2 transition",
                    leftTab === id
                      ? "border-[#39D400] text-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {label}{" "}
                  <span className={cn(leftTab === id ? "text-[#39D400]" : "text-zinc-600")}>
                    ({count})
                  </span>
                </button>
              ))}
            </div>

            <div className="shrink-0 p-3 flex items-center gap-2 border-b border-white/10">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                <input
                  value={listQuery}
                  onChange={(e) => setListQuery(e.target.value)}
                  placeholder="Search guests…"
                  className="w-full h-9 rounded-lg bg-[#1e1e1e] border border-white/10 pl-8 pr-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#39D400]/50"
                />
              </div>
            </div>

            <div className="shrink-0 px-3 pb-3 pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setReservationOpen(true)}
                className="flex-1 h-9 rounded-lg bg-[#39D400] text-black text-xs font-bold hover:brightness-110"
              >
                + Reservation
              </button>
              <button
                type="button"
                onClick={() => setWalkInOpen(true)}
                className="flex-1 h-9 rounded-lg border border-white/15 bg-[#1e1e1e] text-xs font-semibold hover:bg-white/5"
              >
                + Walk-in
              </button>
              <button
                type="button"
                onClick={() => {
                  setLeftTab("waiting");
                  setWalkInOpen(true);
                }}
                className="flex-1 h-9 rounded-lg border border-white/15 bg-[#1e1e1e] text-xs font-semibold hover:bg-white/5"
              >
                + Waitlist
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
              {leftTab === "reservations" &&
                reservationCards.map((b) => {
                  const flags = noteFlags(b.notes);
                  const open = expandedId === b.id;
                  return (
                    <li
                      key={b.id}
                      className={cn(
                        "rounded-xl border bg-[#1e1e1e] overflow-hidden transition",
                        open ? "border-[#39D400]/40" : "border-white/10",
                      )}
                    >
                      <button
                        type="button"
                        className="w-full text-left p-3"
                        onClick={() => {
                          setExpandedId(open ? null : b.id);
                          setDetail(b);
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-emerald-300 tabular-nums">
                                {b.time}
                              </span>
                              <span className="text-sm font-semibold text-white truncate">
                                {b.name}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                                <Users className="size-3" /> {b.people}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                              {b.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="size-3" /> {b.phone}
                                </span>
                              )}
                              <span>{b.area !== "—" ? b.area : "Dining Room"}</span>
                              {b.source === "online" || b.source === "app" ? (
                                <span className="inline-flex items-center gap-1 text-sky-400">
                                  <Globe className="size-3" /> Online
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 flex items-center gap-1.5">
                              {flags.vip && (
                                <span className="inline-flex items-center gap-1 rounded bg-violet-500/20 text-violet-300 px-1.5 py-0.5 text-[10px] font-semibold">
                                  <Crown className="size-3" /> VIP
                                </span>
                              )}
                              {flags.birthday && (
                                <span className="inline-flex size-6 items-center justify-center rounded bg-pink-500/20 text-pink-300">
                                  <Cake className="size-3.5" />
                                </span>
                              )}
                              {flags.allergy && (
                                <span className="inline-flex size-6 items-center justify-center rounded bg-amber-500/20 text-amber-300">
                                  <AlertTriangle className="size-3.5" />
                                </span>
                              )}
                              {b.tableNumber && (
                                <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-black/40 border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-white">
                                  <Armchair className="size-3 text-emerald-400" />
                                  {b.tableNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                      {(open || (b.notes && flags.allergy) || flags.birthday) && b.notes && (
                        <div className="px-3 pb-3 text-[11px] text-zinc-400 border-t border-white/5 pt-2">
                          {b.notes}
                        </div>
                      )}
                      <div className="px-3 pb-3 flex gap-2">
                        <button
                          type="button"
                          disabled={seatingBusy}
                          onClick={() =>
                            startSeat({
                              kind: "booking",
                              id: b.id,
                              name: b.name,
                              party: b.people,
                            })
                          }
                          className="flex-1 h-8 rounded-lg bg-[#39D400] text-black text-xs font-bold hover:brightness-110 disabled:opacity-50"
                        >
                          Seat
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetail(b)}
                          className="h-8 px-3 rounded-lg border border-white/15 text-xs font-semibold text-zinc-300 hover:bg-white/5"
                        >
                          Details
                        </button>
                      </div>
                    </li>
                  );
                })}

              {leftTab === "reservations" && reservationCards.length === 0 && (
                <li className="text-center text-xs text-zinc-500 py-16 px-4">
                  No reservations for this {period} service. Add one or switch AM/PM.
                </li>
              )}

              {leftTab === "waiting" &&
                waitlist.map((w) => {
                  const waited = minutesSince(w.created_at);
                  return (
                    <li key={w.id} className="rounded-xl border border-white/10 bg-[#1e1e1e] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-white">{w.guest_name}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            Party of {w.party_size}
                            {w.phone ? ` · ${w.phone}` : ""}
                          </div>
                          <div className="text-[11px] text-amber-400 mt-1 font-medium">
                            Waiting {waited} min
                            {w.quoted_wait_minutes != null
                              ? ` · quoted ${w.quoted_wait_minutes}m`
                              : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="h-8 px-3 rounded-lg bg-[#39D400] text-black text-xs font-bold"
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

              {leftTab === "waiting" && waitlist.length === 0 && (
                <li className="text-center text-xs text-zinc-500 py-16">No one waiting.</li>
              )}

              {leftTab === "history" &&
                historyBookings.map((b) => (
                  <li
                    key={b.id}
                    className="rounded-xl border border-white/10 bg-[#1e1e1e] p-3 opacity-80"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">
                          <span className="text-zinc-400 tabular-nums mr-2">{b.time}</span>
                          {b.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5 capitalize">
                          {b.status}
                          {b.tableNumber ? ` · Table ${b.tableNumber}` : ""} · {b.people} pax
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDetail(b)}
                        className="text-[11px] text-emerald-400 hover:underline"
                      >
                        View
                      </button>
                    </div>
                  </li>
                ))}

              {leftTab === "history" && historyBookings.length === 0 && (
                <li className="text-center text-xs text-zinc-500 py-16">No history yet today.</li>
              )}
            </ul>
          </aside>

          {/* Center */}
          <section className="min-h-0 min-w-0 flex flex-col bg-[#121212] relative">
            {mainView === "floor" && (
              <>
                <div className="shrink-0 px-3 py-2.5 flex gap-2 overflow-x-auto border-b border-white/10">
                  {areaTabs.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSection(s)}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition",
                        (section === s || (s === "All" && section === "All"))
                          ? "bg-white/10 border-white/20 text-white"
                          : "border-transparent text-zinc-500 hover:text-zinc-300",
                      )}
                    >
                      {s === "All"
                        ? "All areas"
                        : s === "Main"
                          ? "Salle à manger"
                          : s}
                    </button>
                  ))}
                </div>
                <div
                  className={cn(
                    "flex-1 min-h-0 relative",
                    seatTarget && "ring-inset ring-2 ring-[#39D400]",
                  )}
                >
                  <FloorPlan
                    fill
                    items={floorItems}
                    selectedId={selectedTable}
                    zoom={1}
                    onSelect={onTableClick}
                    className="absolute inset-0 h-full w-full !bg-[#1a1d22] !border-0 !rounded-none"
                  />
                  {positionedTables.length === 0 && (
                    <p className="absolute bottom-14 left-1/2 -translate-x-1/2 text-[11px] text-zinc-400 bg-black/70 border border-white/10 px-3 py-1 rounded-full pointer-events-none">
                      Demo layout ·{" "}
                      <Link to="/floorplan" className="text-[#39D400] underline pointer-events-auto">
                        place your tables
                      </Link>
                    </p>
                  )}
                </div>
              </>
            )}

            {mainView === "list" && (
              <div className="flex-1 overflow-y-auto p-4">
                <h2 className="text-lg font-semibold mb-3">Reservation list · {dateLong}</h2>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-[#1e1e1e] text-zinc-400 text-xs uppercase">
                      <tr>
                        <th className="text-left px-3 py-2.5 font-semibold">Time</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Guest</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Party</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Table</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todays.map((b) => (
                        <tr
                          key={b.id}
                          className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer"
                          onClick={() => setDetail(b)}
                        >
                          <td className="px-3 py-2.5 tabular-nums text-emerald-300">{b.time}</td>
                          <td className="px-3 py-2.5 font-medium">{b.name}</td>
                          <td className="px-3 py-2.5">{b.people}</td>
                          <td className="px-3 py-2.5">{b.tableNumber ?? "—"}</td>
                          <td className="px-3 py-2.5 capitalize text-zinc-400">{b.status}</td>
                          <td className="px-3 py-2.5 text-zinc-500 truncate max-w-[200px]">
                            {b.notes || "—"}
                          </td>
                        </tr>
                      ))}
                      {todays.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-12 text-center text-zinc-500 text-xs">
                            No bookings for this date.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {mainView === "servers" && (
              <div className="flex-1 overflow-y-auto p-6">
                <h2 className="text-lg font-semibold mb-4">Servers on floor</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {servers.map((s) => (
                    <div
                      key={s.name}
                      className="rounded-xl border border-white/10 bg-[#1e1e1e] p-4"
                    >
                      <div className="text-base font-semibold">{s.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">{s.tables} tables assigned</div>
                      <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            s.load > 70 ? "bg-amber-400" : "bg-[#39D400]",
                          )}
                          style={{ width: `${s.load}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {servers.length === 0 && (
                    <p className="text-sm text-zinc-500">Add staff to see server load.</p>
                  )}
                </div>
                <Button
                  className="mt-6 bg-[#39D400] text-black hover:brightness-110"
                  onClick={() => setStaffMsgOpen(true)}
                >
                  <MessageSquare className="size-4 mr-1.5" /> Message staff
                </Button>
              </div>
            )}

            {/* Bottom view toggles */}
            <div className="shrink-0 border-t border-white/10 bg-[#161616]/95 backdrop-blur px-3 py-2 flex items-center justify-center gap-1">
              {(
                [
                  ["floor", "Floor Plan", LayoutGrid],
                  ["list", "Reservation List", Calendar],
                  ["servers", "Servers", Utensils],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMainView(id)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border-b-2 transition",
                    mainView === id
                      ? "border-[#39D400] text-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="absolute right-4 bottom-3 size-10 rounded-full bg-[#39D400] text-black grid place-items-center shadow-lg hover:brightness-110"
                aria-label="Help"
                onClick={() =>
                  toast.message("Host Stand tip", {
                    description: "Pick a reservation, then Seat, then tap a free table on the floor.",
                  })
                }
              >
                <HelpCircle className="size-5" />
              </button>
            </div>
          </section>

          {/* Right timeline */}
          <aside className="hidden xl:flex min-h-0 border-l border-white/10 bg-[#161616] flex-col overflow-y-auto py-2">
            {timelineSlots.map((slot) => {
              const hits = bookingBySlot.get(slot) ?? [];
              const isNowish =
                clockLabel.replace(/\s/g, "").toLowerCase().startsWith(
                  slot.replace("P", "").replace("A", "").toLowerCase().slice(0, 3),
                );
              return (
                <div
                  key={slot}
                  className={cn(
                    "relative px-1.5 py-1 text-[9px] text-center tabular-nums",
                    hits.length ? "text-emerald-300 font-semibold" : "text-zinc-600",
                  )}
                  title={hits.map((b) => b.name).join(", ")}
                >
                  {hits.length > 0 && (
                    <span className="absolute left-0.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-amber-400" />
                  )}
                  {slot}
                </div>
              );
            })}
          </aside>
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
        <DialogContent className="sm:max-w-md bg-[#1e1e1e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Message staff</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Send a note to an active team member on the floor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {activeStaffList.length === 0 ? (
              <p className="text-sm text-zinc-500">No active staff accounts for this restaurant.</p>
            ) : (
              <ul className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-white/10 p-2">
                {activeStaffList.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setMsgTargetId(s.id)}
                      className={cn(
                        "w-full text-left rounded-md px-3 py-2 text-sm transition",
                        msgTargetId === s.id
                          ? "bg-[#39D400]/20 text-[#39D400] font-semibold"
                          : "hover:bg-white/5",
                      )}
                    >
                      {s.name}
                      <span className="text-xs text-zinc-500 font-normal ml-2 capitalize">
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
              className="w-full rounded-lg border border-white/10 bg-[#121212] px-3 py-2 text-sm resize-y"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/15" onClick={() => setStaffMsgOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#39D400] text-black hover:brightness-110"
              disabled={!msgTargetId || !staffMessage.trim()}
              onClick={sendStaffMessage}
            >
              Send note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Walk-in */}
      <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
        <DialogContent className="sm:max-w-md bg-[#1e1e1e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Add walk-in</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Add a party to the waitlist, then seat them from Waiting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Guest name"
              autoFocus
              className="bg-[#121212] border-white/10"
            />
            <div className="flex gap-2">
              <Select value={newParty} onValueChange={setNewParty}>
                <SelectTrigger className="w-28 bg-[#121212] border-white/10">
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
                className="flex-1 bg-[#121212] border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/15" onClick={() => setWalkInOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#39D400] text-black hover:brightness-110"
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

      {/* New reservation */}
      <Dialog open={reservationOpen} onOpenChange={setReservationOpen}>
        <DialogContent className="sm:max-w-md bg-[#1e1e1e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>New reservation</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Creates a booking for {dateLong}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={resName}
              onChange={(e) => setResName(e.target.value)}
              placeholder="Guest name"
              className="bg-[#121212] border-white/10"
            />
            <div className="flex gap-2">
              <Input
                type="time"
                value={resTime}
                onChange={(e) => setResTime(e.target.value)}
                className="w-32 bg-[#121212] border-white/10"
              />
              <Select value={resParty} onValueChange={setResParty}>
                <SelectTrigger className="w-28 bg-[#121212] border-white/10">
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
                className="flex-1 bg-[#121212] border-white/10"
              />
            </div>
            <Input
              value={resNotes}
              onChange={(e) => setResNotes(e.target.value)}
              placeholder="Notes (VIP, allergy, birthday…)"
              className="bg-[#121212] border-white/10"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/15"
              onClick={() => setReservationOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#39D400] text-black hover:brightness-110"
              disabled={!resName.trim() || createBooking.isPending}
              onClick={async () => {
                try {
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
                  setReservationOpen(false);
                  setResName("");
                  setResPhone("");
                  setResNotes("");
                  setLeftTab("reservations");
                } catch (e) {
                  toast.error((e as Error).message || "Could not create reservation");
                }
              }}
            >
              Save reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking detail */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md bg-[#1e1e1e] border-white/10 text-white">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{detail.name}</SheetTitle>
                <SheetDescription className="text-zinc-400">
                  {detail.time} · party of {detail.people}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-[#121212] border border-white/10 p-3">
                    <div className="text-[10px] uppercase text-zinc-500">Table</div>
                    <div className="font-semibold mt-0.5">{detail.tableNumber ?? "Unassigned"}</div>
                  </div>
                  <div className="rounded-lg bg-[#121212] border border-white/10 p-3">
                    <div className="text-[10px] uppercase text-zinc-500">Status</div>
                    <div className="font-semibold mt-0.5 capitalize">{detail.status}</div>
                  </div>
                </div>
                {detail.phone && (
                  <a
                    href={`tel:${detail.phone}`}
                    className="flex items-center gap-2 text-sm hover:text-[#39D400]"
                  >
                    <Phone className="size-4 text-zinc-500" /> {detail.phone}
                  </a>
                )}
                {detail.email && (
                  <a
                    href={`mailto:${detail.email}`}
                    className="flex items-center gap-2 text-sm hover:text-[#39D400]"
                  >
                    <Mail className="size-4 text-zinc-500" /> {detail.email}
                  </a>
                )}
                {detail.notes && (
                  <div className="rounded-lg border border-white/10 bg-[#121212] p-3 text-sm">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase text-zinc-500 mb-1">
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
                    className="inline-flex items-center gap-1 text-sm text-[#39D400] hover:underline"
                  >
                    Open customer profile <ExternalLink className="size-3.5" />
                  </Link>
                )}
                {detail.status !== "seated" && detail.status !== "completed" && (
                  <Button
                    className="w-full bg-[#39D400] text-black hover:brightness-110"
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

function IconBtn({
  children,
  label,
  onClick,
  href,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-[#1e1e1e] text-zinc-300 hover:bg-white/5 hover:text-white";
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
