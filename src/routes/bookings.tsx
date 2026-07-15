import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { Calendar, ChevronLeft, ChevronRight, Filter, Plus, CalendarDays, Users, Ban, UserX, ArrowUpDown, X, MapPin, Clock, Globe, Pencil, MoreHorizontal, User, Phone, Mail, StickyNote, Loader2, Check } from "lucide-react";
import { useBookings, slugify, useCreateBooking, useUpdateBooking, useDashboardStats, type BookingStatus } from "@/lib/v2-data";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FloorPlan, mainFloorPlan } from "@/components/FloorPlan";

export const Route = createFileRoute("/bookings")({
  head: () => ({ meta: [{ title: "Bookings — RestoStack" }] }),
  component: BookingsPage,
});

const tabs: Array<{ label: string; statuses: BookingStatus[] | null }> = [
  { label: "All Bookings", statuses: null },
  { label: "Upcoming", statuses: ["pending", "confirmed"] },
  { label: "Seated", statuses: ["seated"] },
  { label: "Completed", statuses: ["completed"] },
  { label: "Cancelled", statuses: ["cancelled"] },
  { label: "No Show", statuses: ["no_show"] },
];

type SectionKey = "main" | "patio" | "bar" | "private";

const sections: Record<SectionKey, { label: string; sub: string; tables: { id: number | string; type?: "bar" | "plant" | "empty" }[] }> = {
  main: {
    label: "Main Dining",
    sub: "Center floor · 12 tables",
    tables: [
      { id: "plant", type: "plant" }, { id: 11 }, { id: 12 }, { id: 13 }, { id: 14 }, { id: "", type: "empty" }, { id: "", type: "empty" },
      { id: "", type: "empty" }, { id: 10 }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: 16 }, { id: 17 },
      { id: "plant", type: "plant" }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: "bar1", type: "bar" }, { id: "bar2", type: "bar" }, { id: 15 }, { id: "", type: "empty" },
      { id: "", type: "empty" }, { id: 9 }, { id: 8 }, { id: "bar3", type: "bar" }, { id: "bar4", type: "bar" }, { id: 19 }, { id: 18 },
      { id: "plant", type: "plant" }, { id: 7 }, { id: 6 }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: 20 }, { id: 21 },
    ],
  },
  patio: {
    label: "Outdoor Patio",
    sub: "Garden view · 8 tables",
    tables: [
      { id: "plant", type: "plant" }, { id: 30 }, { id: 31 }, { id: "", type: "empty" }, { id: 32 }, { id: 33 }, { id: "plant", type: "plant" },
      { id: "", type: "empty" }, { id: 34 }, { id: 35 }, { id: "", type: "empty" }, { id: 36 }, { id: 37 }, { id: "", type: "empty" },
      { id: "plant", type: "plant" }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: "plant", type: "plant" },
    ],
  },
  bar: {
    label: "Bar Lounge",
    sub: "Stools & high-tops · 6 seats",
    tables: [
      { id: "bar1", type: "bar" }, { id: "bar2", type: "bar" }, { id: "bar3", type: "bar" }, { id: "bar4", type: "bar" }, { id: "bar5", type: "bar" }, { id: "bar6", type: "bar" }, { id: "", type: "empty" },
      { id: "", type: "empty" }, { id: 40 }, { id: 41 }, { id: "", type: "empty" }, { id: 42 }, { id: 43 }, { id: "", type: "empty" },
      { id: "plant", type: "plant" }, { id: "", type: "empty" }, { id: 44 }, { id: 45 }, { id: 46 }, { id: "", type: "empty" }, { id: "plant", type: "plant" },
    ],
  },
  private: {
    label: "Private Room",
    sub: "Reserved area · 4 tables",
    tables: [
      { id: "plant", type: "plant" }, { id: "", type: "empty" }, { id: 50 }, { id: 51 }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: "plant", type: "plant" },
      { id: "", type: "empty" }, { id: "", type: "empty" }, { id: 52 }, { id: 53 }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: "", type: "empty" },
      { id: "plant", type: "plant" }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: "", type: "empty" }, { id: "plant", type: "plant" },
    ],
  },
};

