import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import {
  ArrowLeft, Pencil, ChevronDown, Mail, Phone, Calendar, MapPin, User, Users, Plus, Utensils,
  Armchair, Compass, Clock, Leaf, Sparkles, Download, Gift, Bell, MessageSquare, Smartphone, FileText, Loader2,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { orderHistory } from "@/lib/mock-data";
import { useCustomer, useCustomerBookings, type BookingRow, type CustomerRow } from "@/lib/v2-data";
import dishTruffle from "@/assets/dish-truffle-pasta.jpg";
import dishAlfredo from "@/assets/dish-chicken-alfredo.jpg";
import dishPizza from "@/assets/dish-margherita.jpg";
import dishTiramisu from "@/assets/dish-tiramisu.jpg";
import dishSalmon from "@/assets/dish-salmon.jpg";

export const Route = createFileRoute("/customers_/$id")({
  validateSearch: (s: Record<string, unknown>) => ({ tab: (s.tab as string) || "overview" }),
  head: () => ({ meta: [{ title: "Customer — RestoStack" }] }),
  component: CustomerDetail,
});

const visits = [{ x: "Dec", v: 0 }, { x: "Jan", v: 1 }, { x: "Feb", v: 2 }, { x: "Mar", v: 0 }, { x: "Apr", v: 5 }, { x: "May", v: 8 }];
const dishes = [
  { name: "Truffle Pasta", img: dishTruffle },
  { name: "Chicken Alfredo", img: dishAlfredo },
  { name: "Margherita Pizza", img: dishPizza },
  { name: "Tiramisu", img: dishTiramisu },
  { name: "Grilled Salmon", img: dishSalmon },
];
const tagStyles: Record<string, string> = {
  VIP: "bg-success/15 text-success",
  Frequent: "bg-info/15 text-info",
  New: "bg-accent text-accent-foreground",
  "Birthday This Month": "bg-success/15 text-success",
  "High Spender": "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  Instagram: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function CustomerDetail() {
  const { tab: urlTab } = Route.useSearch();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: c, isLoading } = useCustomer(id);
  const { data: customerBookings = [] } = useCustomerBookings(c?.id);
  const [tab, setTab] = useState(urlTab);
  useEffect(() => { setTab(urlTab); }, [urlTab]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading customer…
        </div>
      </AppShell>
    );
  }

  if (!c) {
    return (
      <AppShell>
        <div className="px-8 py-16 text-center">
          <h1 className="text-xl font-bold">Customer not found</h1>
          <p className="text-sm text-muted-foreground mt-2">This guest profile is missing or was linked incorrectly.</p>
          <Link to="/customers" className="inline-flex mt-6 rounded-lg bg-success text-success-foreground px-4 py-2 text-sm font-semibold">
            Back to Customers
          </Link>
        </div>
      </AppShell>
    );
  }

  const routeId = c.id;

  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/customers" className="size-9 rounded-full border border-border bg-card flex items-center justify-center"><ArrowLeft className="size-4" /></Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/customers" className="text-muted-foreground">Customers</Link>
            <span className="text-muted-foreground">›</span>
            <span className="font-medium">{c.name}</span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"><Pencil className="size-4" /> Edit Customer</button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium">More Actions <ChevronDown className="size-4" /></button>
        </div>
      </div>

      <div className="px-8 pt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-full bg-gradient-to-br from-accent to-primary/40 flex items-center justify-center text-xl font-bold text-primary">
            {initials(c.name)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{c.name}</h1>
              <span className={`rounded-full text-xs font-semibold px-3 py-1 ${tagStyles[c.tag] ?? "bg-accent text-accent-foreground"}`}>{c.tag}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
              {c.email && <span className="inline-flex items-center gap-1.5"><Mail className="size-4" /> {c.email}</span>}
              {c.phone && <span className="inline-flex items-center gap-1.5"><Phone className="size-4" /> {c.phone}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-4 rounded-xl border border-border bg-card px-2">
          {[
            [String(c.visits), "Total Visits"],
            [c.spent, "Total Spent"],
            [String(customerBookings.length), "Bookings"],
            [String(c.points), "Points Earned"],
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
              ["orders", "Order History"],
              ["bookings", `Bookings${customerBookings.length ? ` (${customerBookings.length})` : ""}`],
              ["loyalty", "Loyalty & Rewards"],
              ["comms", "Communications"],
              ["notes", "Notes"],
              ["prefs", "Preferences"],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => { setTab(k); navigate({ to: "/customers/$id", params: { id: routeId }, search: { tab: k }, replace: true }); }}
                className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors border-l-2 ${tab === k ? "border-success bg-success/10 text-success" : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
              >
                {l}
              </button>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0 pb-5">
          {tab === "orders" ? <OrderHistory />
            : tab === "bookings" ? <CustomerBookings list={customerBookings} />
            : tab === "loyalty" ? <LoyaltyTab points={c.points} />
            : tab === "comms" ? <CommsTab c={c} />
            : tab === "notes" ? <NotesTab notes={c.notes} />
            : tab === "prefs" ? <PrefsTab />
            : <Overview c={c} bookings={customerBookings} />}
        </div>
      </div>
    </AppShell>
  );
}

function statusLabel(status: BookingRow["status"]) {
  return status.replace("_", " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function CustomerBookings({ list }: { list: BookingRow[] }) {
  if (list.length === 0) return <div className="text-sm text-muted-foreground">No bookings on record for this customer.</div>;
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
          {["Guest", "Date", "Time", "People", "Table", "Status"].map((h) => <th key={h} className="text-left font-medium px-5 py-3">{h}</th>)}
        </tr></thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="px-5 py-4 font-medium"><Link to="/bookings" className="hover:underline">{b.name}</Link></td>
              <td className="px-5 py-4 text-muted-foreground">{b.date}</td>
              <td className="px-5 py-4">{b.time}</td>
              <td className="px-5 py-4">{b.people}</td>
              <td className="px-5 py-4"><div className="font-medium">{b.table}</div><div className="text-xs text-muted-foreground">{b.area}</div></td>
              <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.status === "seated" ? "bg-success/15 text-success" : "bg-info/15 text-info"}`}>{statusLabel(b.status)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Overview({ c, bookings }: { c: CustomerRow; bookings: BookingRow[] }) {
  const last = bookings[0];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="space-y-4">
        <Panel title="Customer Details" action={<button className="text-xs font-semibold border border-border rounded-md px-3 py-1 inline-flex items-center gap-1"><Pencil className="size-3" /> Edit</button>}>
          <dl className="space-y-3 text-sm">
            {[
              ["Full Name", c.name],
              ["Email", c.email || "—"],
              ["Phone", c.phone || "—"],
              ["Customer Type", c.tag],
              ["Visits", String(c.visits)],
              ["Total Spent", c.spent],
            ].map(([k, v], i) => (
              <div key={i} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
            {c.notes && (
              <div className="pt-2"><dt className="text-muted-foreground mb-1">Notes</dt><dd className="text-sm">{c.notes}</dd></div>
            )}
          </dl>
        </Panel>
        <Panel title="Tags" action={<button className="text-xs font-semibold border border-border rounded-md px-3 py-1"><Pencil className="size-3 inline" /> Edit</button>}>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full text-xs font-semibold px-3 py-1.5 ${tagStyles[c.tag] ?? "bg-accent text-accent-foreground"}`}>{c.tag}</span>
            <button className="rounded-full border border-dashed border-border text-xs font-medium px-3 py-1.5 inline-flex items-center gap-1"><Plus className="size-3" /> Add Tag</button>
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Favourite Items" action={<button className="text-xs text-success font-semibold">View All</button>}>
          <div className="grid grid-cols-5 gap-2 text-center">
            {dishes.map((d) => (
              <div key={d.name}><div className="aspect-square rounded-lg overflow-hidden bg-muted mb-1.5"><img src={d.img} alt={d.name} loading="lazy" width={512} height={512} className="w-full h-full object-cover" /></div><div className="text-xs">{d.name}</div></div>
            ))}
          </div>
        </Panel>
        <Panel title="Last Visit Summary">
          {last ? (
            <ul className="space-y-3 text-sm">
              {[
                { I: Calendar, t: `${last.date} – ${last.time}` },
                { I: User, t: last.name },
                { I: MapPin, t: `${last.table} (${last.area})` },
                { I: Users, t: `${last.people} guests` },
              ].map(({ I, t }, i) => (
                <li key={i} className="flex items-center gap-3"><I className="size-4 text-muted-foreground" /> {t}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          )}
        </Panel>
        <Panel title="Visit Frequency">
          <div className="h-44">
            <ResponsiveContainer>
              <AreaChart data={visits}>
                <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} /></linearGradient></defs>
                <Area type="monotone" dataKey="v" stroke="var(--color-success)" strokeWidth={2.5} fill="url(#vg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Visit & Engagement">
          <dl className="space-y-3 text-sm">
            {[
              ["Total Visits", `${c.visits} times`],
              ["Bookings", String(bookings.length)],
              ["Loyalty Points", String(c.points)],
              ["Total Spent", c.spent],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </Panel>
        <Panel title="Preferences">
          <ul className="space-y-3 text-sm">
            {([
              { I: Armchair, k: "Preferred Seating", v: "—" },
              { I: Compass, k: "Preferred Area", v: "—" },
              { I: Clock, k: "Time Preference", v: "—" },
              { I: Leaf, k: "Dietary Restrictions", v: "—" },
              { I: Sparkles, k: "Other Preferences", v: "—" },
            ]).map(({ I, k, v }) => (
              <li key={k} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted-foreground"><I className="size-4" /> {k}</span>
                <span className="font-medium text-right">{v}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function OrderHistory() {
  const [selected, setSelected] = useState<(typeof orderHistory)[number] | null>(null);
  return (
    <div>
      <h2 className="text-xl font-bold">Order History</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-5">View all past orders placed by this customer. Click any row for full details.</p>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
            {["Order ID", "Date", "Order Type", "Location", "Table", "Server", "Items", "Total", "Status"].map((h) => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}
            <th />
          </tr></thead>
          <tbody>
            {orderHistory.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No orders yet.</td></tr>
            ) : orderHistory.slice(0, 5).map((o) => (
              <tr key={o.id} onClick={() => setSelected(o)} className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer">
                <td className="px-4 py-4 font-medium text-success">{o.id}</td>
                <td className="px-4 py-4"><div>{o.date}</div><div className="text-xs text-muted-foreground">{o.time}</div></td>
                <td className="px-4 py-4">{o.type}</td>
                <td className="px-4 py-4">{o.location}</td>
                <td className="px-4 py-4">{o.table}</td>
                <td className="px-4 py-4">{o.server}</td>
                <td className="px-4 py-4 max-w-[200px]"><div className="truncate">{o.items}</div>{o.more > 0 && <div className="text-xs text-success font-medium">+{o.more} more</div>}</td>
                <td className="px-4 py-4 font-semibold">{o.total}</td>
                <td className="px-4 py-4"><span className="rounded-full bg-success/15 text-success text-xs font-semibold px-2.5 py-1">Completed</span></td>
                <td className="px-2 text-muted-foreground">⋯</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <OrderDetailDialog order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function OrderDetailDialog({ order, onClose }: { order: (typeof orderHistory)[number] | null; onClose: () => void }) {
  if (!order) return null;
  const itemNames = order.items.split(",").map((s) => s.trim());
  const prices = [24.5, 18.0, 12.5, 22.0, 9.5, 14.0, 28.0];
  const items = itemNames.map((n, i) => ({ name: n, qty: 1, price: prices[i % prices.length] }));
  for (let i = 0; i < order.more; i++) items.push({ name: ["Side Fries", "Garlic Bread", "House Wine"][i % 3], qty: 1, price: prices[(i + 3) % prices.length] });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.08;
  const tip = subtotal * 0.18;
  const totalNum = Number(order.total.replace(/[^0-9.]/g, ""));
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2"><h3 className="text-lg font-bold">Order {order.id}</h3><span className="rounded-full bg-success/15 text-success text-xs font-semibold px-2.5 py-1">Completed</span></div>
            <div className="text-xs text-muted-foreground mt-1">{order.date} at {order.time} • {order.type}</div>
          </div>
          <button onClick={onClose} className="size-8 rounded-md border border-border hover:bg-muted/50 flex items-center justify-center text-lg">×</button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4 border-b border-border">
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><User className="size-3.5" /> Served by</div>
            <div className="font-semibold mt-1">{order.server}</div>
            <div className="text-xs text-muted-foreground">Server</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> Location</div>
            <div className="font-semibold mt-1">{order.table}</div>
            <div className="text-xs text-muted-foreground">{order.location}</div>
          </div>
        </div>

        <div className="p-5">
          <h4 className="font-semibold mb-3 inline-flex items-center gap-2"><Utensils className="size-4" /> Items ordered</h4>
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                <div><span className="font-medium">{it.qty}× {it.name}</span></div>
                <div className="font-semibold">${(it.price * it.qty).toFixed(2)}</div>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>${subtotal.toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Tax (8%)</dt><dd>${tax.toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Tip ({order.server})</dt><dd>${tip.toFixed(2)}</dd></div>
            <div className="flex justify-between pt-2 border-t border-border font-bold text-base"><dt>Total</dt><dd className="text-success">${totalNum.toFixed(2)}</dd></div>
          </dl>
        </div>

        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button className="rounded-lg border border-border bg-card px-3 py-2 text-sm inline-flex items-center gap-2"><Download className="size-4" /> Receipt</button>
          <button onClick={onClose} className="rounded-lg bg-success text-success-foreground px-4 py-2 text-sm font-semibold">Close</button>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">{title}</h3>{action}</div>
      {children}
    </div>
  );
}

function LoyaltyTab({ points }: { points: number }) {
  const history = [
    { d: "May 18, 2024", desc: "Order #ORD-1245", pts: "+118" },
    { d: "May 10, 2024", desc: "Order #ORD-1198", pts: "+72" },
    { d: "Apr 28, 2024", desc: "Order #ORD-1156", pts: "+95" },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="Loyalty Overview">
        <div className="text-center py-4">
          <Gift className="size-8 text-success mx-auto" />
          <div className="text-4xl font-bold mt-2">{points}</div>
          <div className="text-xs text-muted-foreground">Total Points Earned</div>
        </div>
      </Panel>
      <Panel title="Points History" action={<button className="text-xs text-success font-semibold">View All History</button>}>
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted-foreground border-b border-border">{["Date", "Description", "Points"].map((h) => <th key={h} className="text-left font-medium py-2">{h}</th>)}</tr></thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i} className="border-b border-border last:border-0"><td className="py-2.5">{h.d}</td><td className="py-2.5">{h.desc}</td><td className="py-2.5 text-success font-semibold">{h.pts}</td></tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function CommsTab({ c }: { c: CustomerRow }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="space-y-4">
        {[
          { I: Mail, label: "Email", v: c.email || "—", badge: c.email ? "On file" : "Missing" },
          { I: MessageSquare, label: "SMS", v: c.phone || "—", badge: c.phone ? "On file" : "Missing" },
          { I: Bell, label: "Push Notifications", v: "", badge: "—" },
          { I: Smartphone, label: "Marketing Consent", v: "", badge: "—" },
        ].map(({ I, label, v, badge }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3"><I className="size-4 text-muted-foreground" /><div className="font-medium text-sm">{label}</div></div>
            {v && <div className="text-sm text-muted-foreground mt-1 ml-7">{v}</div>}
            <div className="ml-7 mt-2"><span className="rounded-full bg-success/15 text-success text-xs font-semibold px-2.5 py-1">{badge}</span></div>
          </div>
        ))}
      </div>
      <div className="lg:col-span-2">
        <Panel title="Communication History">
          <p className="text-sm text-muted-foreground">No communications recorded yet.</p>
        </Panel>
      </div>
    </div>
  );
}

function NotesTab({ notes }: { notes: string }) {
  return (
    <div className="max-w-3xl space-y-4">
      <Panel title="Add Note">
        <textarea placeholder="Write a note about this customer..." className="w-full rounded-lg border border-border bg-background p-3 text-sm min-h-24" />
        <div className="flex justify-end mt-2"><button className="inline-flex items-center gap-2 rounded-lg bg-success text-success-foreground px-4 py-2 text-sm font-semibold"><FileText className="size-4" /> Add Note</button></div>
      </Panel>
      <Panel title="Notes History">
        {notes ? (
          <div className="text-sm py-2">{notes}</div>
        ) : (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        )}
      </Panel>
    </div>
  );
}

function PrefsTab() {
  const dining = [["Seating Preference", "—"], ["Dining Area", "—"], ["Time Preference", "—"], ["Dietary Restrictions", "—"], ["Other Preferences", "—"]];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="Dining Preferences">
        <dl className="space-y-3 text-sm">{dining.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-right">{v}</dd></div>
        ))}</dl>
      </Panel>
      <Panel title="Order Preferences">
        <p className="text-sm text-muted-foreground">No order preferences saved yet.</p>
      </Panel>
    </div>
  );
}
