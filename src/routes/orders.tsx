import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShoppingBag, Plus, Filter, Search, MoreHorizontal, DollarSign, Clock, CheckCircle2, XCircle, Download, ChevronDown, FileText, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { exportCsv, exportPdf } from "@/lib/export";
import { format } from "date-fns";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Orders — RestoStack" }] }),
  component: OrdersPage,
});

const orders = [
  { id: "#ORD-2451", customer: "Emma Johnson", items: 4, type: "Dine In", table: "Table 12", total: "$118.50", status: "Preparing", time: "2 min ago" },
  { id: "#ORD-2450", customer: "Michael Brown", items: 2, type: "Takeaway", table: "—", total: "$42.30", status: "Ready", time: "8 min ago" },
  { id: "#ORD-2449", customer: "Sophia Davis", items: 6, type: "Dine In", table: "Table 15", total: "$215.80", status: "Served", time: "14 min ago" },
  { id: "#ORD-2448", customer: "James Wilson", items: 3, type: "Delivery", table: "—", total: "$76.40", status: "Out for delivery", time: "22 min ago" },
  { id: "#ORD-2447", customer: "Olivia Martinez", items: 5, type: "Dine In", table: "Table 21", total: "$148.90", status: "Paid", time: "31 min ago" },
  { id: "#ORD-2446", customer: "Daniel Taylor", items: 2, type: "Takeaway", table: "—", total: "$38.20", status: "Paid", time: "45 min ago" },
  { id: "#ORD-2445", customer: "Isabella Anderson", items: 4, type: "Dine In", table: "Table 9", total: "$102.10", status: "Cancelled", time: "1 h ago" },
];

const statusStyles: Record<string, string> = {
  Preparing: "bg-warning/15 text-warning",
  Ready: "bg-info/15 text-info",
  Served: "bg-accent text-primary",
  "Out for delivery": "bg-chart-2/15 text-chart-2",
  Paid: "bg-success/15 text-success",
  Cancelled: "bg-destructive/15 text-destructive",
};

const tabs = ["All Orders", "Preparing", "Ready", "Served", "Paid", "Cancelled"];

function OrdersPage() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const filtered = (tab === 0 ? orders : orders.filter((o) => o.status === tabs[tab])).filter(
    (o) => !search || `${o.id} ${o.customer} ${o.type}`.toLowerCase().includes(search.toLowerCase())
  );

  const cols = ["Order ID", "Customer", "Type", "Table", "Items", "Total", "Status", "Time"];
  const toRows = () =>
    filtered.map((o) => ({
      "Order ID": o.id, Customer: o.customer, Type: o.type, Table: o.table,
      Items: o.items, Total: o.total, Status: o.status, Time: o.time,
    }));
  const filterLabel = `${tabs[tab]}${search ? ` • "${search}"` : ""}`;
  const handleCsv = () => exportCsv(`orders_${format(new Date(), "yyyy-MM-dd")}`, cols, toRows());
  const handlePdf = () =>
    exportPdf({
      title: "Orders",
      subtitle: "Track and manage all orders across channels",
      meta: { Filter: filterLabel, Count: `${filtered.length}`, Generated: new Date().toLocaleString() },
      columns: cols,
      rows: toRows(),
    });

  return (
    <AppShell>
      <PageHeader
        title="Orders"
        description="Track and manage all orders across channels."
        icon={ShoppingBag}
        iconBg="bg-success/10"
        iconColor="text-success"
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50"><Filter className="size-4" /> Filters</button>
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50">
                  <Download className="size-4" /> Export <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1">
                <button onClick={handleCsv} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted text-left">
                  <FileSpreadsheet className="size-4 text-success" /> Export as CSV
                </button>
                <button onClick={handlePdf} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted text-left">
                  <FileText className="size-4 text-destructive" /> Export as PDF
                </button>
              </PopoverContent>
            </Popover>
            <button className="inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-semibold text-success-foreground"><Plus className="size-4" /> New Order</button>
          </>
        }
      />
      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Active Orders", v: "24", i: Clock, c: "text-warning bg-warning/15" },
            { l: "Ready / Served", v: "18", i: CheckCircle2, c: "text-info bg-info/15" },
            { l: "Today's Revenue", v: "$7,685", i: DollarSign, c: "text-success bg-success/15" },
            { l: "Cancelled", v: "3", i: XCircle, c: "text-destructive bg-destructive/15" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full flex items-center justify-center ${s.c}`}><s.i className="size-5" /></div>
                <div className="text-sm text-muted-foreground">{s.l}</div>
              </div>
              <div className="mt-2 text-2xl font-bold">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5">
            <div className="flex items-center gap-4 overflow-x-auto">
              {tabs.map((t, i) => (
                <button key={t} onClick={() => setTab(i)} className={`py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === i ? "border-success text-success" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
              ))}
            </div>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..." className="rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm w-56" />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              {["Order ID", "Customer", "Type", "Table", "Items", "Total", "Status", "Time", ""].map((h) => (
                <th key={h} className="text-left font-medium px-5 py-3">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-4 font-semibold">{o.id}</td>
                  <td className="px-5 py-4">{o.customer}</td>
                  <td className="px-5 py-4 text-muted-foreground">{o.type}</td>
                  <td className="px-5 py-4">{o.table}</td>
                  <td className="px-5 py-4">{o.items}</td>
                  <td className="px-5 py-4 font-semibold">{o.total}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[o.status]}`}>{o.status}</span></td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">{o.time}</td>
                  <td className="px-2"><button className="size-7 rounded-md hover:bg-muted flex items-center justify-center"><MoreHorizontal className="size-4" /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-muted-foreground">No orders in this state.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
