import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShoppingBag, Plus, Filter, Search, MoreHorizontal, DollarSign, Clock, CheckCircle2, XCircle, Download, ChevronDown, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { exportCsv, exportPdf } from "@/lib/export";
import { format } from "date-fns";
import { useOrders } from "@/lib/v2-data";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Orders — RestoStack" }] }),
  component: OrdersPage,
});

const statusStyles: Record<string, string> = {
  Open: "bg-muted text-muted-foreground",
  Preparing: "bg-warning/15 text-warning",
  Ready: "bg-info/15 text-info",
  Served: "bg-accent text-primary",
  Paid: "bg-success/15 text-success",
  Cancelled: "bg-destructive/15 text-destructive",
};

const tabs = ["All Orders", "Preparing", "Ready", "Served", "Paid", "Cancelled"];

function OrdersPage() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const { data: orders = [], isLoading } = useOrders();

  const filtered = useMemo(() => {
    const byTab = tab === 0 ? orders : orders.filter((o) => o.status === tabs[tab]);
    if (!search) return byTab;
    const q = search.toLowerCase();
    return byTab.filter((o) => `${o.shortId} ${o.customer} ${o.type}`.toLowerCase().includes(q));
  }, [orders, tab, search]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todays = orders.filter((o) => o.createdAt.startsWith(todayIso));
  const active = todays.filter((o) => ["Open", "Preparing", "Ready"].includes(o.status)).length;
  const readyServed = todays.filter((o) => ["Ready", "Served"].includes(o.status)).length;
  const revenue = todays.reduce((s, o) => s + o.totalRaw, 0);
  const cancelled = todays.filter((o) => o.status === "Cancelled").length;

  const cols = ["Order ID", "Customer", "Type", "Table", "Items", "Total", "Status", "Time"];
  const toRows = () =>
    filtered.map((o) => ({
      "Order ID": o.shortId,
      Customer: o.customer,
      Type: o.type,
      Table: o.table,
      Items: o.items,
      Total: o.total,
      Status: o.status,
      Time: o.time,
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
        description="Orders for your restaurant only."
        icon={ShoppingBag}
        iconBg="bg-success/10"
        iconColor="text-success"
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50">
              <Filter className="size-4" /> Filters
            </button>
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
            <button className="inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-semibold text-success-foreground">
              <Plus className="size-4" /> New Order
            </button>
          </>
        }
      />
      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Active Orders", v: String(active), i: Clock, c: "text-warning bg-warning/15" },
            { l: "Ready / Served", v: String(readyServed), i: CheckCircle2, c: "text-info bg-info/15" },
            { l: "Today's Revenue", v: `$${revenue.toFixed(0)}`, i: DollarSign, c: "text-success bg-success/15" },
            { l: "Cancelled", v: String(cancelled), i: XCircle, c: "text-destructive bg-destructive/15" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full flex items-center justify-center ${s.c}`}>
                  <s.i className="size-5" />
                </div>
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
                <button
                  key={t}
                  onClick={() => setTab(i)}
                  className={`py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === i ? "border-success text-success" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orders..."
                className="rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm w-56"
              />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                {["Order ID", "Customer", "Type", "Table", "Items", "Total", "Status", "Time", ""].map((h) => (
                  <th key={h} className="text-left font-medium px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin inline mr-2" /> Loading orders…
                  </td>
                </tr>
              )}
              {!isLoading &&
                filtered.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-4 font-semibold">{o.shortId}</td>
                    <td className="px-5 py-4">{o.customer}</td>
                    <td className="px-5 py-4 text-muted-foreground">{o.type}</td>
                    <td className="px-5 py-4">{o.table}</td>
                    <td className="px-5 py-4">{o.items || "—"}</td>
                    <td className="px-5 py-4 font-semibold">{o.total}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[o.status] ?? "bg-muted text-muted-foreground"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{o.time}</td>
                    <td className="px-2">
                      <button className="size-7 rounded-md hover:bg-muted flex items-center justify-center">
                        <MoreHorizontal className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No orders yet for this restaurant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
