import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Star, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/marketing/reviews")({
  head: () => ({ meta: [{ title: "Review Management — RestoStack" }] }),
  component: ReviewsPage,
});

const reviews = [
  { name: "Emma Johnson", source: "Google", rating: 5, body: "Truffle pasta was unreal. Service was warm and attentive. Will definitely be back.", time: "2 h ago", replied: false },
  { name: "Michael Brown", source: "Yelp", rating: 4, body: "Solid pizza, great vibe. Slightly slow on a Saturday but the food made up for it.", time: "1 d ago", replied: true },
  { name: "Sophia Davis", source: "Google", rating: 5, body: "Best birthday dinner we've had in NYC. The team made my partner feel special.", time: "2 d ago", replied: true },
  { name: "Daniel Taylor", source: "Tripadvisor", rating: 3, body: "Food was fine, but our table wasn't ready at the reserved time. Hostess handled it well.", time: "4 d ago", replied: false },
  { name: "Olivia Martinez", source: "Google", rating: 5, body: "Ribeye cooked perfectly. The sommelier paired a beautiful Brunello.", time: "1 w ago", replied: true },
];

function ReviewsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Review Management"
        description="Monitor and reply to reviews across platforms."
        crumbs={[{ label: "Marketing", to: "/marketing" }, { label: "Review Management" }]}
        icon={Star}
        iconBg="bg-warning/15"
        iconColor="text-warning"
      />
      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[["Avg Rating", "4.7 ★"], ["Total Reviews", "1,284"], ["New (7d)", "42"], ["Response Rate", "92%"]].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">{l}</div>
              <div className="text-2xl font-bold mt-1">{v}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {reviews.map((r, i) => (
            <div key={i} className="p-5 flex gap-4">
              <div className="size-10 rounded-full bg-gradient-to-br from-accent to-primary/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-xs text-muted-foreground">· {r.source} · {r.time}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-warning">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`size-3.5 ${j < r.rating ? "fill-current" : "opacity-30"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{r.body}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${r.replied ? "border border-border text-muted-foreground" : "bg-success text-success-foreground"}`}>
                    <MessageCircle className="size-3.5" />
                    {r.replied ? "View reply" : "Reply"}
                  </button>
                  {r.replied && <span className="text-[11px] text-success">✓ Replied</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