const sectionKeyToLabel: Record<SectionKey, string> = {
  main: "Main Dining",
  patio: "Outdoor Patio",
  bar: "Bar Lounge",
  private: "Private Room",
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const prettyDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const statusLabel = (s: BookingStatus) =>
  s === "no_show" ? "No Show" : s.charAt(0).toUpperCase() + s.slice(1);

type DateMode = "single" | "upcoming";

const addDaysISO = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

function BookingsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<SectionKey>("main");
  const [selectedTable, setSelectedTable] = useState<number | string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", people: 2, time: "19:00", notes: "" });
  const [dateISO, setDateISO] = useState<string>(todayISO());
  const [dateMode, setDateMode] = useState<DateMode>("single");

  const { data: allBookings = [], isLoading } = useBookings();
  const { data: dash } = useDashboardStats();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();

  const today = todayISO();
  const upcomingEnd = addDaysISO(today, 14);
  const dateBookings =
    dateMode === "upcoming"
      ? allBookings.filter((b) => b.date >= today && b.date <= upcomingEnd)
      : allBookings.filter((b) => b.date === dateISO);
  const tabStatuses = tabs[tab].statuses;
  const bookings = tabStatuses ? dateBookings.filter((b) => tabStatuses.includes(b.status)) : dateBookings;
  const sel = bookings.find((b) => b.id === selectedId) ?? bookings[0] ?? null;

  const countBy = (statuses: BookingStatus[]) => dateBookings.filter((b) => statuses.includes(b.status)).length;
  const kpiSuffix = dateMode === "upcoming" ? "next 14 days" : dateISO === today ? "today" : prettyDate(dateISO);
  const kpis = [
    { l: "Total Bookings", v: dateBookings.length, i: CalendarDays, color: "bg-accent text-primary" },
    { l: "Seated", v: countBy(["seated"]), i: Users, color: "bg-info/15 text-info" },
    { l: "Upcoming", v: countBy(["pending", "confirmed"]), i: Calendar, color: "bg-warning/20 text-warning" },
    { l: "Cancellations", v: countBy(["cancelled"]), i: Ban, color: "bg-destructive/15 text-destructive" },
    { l: "No Shows", v: countBy(["no_show"]), i: UserX, color: "bg-chart-4/15 text-chart-4" },
  ];
  void dash;

  const setSingle = (iso: string) => { setDateMode("single"); setDateISO(iso); };
  const shiftDate = (days: number) => setSingle(addDaysISO(dateISO, days));

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Guest name is required");
      return;
    }
    try {
      await createBooking.mutateAsync({
        guest_name: form.name.trim(),
        guest_phone: form.phone.trim() || undefined,
        guest_email: form.email.trim() || undefined,
        party_size: Number(form.people) || 2,
        date: dateISO,
        time: form.time,
        section: sectionKeyToLabel[section],
        table_number: selectedTable ? String(selectedTable) : null,
        notes: form.notes.trim() || undefined,
        source: "phone",
      });
      toast.success("Booking created");
      setOpen(false);
      setForm({ name: "", phone: "", email: "", people: 2, time: "19:00", notes: "" });
      setSelectedTable(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create booking");
    }
  };

  const handleStatus = async (status: BookingStatus) => {
    if (!sel) return;
    if (status === "seated" && !sel.tableNumber) {
      toast.message("Pick a table on the floor plan below first, then mark Seated.");
      return;
    }
    try {
      await updateBooking.mutateAsync({ id: sel.id, status });
      toast.success(`Marked as ${statusLabel(status)}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };


  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all restaurant bookings in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <Calendar className="size-4" />
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setSingle(e.target.value)}
              className="bg-transparent text-sm outline-none [color-scheme:dark]"
            />
            <button onClick={() => shiftDate(-1)} className="ml-1 p-0.5 hover:bg-muted rounded"><ChevronLeft className="size-3.5" /></button>
            <button onClick={() => shiftDate(1)} className="p-0.5 hover:bg-muted rounded"><ChevronRight className="size-3.5" /></button>
          </div>
          {([
            { label: "Today", onClick: () => setSingle(today), active: dateMode === "single" && dateISO === today },
            { label: "Tomorrow", onClick: () => setSingle(addDaysISO(today, 1)), active: dateMode === "single" && dateISO === addDaysISO(today, 1) },
            { label: "All upcoming", onClick: () => setDateMode("upcoming"), active: dateMode === "upcoming" },
          ]).map((c) => (
            <button
              key={c.label}
              onClick={c.onClick}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${c.active ? "border-success bg-success/10 text-success" : "border-border bg-card"}`}
            >{c.label}</button>
          ))}
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"><Filter className="size-4" /> Filters</button>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground hover:bg-success/90"><Plus className="size-4" /> New Booking</button>
        </div>
      </div>

      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpis.map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`size-9 rounded-full ${s.color} flex items-center justify-center shrink-0`}><s.i className="size-4.5" /></div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">{s.l}</div>
              </div>
              <div className="mt-2 text-3xl font-bold">{s.v}</div>
              <div className="text-xs font-semibold mt-1 text-muted-foreground whitespace-nowrap">{kpiSuffix}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-4 px-5 border-b border-border overflow-x-auto">
              {tabs.map((t, i) => (
                <button key={t.label} onClick={() => setTab(i)} className={`py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === i ? "border-success text-success" : "border-transparent text-muted-foreground"}`}>{t.label}</button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium px-5 py-3"><span className="inline-flex items-center gap-1">Booking Time <ArrowUpDown className="size-3" /></span></th>
                  <th className="text-left font-medium px-2 py-3">Guest</th>
                  <th className="text-left font-medium px-2 py-3">Source</th>
                  <th className="text-left font-medium px-2 py-3">People</th>
                  <th className="text-left font-medium px-2 py-3">Table</th>
                  <th className="text-left font-medium px-2 py-3">Notes</th>
                  <th className="text-left font-medium px-2 py-3">Status</th>
                  <th className="w-8"></th>
                </tr></thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground"><Loader2 className="size-4 animate-spin inline mr-2" />Loading…</td></tr>
                  )}
                  {!isLoading && bookings.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-10 rounded-full bg-muted flex items-center justify-center"><CalendarDays className="size-5 text-muted-foreground" /></div>
                        <div className="font-medium">No bookings {dateMode === "upcoming" ? "in the next 14 days" : `on ${prettyDate(dateISO)}`}</div>
                        <div className="text-xs text-muted-foreground">
                          {dateMode === "single" ? (
                            <>Try <button onClick={() => setDateMode("upcoming")} className="text-success underline">All upcoming</button> or add a new booking.</>
                          ) : (
                            <>Share your booking link with guests or add one manually.</>
                          )}
                        </div>
                      </div>
                    </td></tr>
                  )}
                  {bookings.map((b) => (
                    <tr key={b.id} onClick={() => setSelectedId(b.id)} className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 ${sel?.id === b.id ? "bg-success/5 border-l-2 border-l-success" : ""}`}>
                      <td className="px-5 py-4 whitespace-nowrap"><div className="text-xs text-muted-foreground">{b.date}</div><div className="font-medium">{b.time}</div></td>
                      <td className="px-2 py-4">
                        {b.customerId ? (
                          <Link to="/customers/$id" params={{ id: b.customerId }} className="flex items-center gap-2.5 hover:underline">
                            <div className="size-9 rounded-full bg-muted shrink-0" />
                            <div><div className="font-medium">{b.name}</div><div className="text-xs text-muted-foreground">{b.phone}</div></div>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <div className="size-9 rounded-full bg-muted shrink-0" />
                            <div><div className="font-medium">{b.name}</div><div className="text-xs text-muted-foreground">{b.phone}</div></div>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-4">{b.source === "online" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2 py-0.5 text-xs font-semibold">
                          <Globe className="size-3" /> Online
                        </span>
                      ) : (
                        <span className="text-muted-foreground capitalize">{b.source.replace("_", " ")}</span>
                      )}</td>
                      <td className="px-2 py-4"><span className="inline-flex items-center gap-1"><Users className="size-3.5 text-muted-foreground" />{b.people}</span></td>
                      <td className="px-2 py-4 whitespace-nowrap"><div className="font-medium">{b.table}</div><div className="text-xs text-muted-foreground">{b.area}</div></td>
                      <td className="px-2 py-4 max-w-[160px]"><div className="text-xs text-muted-foreground truncate">{b.notes || "—"}</div></td>
                      <td className="px-2 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${b.status === "seated" ? "bg-success/15 text-success" : b.status === "cancelled" || b.status === "no_show" ? "bg-destructive/15 text-destructive" : b.status === "completed" ? "bg-muted text-muted-foreground" : "bg-info/15 text-info"}`}>{statusLabel(b.status)}</span></td>
                      <td><ChevronRight className="size-4 text-muted-foreground" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3 text-sm border-t border-border">
              <span className="text-muted-foreground">Showing {bookings.length} booking{bookings.length === 1 ? "" : "s"} {dateMode === "upcoming" ? "in the next 14 days" : `on ${prettyDate(dateISO)}`}</span>
            </div>
          </div>


          <aside className="rounded-xl border border-border bg-card p-5 h-fit sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Booking Detail</h3>
              <button className="size-7 rounded-md hover:bg-muted flex items-center justify-center"><X className="size-4" /></button>
            </div>
            {!sel ? (
              <div className="text-sm text-muted-foreground text-center py-10">Select a booking to view details.</div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-12 rounded-full bg-gradient-to-br from-accent to-primary/30" />
                  <div className="flex-1">
                    <div className="font-semibold">{sel.name}</div>
                    <div className="text-xs text-muted-foreground">{sel.phone}</div>
                  </div>
                  {sel.customerId ? (
                    <Link to="/customers/$id" params={{ id: sel.customerId }} className="text-xs font-semibold text-success border border-success/30 rounded-md px-3 py-1.5 hover:bg-success/10">View Customer</Link>
                  ) : null}
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2.5"><Clock className="size-4 text-muted-foreground mt-0.5" /><div className="flex-1"><div>{sel.date}</div><div className="text-xs text-muted-foreground">{sel.time}</div></div><div className="text-xs inline-flex items-center gap-1"><Users className="size-3.5" /> {sel.people} People</div></div>
                  <div className="flex items-center gap-2.5"><Globe className="size-4 text-muted-foreground" /> {sel.source}</div>
                  {sel.notes && <div className="flex items-start gap-2.5"><StickyNote className="size-4 text-muted-foreground mt-0.5" /><div className="text-xs">{sel.notes}</div></div>}
                </div>
                <div className="my-5 border-t border-border" />
                <div className="text-sm font-semibold mb-2">Status</div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(["confirmed", "seated", "completed", "cancelled", "no_show"] as BookingStatus[]).map((s) => {
                    const active = sel.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatus(s)}
                        disabled={active || updateBooking.isPending}
                        className={`text-xs rounded-full px-2.5 py-1 font-medium border transition-colors ${active ? "bg-success/15 text-success border-success/40" : "border-border hover:bg-muted"}`}
                      >
                        {active && <Check className="size-3 inline mr-0.5" />}{statusLabel(s)}
                      </button>
                    );
                  })}
                </div>
                <div className="text-sm font-semibold mb-2">Table Information</div>
                <div className="flex items-center gap-2 text-sm mb-4"><MapPin className="size-4 text-success" /><div><div className="font-medium">{sel.table}</div><div className="text-xs text-muted-foreground">{sel.area}</div></div></div>
                <div className="text-sm font-semibold mb-2">Table Location — tap to reassign</div>
                <FloorPlan
                  items={mainFloorPlan}
                  compact
                  selectedId={sel.tableNumber ? Number(sel.tableNumber) : null}
                  onSelect={async (id) => {
                    try {
                      await updateBooking.mutateAsync({ id: sel.id, table_number: String(id) });
                      toast.success(`Assigned Table ${id}`);
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Failed to reassign");
                    }
                  }}
                />
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm font-semibold"><Pencil className="size-4" /> Edit Booking</button>
                  <button className="size-9 rounded-lg border border-border flex items-center justify-center"><MoreHorizontal className="size-4" /></button>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-5 text-success" /> New Booking</DialogTitle>
            <DialogDescription>Add a customer manually and assign them a table.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5"><User className="size-3.5" /> Full name</Label>
              <Input id="name" placeholder="Jane Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5"><Phone className="size-3.5" /> Phone number</Label>
              <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5"><Mail className="size-3.5" /> Email</Label>
              <Input id="email" type="email" placeholder="jane@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="people" className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5"><Users className="size-3.5" /> Party size</Label>
              <Input id="people" type="number" min={1} value={form.people} onChange={(e) => setForm({ ...form, people: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time" className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5"><Clock className="size-3.5" /> Time</Label>
              <Input id="time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5"><StickyNote className="size-3.5" /> Notes (optional)</Label>
              <Input id="notes" placeholder="Allergies, occasion, seating preference…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold inline-flex items-center gap-1.5"><MapPin className="size-4 text-success" /> Section & table</Label>
              <span className="text-xs text-muted-foreground">{sections[section].sub}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(sections) as SectionKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setSection(k); setSelectedTable(null); }}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-colors ${section === k ? "border-success bg-success/10 text-success" : "border-border bg-card hover:bg-muted/50"}`}
                >
                  <div>{sections[k].label}</div>
                  <div className="text-[11px] font-normal text-muted-foreground mt-0.5">{sections[k].sub}</div>
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-muted-foreground">{sections[section].label} — floor plan</div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="size-3 rounded-full bg-zinc-300" /> Available</span>
                  <span className="inline-flex items-center gap-1"><span className="size-3 rounded-full bg-success" /> Selected</span>
                </div>
              </div>
              <FloorPlan
                items={mainFloorPlan}
                selectedId={typeof selectedTable === "number" ? selectedTable : null}
                onSelect={(id) => setSelectedTable(id)}
              />
              <div className="mt-3 text-xs text-muted-foreground">
                {selectedTable
                  ? <>Selected: <span className="font-semibold text-foreground">Table {selectedTable}</span> in {sections[section].label}</>
                  : <>Tap a table to assign a location.</>}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <button onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={handleCreate} className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground hover:bg-success/90 disabled:opacity-50" disabled={createBooking.isPending || !form.name.trim()}>
              {createBooking.isPending ? "Creating…" : "Create Booking"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
