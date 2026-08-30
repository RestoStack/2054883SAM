import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createManualReservation,
  listReservationsForRange,
  updateReservationStatus,
} from "@/lib/booking-api";
import { settingsListLocations } from "@/lib/settings-api";
import { ensureGuestIdForContact } from "@/lib/guests-api";
import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";
import {
  Calendar,
  Check,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  StickyNote,
  User,
  Users,
} from "lucide-react";

type ResSearch = { from?: string; to?: string; date?: string; create?: string };

export const Route = createFileRoute("/app_/reservations")({
  validateSearch: (s: Record<string, unknown>): ResSearch => ({
    from: typeof s.from === "string" ? s.from : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
    date: typeof s.date === "string" ? s.date : undefined,
    create: typeof s.create === "string" ? s.create : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reservations — RestoStack" },
      { name: "description", content: "View and manage reservations by date or month" },
    ],
  }),
  component: ReservationsPage,
});

type ReservationStatus = "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";

type ReservationRow = {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  party_size: number;
  reserved_date: string;
  reserved_time: string;
  table_id: string | null;
  table_number: string | null;
  status: ReservationStatus;
  source: string;
  notes: string | null;
  guest_id?: string | null;
};

function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function formatTime(t: string): string {
  const raw = (t ?? "").slice(0, 5);
  const [hStr, mStr] = raw.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return raw || "—";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const STATUS_OPTIONS: ReservationStatus[] = [
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
];

const statusStyle: Record<ReservationStatus, string> = {
  pending: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  confirmed: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  seated: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  no_show: "bg-rose-500/15 text-rose-600 border-rose-500/30",
};

const statusLabel = (s: ReservationStatus) =>
  s === "no_show" ? "No Show" : s.charAt(0).toUpperCase() + s.slice(1);

const emptyForm = { name: "", phone: "", email: "", party: 2, time: "19:00", notes: "" };

type Preset = "today" | "week" | "month" | "custom";

function ReservationsPage() {
  const { org, staff } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const orgId = org.activeOrganizationId;
  const restaurantId = staff?.restaurant_id ?? null;
  const tenantReady = Boolean(orgId || restaurantId);
  const [locationId, setLocationId] = useState(org.activeLocationId ?? "");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  const initialDay = search.date || search.from || todayISO();
  const hasRange = Boolean(search.from && search.to);
  const [preset, setPreset] = useState<Preset>(() => {
    if (hasRange && search.from !== search.to) {
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
      if (search.from === monthStart && search.to === monthEnd) return "month";
      return "custom";
    }
    if (!search.from && !search.to && !search.date) return "month";
    return "today";
  });
  const [fromISO, setFromISO] = useState(
    search.from ||
      (!search.date ? format(startOfMonth(new Date()), "yyyy-MM-dd") : initialDay),
  );
  const [toISO, setToISO] = useState(
    search.to ||
      search.date ||
      (!search.from ? format(endOfMonth(new Date()), "yyyy-MM-dd") : initialDay),
  );
  const [createDate, setCreateDate] = useState(initialDay);

  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(search.create === "1");
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (search.create === "1") setCreateOpen(true);
  }, [search.create]);

  const applyPreset = (p: Preset) => {
    const today = new Date();
    setPreset(p);
    if (p === "today") {
      const d = todayISO();
      setFromISO(d);
      setToISO(d);
      setCreateDate(d);
    } else if (p === "week") {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      setFromISO(format(start, "yyyy-MM-dd"));
      setToISO(format(addDays(start, 6), "yyyy-MM-dd"));
      setCreateDate(todayISO());
    } else if (p === "month") {
      setFromISO(format(startOfMonth(today), "yyyy-MM-dd"));
      setToISO(format(endOfMonth(today), "yyyy-MM-dd"));
      setCreateDate(todayISO());
    }
  };

  useEffect(() => {
    navigate({
      to: "/app/reservations",
      search: { from: fromISO, to: toISO },
      replace: true,
    });
  }, [fromISO, toISO, navigate]);

  useEffect(() => {
    if (!orgId && !restaurantId) {
      setLocations([]);
      return;
    }
    (async () => {
      const res = await settingsListLocations(orgId, restaurantId);
      const locs = (
        res.ok && Array.isArray((res as any).locations) ? (res as any).locations : []
      ) as Array<{ id: string; name: string }>;
      setLocations(locs);
      const preferred =
        (org.activeLocationId && locs.find((l) => l.id === org.activeLocationId)?.id) ||
        locs[0]?.id ||
        restaurantId ||
        "";
      setLocationId((prev) => prev || preferred);
    })();
  }, [orgId, restaurantId, org.activeLocationId]);

  const refresh = useCallback(async () => {
    if (!tenantReady) {
      setRows([]);
      setLoading(false);
      return;
    }
    const res = await listReservationsForRange(
      orgId,
      locationId || null,
      fromISO,
      toISO,
      restaurantId,
    );
    if (!res.ok) {
      toast.error(res.error);
      setLoading(false);
      return;
    }
    setRows(res.rows as unknown as ReservationRow[]);
    setLoading(false);
  }, [tenantReady, orgId, locationId, fromISO, toISO, restaurantId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const grouped = useMemo(() => {
    const map = new Map<string, ReservationRow[]>();
    const sorted = rows
      .slice()
      .sort(
        (a, b) =>
          a.reserved_date.localeCompare(b.reserved_date) ||
          a.reserved_time.localeCompare(b.reserved_time),
      );
    for (const r of sorted) {
      const key = r.reserved_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()];
  }, [rows]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = { total: rows.length };
    for (const r of rows) acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, [rows]);

  const handleStatus = async (id: string, status: ReservationStatus) => {
    if (!tenantReady) return;
    const prev = rows;
    setBusyId(id);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    const res = await updateReservationStatus(orgId ?? restaurantId ?? "", id, status);
    setBusyId(null);
    if (!res.ok) {
      setRows(prev);
      toast.error(res.error);
      return;
    }
    toast.success(`Marked ${statusLabel(status)}`);
  };

  const handleCreate = async () => {
    if (!tenantReady) return;
    if (!form.name.trim()) {
      toast.error("Guest name is required");
      return;
    }
    setCreating(true);
    const res = await createManualReservation({
      organization_id: orgId ?? restaurantId ?? "",
      location_id: locationId || restaurantId || "",
      restaurant_id: restaurantId,
      guest_name: form.name.trim(),
      party_size: Number(form.party) || 1,
      date: createDate,
      time: form.time,
      guest_phone: form.phone.trim() || null,
      guest_email: form.email.trim() || null,
      notes: form.notes.trim() || null,
    });
    setCreating(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Reservation created");
    setCreateOpen(false);
    setForm(emptyForm);
    void refresh();
  };

  const rangeLabel = fromISO === toISO ? fromISO : `${fromISO} → ${toISO}`;

  return (
    <AppShell>
      <div className="px-5 pt-4 pb-4 border-b border-border bg-card/40 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse by day, week, or month — {rangeLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {locations.length > 1 && (
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="h-11 w-[180px]">
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
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            {(
              [
                ["today", "Today"],
                ["week", "This week"],
                ["month", "This month"],
                ["custom", "Custom"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={cn(
                  "h-10 rounded-md px-3 text-xs font-semibold",
                  preset === key
                    ? "bg-emerald-500 text-white"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-11 text-sm">
            <Calendar className="size-4 text-muted-foreground" />
            <input
              type="date"
              value={fromISO}
              onChange={(e) => {
                setPreset("custom");
                setFromISO(e.target.value);
                if (e.target.value > toISO) setToISO(e.target.value);
                setCreateDate(e.target.value);
              }}
              className="bg-transparent text-sm outline-none"
              aria-label="From date"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="date"
              value={toISO}
              onChange={(e) => {
                setPreset("custom");
                setToISO(e.target.value);
                if (e.target.value < fromISO) setFromISO(e.target.value);
              }}
              className="bg-transparent text-sm outline-none"
              aria-label="To date"
            />
          </div>
          <Button className="h-11 font-semibold" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New reservation
          </Button>
        </div>
      </div>

      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(
            [
              ["Total", counts.total ?? 0],
              ["Confirmed", counts.confirmed ?? 0],
              ["Seated", counts.seated ?? 0],
              ["Completed", counts.completed ?? 0],
              ["Cancelled", counts.cancelled ?? 0],
              ["No Show", counts.no_show ?? 0],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin inline mr-2" /> Loading…
            </div>
          ) : grouped.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No reservations in this date range.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {grouped.map(([date, dayRows]) => (
                <div key={date}>
                  <div className="sticky top-0 z-10 flex items-center justify-between bg-muted/60 px-4 py-2 text-sm font-semibold">
                    <span>{format(new Date(date + "T12:00:00"), "EEEE, MMM d, yyyy")}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {dayRows.length} booking{dayRows.length === 1 ? "" : "s"} ·{" "}
                      {dayRows.reduce((s, r) => s + r.party_size, 0)} covers
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {dayRows.map((r) => (
                      <li key={r.id} className="p-4 flex flex-wrap items-center gap-3">
                        <div className="w-20 shrink-0 text-sm font-semibold tabular-nums">
                          {formatTime(r.reserved_time)}
                        </div>
                        <div className="flex-1 min-w-[160px]">
                          <button
                            type="button"
                            className="font-medium text-left hover:underline text-emerald-700"
                            title="View guest profile"
                            onClick={() => {
                              void (async () => {
                                let id = r.guest_id ?? null;
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
                              })();
                            }}
                          >
                            {r.guest_name}
                          </button>
                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2.5 mt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <Users className="size-3" /> {r.party_size}
                            </span>
                            {r.table_number && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="size-3" /> {r.table_number}
                              </span>
                            )}
                            {r.guest_phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="size-3" /> {r.guest_phone}
                              </span>
                            )}
                            <span className="capitalize">{r.source.replace("_", " ")}</span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
                            statusStyle[r.status],
                          )}
                        >
                          {statusLabel(r.status)}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {STATUS_OPTIONS.map((s) => {
                            const active = r.status === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                disabled={active || busyId === r.id}
                                onClick={() => void handleStatus(r.id, s)}
                                className={cn(
                                  "h-9 rounded-full border px-2.5 text-xs font-medium transition-colors disabled:cursor-default",
                                  active
                                    ? "bg-success/15 text-success border-success/40"
                                    : "border-border hover:bg-muted",
                                )}
                              >
                                {active && <Check className="size-3 inline mr-0.5" />}
                                {statusLabel(s)}
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-success" /> New reservation
            </DialogTitle>
            <DialogDescription>Manually add a booking.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                <User className="size-3.5" /> Guest name
              </Label>
              <Input
                className="h-11"
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" /> Date
              </Label>
              <Input
                className="h-11"
                type="date"
                value={createDate}
                onChange={(e) => setCreateDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                <Clock className="size-3.5" /> Time
              </Label>
              <Input
                className="h-11"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                <Phone className="size-3.5" /> Phone
              </Label>
              <Input
                className="h-11"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> Email
              </Label>
              <Input
                className="h-11"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                <Users className="size-3.5" /> Party size
              </Label>
              <Input
                className="h-11"
                type="number"
                min={1}
                max={50}
                value={form.party}
                onChange={(e) => setForm({ ...form, party: Number(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                <StickyNote className="size-3.5" /> Notes (optional)
              </Label>
              <Input
                className="h-11"
                placeholder="Allergies, occasion, seating preference…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="h-11 font-semibold"
              disabled={creating || !form.name.trim()}
              onClick={() => void handleCreate()}
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
