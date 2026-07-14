import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Network } from "lucide-react";

export const Route = createFileRoute("/integrations")({
  head: () => ({ meta: [{ title: "Integrations — RestoStack" }] }),
  component: IntegrationsPage,
});

const apps = [
  { name: "OpenTable", desc: "Sync reservations and guest profiles.", cat: "Bookings" },
  { name: "Google Reserve", desc: "Accept bookings directly from Google Search.", cat: "Bookings" },
  { name: "Uber Eats", desc: "Receive orders into the kitchen display.", cat: "Delivery" },
  { name: "DoorDash", desc: "Manage delivery menus and dispatch.", cat: "Delivery" },
  { name: "Square POS", desc: "Sync sales, tickets and tabs.", cat: "Payments" },
  { name: "Stripe", desc: "Process online deposits and gift cards.", cat: "Payments" },
  { name: "Mailchimp", desc: "Sync segments for email blasts.", cat: "Marketing" },
  { name: "Instagram", desc: "Schedule posts and reply to DMs.", cat: "Marketing" },
  { name: "QuickBooks", desc: "Export daily sales to accounting.", cat: "Accounting" },
];

function IntegrationsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Integrations"
        description="Nothing is connected by default for a new restaurant."
        icon={Network}
        iconBg="bg-info/15"
        iconColor="text-info"
      />
      <div className="p-4 lg:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {apps.map((a) => (
          <div key={a.name} className="rounded-xl border border-border bg-card p-5 flex gap-4">
            <div className="size-12 rounded-xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
              {a.name.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{a.name}</div>
              <div className="text-xs text-muted-foreground">{a.cat} · Not connected</div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{a.desc}</p>
              <button className="mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold bg-success text-success-foreground">
                Connect
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
