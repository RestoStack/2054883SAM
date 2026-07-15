import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { Search, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useCustomers } from "@/lib/v2-data";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — RestoStack" }] }),
  component: CustomersList,
});

const tagColor: Record<string, string> = {
  VIP: "bg-success/15 text-success",
  Frequent: "bg-info/15 text-info",
  New: "bg-accent text-accent-foreground",
};

function CustomersList() {
  const [q, setQ] = useState("");
  const { data: customers = [], isLoading } = useCustomers();
  const filtered = customers.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.email.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your customer database.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customers..."
              className="rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm w-64"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-success text-success-foreground px-4 py-2 text-sm font-semibold">
            <Plus className="size-4" /> Add Customer
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                {["Name", "Email", "Phone", "Visits", "Total Spent", "Type"].map((h) => (
                  <th key={h} className="text-left font-medium px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    <Loader2 className="size-4 animate-spin inline mr-2" /> Loading…
                  </td>
                </tr>
              )}
              {!isLoading &&
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer">
                    <td className="px-5 py-4">
                      <Link
                        to="/customers/$id"
                        params={{ id: c.id }}
                        className="flex items-center gap-3 font-medium hover:underline"
                      >
                        <div className="size-9 rounded-full bg-gradient-to-br from-accent to-primary/30" />
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{c.email}</td>
                    <td className="px-5 py-4 text-muted-foreground">{c.phone}</td>
                    <td className="px-5 py-4">{c.visits}</td>
                    <td className="px-5 py-4 font-semibold">{c.spent}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full text-xs font-semibold px-2.5 py-1 ${
                          tagColor[c.tag] ?? "bg-accent text-accent-foreground"
                        }`}
                      >
                        {c.tag}
                      </span>
                    </td>
                  </tr>
                ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    {customers.length === 0 ? "No customers yet." : `No customers match "${q}".`}
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
