import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { Search, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useCustomers, useCreateCustomer } from "@/lib/v2-data";
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
  const [addOpen, setAddOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const { data: customers = [], isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const filtered = customers.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.email.toLowerCase().includes(q.toLowerCase())
  );

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setNotes("");
  };

  const handleCreate = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    try {
      await createCustomer.mutateAsync({
        full_name: fullName,
        email: email || undefined,
        phone: phone || undefined,
        notes: notes || undefined,
      });
      toast.success("Customer added");
      resetForm();
      setAddOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add customer");
    }
  };

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
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-success text-success-foreground px-4 py-2 text-sm font-semibold"
          >
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

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-success" /> Add Customer
            </DialogTitle>
            <DialogDescription>Add a new customer to your restaurant database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name" className="text-xs font-medium text-muted-foreground">Full name *</Label>
              <Input id="cust-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-email" className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input id="cust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-phone" className="text-xs font-medium text-muted-foreground">Phone</Label>
              <Input id="cust-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-notes" className="text-xs font-medium text-muted-foreground">Notes</Label>
              <textarea
                id="cust-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Preferences, allergies, occasions…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createCustomer.isPending || !fullName.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground hover:bg-success/90 disabled:opacity-50"
            >
              {createCustomer.isPending && <Loader2 className="size-4 animate-spin" />}
              Add Customer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
