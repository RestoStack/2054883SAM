import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { Calendar, Mail, MessageSquare, UserPlus, Star, Tag, Award, Share2, ArrowRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { sparkData } from "@/lib/mock-data";

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
  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
          <p className="text-sm text-muted-foreground mt-1">Bring guests back and grow your restaurant.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"><Calendar className="size-4" /> Last 30 days</button>
      </div>

      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { l: "New Customers", v: "842", d: "+18.6%", color: "var(--color-success)" },
            { l: "Returning Customers", v: "1,254", d: "+9.2%", color: "var(--color-chart-2)" },
            { l: "Revenue from Marketing", v: "$24,180", d: "+15.2%", color: "var(--color-chart-4)" },
          ].map((s, i) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">{s.l}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-2xl font-bold">{s.v}</div>
                <div className="text-xs font-semibold text-success">{s.d}</div>
              </div>
              <div className="h-10 mt-2 -mx-1">
                <ResponsiveContainer>
                  <AreaChart data={sparkData(i + 3)}>
                    <defs>
                      <linearGradient id={`mg${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="y" stroke={s.color} strokeWidth={1.5} fill={`url(#mg${i})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">What would you like to do?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actions.map((a) => (
              <Link key={a.label} to={a.to} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                <div className="size-10 rounded-lg bg-accent flex items-center justify-center shrink-0"><a.icon className="size-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{a.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.sub}</div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Campaigns</h3>
            <Link to="/marketing/email" className="text-xs text-success font-medium hover:underline">View all</Link>
          </div>
          <ul className="divide-y divide-border">
            {[
              { n: "Weekend Special", sub: "20% off pastas · sent to 2,483", date: "Jun 10", perf: "42% opened" },
              { n: "We Miss You!", sub: "15% off · sent to 1,257 lapsed guests", date: "Jun 8", perf: "98% opened" },
              { n: "New Summer Menu", sub: "Sent to 3,145 customers", date: "Jun 3", perf: "36% opened" },
              { n: "Birthday Offer", sub: "Sent to 186 birthday guests", date: "May 25", perf: "50% opened" },
            ].map((c) => (
              <li key={c.n} className="py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{c.n}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.sub}</div>
                </div>
                <div className="text-xs text-muted-foreground">{c.date}</div>
                <div className="text-xs font-semibold text-success w-24 text-right">{c.perf}</div>
              </li>
            ))}
          </ul>
          <Link to="/marketing/email" className="mt-4 block w-full text-center rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/30">+ Create new campaign</Link>
        </div>
      </div>
    </AppShell>
  );
}
