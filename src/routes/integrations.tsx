import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Network, Check } from "lucide-react";

export const Route = createFileRoute("/integrations")({
  head: () => ({ meta: [{ title: "Integrations — RestoStack" }] }),
  component: IntegrationsPage,
});

const apps = [
  { name: "OpenTable", desc: "Sync reservations and guest profiles.", cat: "Bookings", emoji: "📅", connected: true },
  { name: "Google Reserve", desc: "Accept bookings directly from Google Search.", cat: "Bookings", emoji: "🔎", connected: true },
  { name: "Uber Eats", desc: "Receive orders into the kitchen display.", cat: "Delivery", emoji: "🛵", connected: true },
  { name: "DoorDash", desc: "Manage delivery menus and dispatch.", cat: "Delivery", emoji: "🚗", connected: false },
  { name: "Square POS", desc: "Sync sales, tickets and tabs.", cat: "Payments", emoji: "💳", connected: true },
  { name: "Stripe", desc: "Process online deposits and gift cards.", cat: "Payments", emoji: "💰", connected: false },
  { name: "Mailchimp", desc: "Sync segments for email blasts.", cat: "Marketing", emoji: "📧", connected: false },
  { name: "Instagram", desc: "Schedule posts and reply to DMs.", cat: "Marketing", emoji: "📷", connected: true },
  { name: "QuickBooks", desc: "Export daily sales to accounting.", cat: "Accounting", emoji: "📊", connected: false },
];

function IntegrationsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Integrations"
        description="Connect the tools you already use."
        icon={Network}
        iconBg="bg-info/15"
        iconColor="text-info"
      />
      <div className="p-4 lg:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {apps.map((a) => (
          <div key={a.name} className="rounded-xl border border-border bg-card p-5 flex gap-4">
            <div className="size-12 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-2xl">{a.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold">{a.name}</div>
                {a.connected && <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success text-[10px] font-semibold px-2 py-0.5"><Check className="size-3" /> Connected</span>}
              </div>
              <div className="text-xs text-muted-foreground">{a.cat}</div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{a.desc}</p>
              <button className={`mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold ${a.connected ? "border border-border text-muted-foreground" : "bg-success text-success-foreground"}`}>
                {a.connected ? "Manage" : "Connect"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
