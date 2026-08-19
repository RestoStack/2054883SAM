import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import {
  ArrowLeft, Pencil, ChevronDown, Mail, Phone, Calendar, MapPin, Users, Loader2,
} from "lucide-react";
import {
  useCustomer,
  useCustomerBookings,
  useCustomerOrders,
  useUpdateCustomer,
  type BookingRow,
  type CustomerRow,
  type OrderRow,
} from "@/lib/v2-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/customers_/$id")({
  validateSearch: (s: Record<string, unknown>) => ({ tab: (s.tab as string) || "overview" }),
  head: () => ({ meta: [{ title: "Customer — RestoStack" }] }),
  component: CustomerDetail,
});

const tagStyles: Record<string, string> = {
  VIP: "bg-success/15 text-success",
  Frequent: "bg-info/15 text-info",
  New: "bg-accent text-accent-foreground",
};

const bookingStatusStyle = (s: string) =>
  s === "seated"
    ? "bg-success/15 text-success"
    : s === "cancelled" || s === "no_show"
      ? "bg-destructive/15 text-destructive"
      : s === "completed"
        ? "bg-muted text-muted-foreground"
        : "bg-info/15 text-info";

const statusLabel = (s: string) =>
  s === "no_show" ? "No Show" : s.charAt(0).toUpperCase() + s.slice(1);

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

