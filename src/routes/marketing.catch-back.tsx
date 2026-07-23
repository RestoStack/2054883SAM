import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Copy, Loader2, UserX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/marketing/catch-back")({
  head: () => ({ meta: [{ title: "Win Back Customers — RestoStack" }] }),
  component: CatchBackPage,
});

type LapsedCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastVisit: string | null;
  visitCount: number;
};

function useLapsedCustomers() {
  return useQuery({
    queryKey: ["v2_lapsed_customers"],
    queryFn: async (): Promise<LapsedCustomer[]> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffIso = cutoff.toISOString();

      const { data, error } = await supabase
        .from("v2_customers")
        .select("id, full_name, email, phone, last_visit, visit_count")
        .or(`last_visit.is.null,last_visit.lt.${cutoffIso}`)
        .order("last_visit", { ascending: true, nullsFirst: true });

      if (error) throw error;

      return (data ?? []).map((c) => ({
        id: c.id,
        name: c.full_name ?? "Guest",
        email: c.email ?? "",
        phone: c.phone ?? "",
        lastVisit: c.last_visit,
        visitCount: c.visit_count ?? 0,
      }));
    },
  });
}

const fmtLastVisit = (iso: string | null) => {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function CatchBackPage() {
  const { data: lapsed = [], isLoading } = useLapsedCustomers();

  const copyEmails = async () => {
    const emails = lapsed.map((c) => c.email.trim()).filter(Boolean);
    if (!emails.length) {
      toast.error("No email addresses to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      toast.success(`Copied ${emails.length} email${emails.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Win Back Customers"
        description="Guests who haven't visited in the last 30 days"
        icon={UserX}
        iconBg="bg-warning/15"
        iconColor="text-warning"
        crumbs={[{ label: "Marketing", to: "/marketing" }, { label: "Win Back" }]}
        actions={
          lapsed.length > 0 ? (
            <button
              onClick={copyEmails}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/50"
            >
              <Copy className="size-4" /> Copy emails
            </button>
          ) : undefined
        }
      />

      <div className="p-4 lg:p-5">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="px-5 py-12 text-center text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin inline mr-2" /> Loading customers…
            </div>
          ) : lapsed.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <UserX className="size-8 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium">No lapsed customers</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Everyone has visited within the last 30 days, or you don't have customer visit data yet.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-border px-5 py-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{lapsed.length} guest{lapsed.length === 1 ? "" : "s"} to win back</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">No visit in 30+ days or never visited</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                      {["Name", "Email", "Phone", "Last visit", "Visits"].map((h) => (
                        <th key={h} className="text-left font-medium px-5 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lapsed.map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="px-5 py-4 font-medium">{c.name}</td>
                        <td className="px-5 py-4 text-muted-foreground">{c.email || "—"}</td>
                        <td className="px-5 py-4 text-muted-foreground">{c.phone || "—"}</td>
                        <td className="px-5 py-4">
                          <span className={!c.lastVisit ? "text-warning font-medium" : "text-muted-foreground"}>
                            {fmtLastVisit(c.lastVisit)}
                          </span>
                        </td>
                        <td className="px-5 py-4">{c.visitCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
