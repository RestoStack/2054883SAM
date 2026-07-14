import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { FileText, Plus, ExternalLink, Pencil } from "lucide-react";

export const Route = createFileRoute("/marketing/landing")({
  head: () => ({ meta: [{ title: "Landing Pages — RestoStack" }] }),
  component: LandingPage,
});

const pages = [
  { name: "Mother's Day Brunch", slug: "/mothers-day", visits: 4280, bookings: 218, conv: "5.1%", status: "Live" },
  { name: "Summer Tasting Menu", slug: "/summer-menu", visits: 3142, bookings: 142, conv: "4.5%", status: "Live" },
  { name: "Wine Pairing Dinner", slug: "/wine-night", visits: 1860, bookings: 96, conv: "5.2%", status: "Live" },
  { name: "New Year's Eve", slug: "/nye-2025", visits: 0, bookings: 0, conv: "—", status: "Draft" },
];

function LandingPage() {
  return (
    <AppShell>
      <PageHeader
        title="Landing Pages"
        description="Custom pages for campaigns and seasonal pushes."
        crumbs={[{ label: "Marketing", to: "/marketing" }, { label: "Landing Pages" }]}
        icon={FileText}
        actions={<button className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground"><Plus className="size-4" /> New Landing Page</button>}
      />
      <div className="p-4 lg:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {pages.map((p) => (
          <div key={p.slug} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="aspect-[16/8] bg-gradient-to-br from-accent via-secondary to-warning/30 flex items-center justify-center">
              <div className="text-3xl font-serif font-bold text-primary/70">{p.name}</div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <a className="text-xs text-muted-foreground inline-flex items-center gap-1" href="#">italianbistro.com{p.slug} <ExternalLink className="size-3" /></a>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.status === "Live" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div><div className="text-base font-bold">{p.visits.toLocaleString()}</div><div className="text-[10px] text-muted-foreground">Visits</div></div>
                <div><div className="text-base font-bold">{p.bookings}</div><div className="text-[10px] text-muted-foreground">Bookings</div></div>
                <div><div className="text-base font-bold text-success">{p.conv}</div><div className="text-[10px] text-muted-foreground">Conversion</div></div>
              </div>
              <button className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"><Pencil className="size-3.5" /> Edit Page</button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