function CustomerDetail() {
  const { tab: urlTab } = Route.useSearch();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: c, isLoading } = useCustomer(id);
  const { data: customerBookings = [] } = useCustomerBookings(c?.id);
  const { data: customerOrders = [] } = useCustomerOrders(c?.id);
  const updateCustomer = useUpdateCustomer();
  const [tab, setTab] = useState(urlTab);
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  useEffect(() => {
    setTab(urlTab);
  }, [urlTab]);

  useEffect(() => {
    if (!c) return;
    setFullName(c.name);
    setEmail(c.email);
    setPhone(c.phone);
    setNotes(c.notes);
  }, [c]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-10 text-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin inline mr-2" /> Loading customer…
        </div>
      </AppShell>
    );
  }

  if (!c) {
    return (
      <AppShell>
        <div className="p-10 text-center">
          <div className="text-lg font-semibold">Customer not found</div>
          <p className="text-sm text-muted-foreground mt-1">This guest is not part of your restaurant’s data.</p>
          <Link to="/customers" className="inline-flex items-center gap-2 mt-4 rounded-lg bg-success text-success-foreground px-4 py-2 text-sm font-semibold">
            <ArrowLeft className="size-4" /> Back to Customers
          </Link>
        </div>
      </AppShell>
    );
  }

  const handleUpdate = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    try {
      await updateCustomer.mutateAsync({
        id: c.id,
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
      });
      toast.success("Customer updated");
      setEditOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update customer");
    }
  };

  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/customers" className="size-9 rounded-full border border-border bg-card flex items-center justify-center">
            <ArrowLeft className="size-4" />
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/customers" className="text-muted-foreground">Customers</Link>
            <span className="text-muted-foreground">›</span>
            <span className="font-medium">{c.name}</span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <Pencil className="size-4" /> Edit Customer
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium">
            More Actions <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      <div className="px-8 pt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-full bg-gradient-to-br from-accent to-primary/30 flex items-center justify-center text-2xl font-bold">
            {initials(c.name)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{c.name}</h1>
              <span className={`rounded-full text-xs font-semibold px-3 py-1 ${tagStyles[c.tag] ?? "bg-accent text-accent-foreground"}`}>
                {c.tag}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
              {c.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-4" /> {c.email}
                </span>
              )}
              {c.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-4" /> {c.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-4 rounded-xl border border-border bg-card px-2">
          {[
            [String(c.visits), "Total Visits"],
            [c.spent, "Total Spent"],
            [String(c.points), "Points"],
            [String(customerBookings.length), "Bookings"],
          ].map(([v, l]) => (
            <div key={l} className="px-4 py-4 text-center border-r border-border last:border-0">
              <div className="text-xl font-bold">{v}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-5 px-5 mt-5">
        <aside className="w-56 shrink-0">
          <nav className="flex flex-col gap-1 sticky top-4">
            {[
              ["overview", "Overview"],
              ["bookings", `Bookings${customerBookings.length ? ` (${customerBookings.length})` : ""}`],
              ["orders", `Orders${customerOrders.length ? ` (${customerOrders.length})` : ""}`],
              ["notes", "Notes"],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => {
                  setTab(k);
                  navigate({ to: "/customers/$id", params: { id: c.id }, search: { tab: k }, replace: true });
                }}
                className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors border-l-2 ${
                  tab === k
                    ? "border-success bg-success/10 text-success"
                    : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0 pb-5">
          {tab === "bookings" ? (
            <CustomerBookings list={customerBookings} />
          ) : tab === "orders" ? (
            <CustomerOrders list={customerOrders} />
          ) : tab === "notes" ? (
            <NotesPanel c={c} />
          ) : (
            <Overview c={c} bookings={customerBookings} />
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-success" /> Edit Customer
            </DialogTitle>
            <DialogDescription>Update this customer&apos;s profile information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-medium text-muted-foreground">Full name *</Label>
              <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email" className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="text-xs font-medium text-muted-foreground">Phone</Label>
              <Input id="edit-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes" className="text-xs font-medium text-muted-foreground">Notes</Label>
              <textarea
                id="edit-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setEditOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={updateCustomer.isPending || !fullName.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground hover:bg-success/90 disabled:opacity-50"
            >
              {updateCustomer.isPending && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function CustomerBookings({ list }: { list: BookingRow[] }) {
  if (list.length === 0) return <div className="text-sm text-muted-foreground">No bookings on record for this customer.</div>;
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
            {["Date", "Time", "People", "Table", "Source", "Status"].map((h) => (
              <th key={h} className="text-left font-medium px-5 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="px-5 py-4 text-muted-foreground">{b.date}</td>
              <td className="px-5 py-4">{b.time}</td>
              <td className="px-5 py-4">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5 text-muted-foreground" /> {b.people}
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="font-medium">{b.table}</div>
                <div className="text-xs text-muted-foreground">{b.area}</div>
              </td>
              <td className="px-5 py-4 text-muted-foreground capitalize">{b.source.replace("_", " ")}</td>
              <td className="px-5 py-4">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${bookingStatusStyle(b.status)}`}>
                  {statusLabel(b.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomerOrders({ list }: { list: OrderRow[] }) {
  if (list.length === 0) {
    return <div className="text-sm text-muted-foreground">No orders on record for this customer yet.</div>;
  }
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
            {["Order", "Table", "Total", "Status", "When"].map((h) => (
              <th key={h} className="text-left font-medium px-5 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((o) => (
            <tr key={o.id} className="border-b border-border last:border-0">
              <td className="px-5 py-4 font-medium">{o.shortId}</td>
              <td className="px-5 py-4">{o.table}</td>
              <td className="px-5 py-4 font-semibold">{o.total}</td>
              <td className="px-5 py-4">{o.status}</td>
              <td className="px-5 py-4 text-muted-foreground">{o.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Overview({ c, bookings }: { c: CustomerRow; bookings: BookingRow[] }) {
  const upcoming = bookings.find((b) => b.status === "pending" || b.status === "confirmed");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="Customer Details">
        <dl className="space-y-3 text-sm">
          {[
            ["Full Name", c.name],
            ["Email", c.email || "—"],
            ["Phone", c.phone || "—"],
            ["Customer Type", c.tag],
            ["Loyalty Points", String(c.points)],
            ["Total Visits", String(c.visits)],
            ["Total Spent", c.spent],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium text-right">{v}</dd>
            </div>
          ))}
          {c.notes && (
            <div className="pt-2">
              <dt className="text-muted-foreground mb-1">Notes</dt>
              <dd className="text-sm">{c.notes}</dd>
            </div>
          )}
        </dl>
      </Panel>
      <Panel title="Next Booking">
        {upcoming ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="font-medium">
                {upcoming.date} at {upcoming.time}
              </span>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Party size</dt>
              <dd className="font-medium">{upcoming.people}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Table</dt>
              <dd className="font-medium">
                {upcoming.table} · {upcoming.area}
              </dd>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4" /> From this restaurant’s booking book
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No upcoming bookings for this customer.</div>
        )}
      </Panel>
    </div>
  );
}

function NotesPanel({ c }: { c: CustomerRow }) {
  return (
    <div className="max-w-3xl">
      <Panel title="Notes">
        {c.notes ? (
          <p className="text-sm whitespace-pre-wrap">{c.notes}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No notes yet for this customer.</p>
        )}
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
