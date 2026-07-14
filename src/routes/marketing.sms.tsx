import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { MessageSquare, Plus, Send } from "lucide-react";

export const Route = createFileRoute("/marketing/sms")({
  head: () => ({ meta: [{ title: "SMS Campaigns — RestoStack" }] }),
  component: SmsPage,
});

const campaigns = [
  { name: "Tonight Special", body: "Show this SMS for 15% off your bill 🍝", audience: "All Customers", sent: "Jun 10, 6:00 PM", delivered: "98.2%", rate: "12.4%", status: "Sent" },
  { name: "Reminder", body: "See you tomorrow at 7:30 PM. Tap to confirm.", audience: "Upcoming bookings", sent: "Jun 9, 4:00 PM", delivered: "99.1%", rate: "44.6%", status: "Sent" },
  { name: "We miss you", body: "It's been a while! Here's $10 off your next visit.", audience: "Relapsed 30+ days", sent: "Jun 5, 11:00 AM", delivered: "97.4%", rate: "9.8%", status: "Sent" },
  { name: "Mother's Day", body: "Book your Mother's Day brunch — limited tables.", audience: "VIP", sent: "Scheduled May 8", delivered: "—", rate: "—", status: "Scheduled" },
];

function SmsPage() {
  return (
    <AppShell>
      <PageHeader
        title="SMS Campaigns"
        description="Send timely SMS blasts and automations."
        crumbs={[{ label: "Marketing", to: "/marketing" }, { label: "Send SMS" }]}
        icon={MessageSquare}
        iconBg="bg-info/15"
        iconColor="text-info"
        actions={<button className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground"><Plus className="size-4" /> New SMS</button>}
      />
      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[["Sent (30d)", "12,486"], ["Delivery Rate", "98.1%"], ["Click Rate", "11.4%"], ["Opt-outs", "0.6%"]].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">{l}</div>
              <div className="text-2xl font-bold mt-1">{v}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border font-semibold">Campaigns</div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b border-border">
                {["Campaign", "Audience", "Sent", "Delivered", "CTR", "Status"].map((h) => <th key={h} className="text-left font-medium px-5 py-3">{h}</th>)}
              </tr></thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.name} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-4"><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground line-clamp-1">{c.body}</div></td>
                    <td className="px-5 py-4 text-muted-foreground">{c.audience}</td>
                    <td className="px-5 py-4 text-muted-foreground">{c.sent}</td>
                    <td className="px-5 py-4">{c.delivered}</td>
                    <td className="px-5 py-4 font-semibold">{c.rate}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.status === "Sent" ? "bg-success/15 text-success" : "bg-info/15 text-info"}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 h-fit">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Send className="size-4 text-success" /> Quick Send</h3>
            <label className="block text-xs font-medium text-muted-foreground">Audience</label>
            <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option>All Customers (12,842)</option><option>VIP (1,024)</option><option>Loyalty Members (6,142)</option>
            </select>
            <label className="block text-xs font-medium text-muted-foreground mt-3">Message</label>
            <textarea rows={4} defaultValue="Show this SMS tonight for 15% off your bill 🍝" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <div className="text-[10px] text-muted-foreground mt-1">52 / 160 chars · 1 segment · ~$0.02 per SMS</div>
            <button className="mt-3 w-full rounded-lg bg-success py-2 text-sm font-semibold text-success-foreground">Send to 12,842</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
