import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { Calendar, Mail, MessageSquare, UserPlus, Tag, Award, Share2, ArrowRight } from "lucide-react";
import { useCustomers, useDashboardStats } from "@/lib/v2-data";

export const Route = createFileRoute("/marketing")({
  head: () => ({ meta: [{ title: "Marketing — RestoStack" }] }),
  component: MarketingLayout,
});

function MarketingLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/marketing") return <Outlet />;
  return <MarketingOverview />;
}

const actions = [
  { to: "/marketing/email", icon: Mail, label: "Email Campaign", sub: "Send an email to your customers" },
  { to: "/marketing/sms", icon: MessageSquare, label: "SMS Campaign", sub: "Send a text promotion" },
  { to: "/marketing/catch-back", icon: UserPlus, label: "Win Back Customers", sub: "Re-engage guests who haven't returned" },
  { to: "/marketing/promotions", icon: Tag, label: "Promotions", sub: "Create a special offer" },
  { to: "/marketing/reviews", icon: Award, label: "Reviews", sub: "Respond to recent reviews" },
  { to: "/marketing/referral", icon: Share2, label: "Referrals", sub: "Reward word-of-mouth" },
];

function MarketingOverview() {
  const { data: customers = [] } = useCustomers();
  const { data: dash } = useDashboardStats();
  const returning = customers.filter((c) => c.visits >= 2).length;
  const newGuests = customers.filter((c) => c.visits < 2).length;

  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
          <p className="text-sm text-muted-foreground mt-1">Grow your own guest list — metrics reflect this restaurant only.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <Calendar className="size-4" /> All time
        </button>
      </div>

      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { l: "Customers on file", v: String(customers.length), hint: "from bookings & POS" },
            { l: "New guests", v: String(newGuests), hint: "under 2 visits" },
            { l: "Returning guests", v: String(returning), hint: `${dash?.customerCount ?? customers.length} total profiles` },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">{s.l}</div>
              <div className="mt-1 text-2xl font-bold">{s.v}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.hint}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">What would you like to do?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actions.map((a) => (
              <Link key={a.label} to={a.to} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                <div className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <a.icon className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{a.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.sub}</div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          No campaigns sent yet. Campaign history will appear here once you launch email, SMS, or promotions for this restaurant.
        </div>
      </div>
    </AppShell>
  );
}
