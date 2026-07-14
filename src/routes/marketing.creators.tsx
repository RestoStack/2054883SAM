import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Star, Instagram, Plus } from "lucide-react";

export const Route = createFileRoute("/marketing/creators")({
  head: () => ({ meta: [{ title: "Book a Creator — RestoStack" }] }),
  component: CreatorsPage,
});

const creators = [
  { handle: "@foodie.bae", name: "Sophia Lee", followers: "248K", engagement: "5.2%", rate: "$450 / post", cat: "Food / Lifestyle" },
  { handle: "@nycbites", name: "Marco Rossi", followers: "182K", engagement: "6.1%", rate: "$350 / post", cat: "NYC Restaurants" },
  { handle: "@thefoodfeed", name: "Emma Park", followers: "412K", engagement: "4.4%", rate: "$680 / post", cat: "Food" },
  { handle: "@pastalovers", name: "Luca Bianchi", followers: "96K", engagement: "7.8%", rate: "$210 / post", cat: "Italian" },
  { handle: "@dinewithjas", name: "Jasmine Wu", followers: "138K", engagement: "5.6%", rate: "$280 / post", cat: "Fine Dining" },
  { handle: "@brunchclub", name: "Olivia Bennett", followers: "201K", engagement: "5.0%", rate: "$420 / post", cat: "Brunch / Cafe" },
];

function CreatorsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Book a Creator"
        description="Invite influencers to drive visits and content."
        crumbs={[{ label: "Marketing", to: "/marketing" }, { label: "Book a Creator" }]}
        icon={Star}
        iconBg="bg-warning/15"
        iconColor="text-warning"
        actions={<button className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground"><Plus className="size-4" /> Invite Creator</button>}
      />
      <div className="p-4 lg:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {creators.map((c) => (
          <div key={c.handle} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-full bg-gradient-to-br from-warning/30 to-primary/20" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Instagram className="size-3" /> {c.handle}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div><div className="text-sm font-bold">{c.followers}</div><div className="text-[10px] text-muted-foreground">Followers</div></div>
              <div><div className="text-sm font-bold">{c.engagement}</div><div className="text-[10px] text-muted-foreground">Engagement</div></div>
              <div><div className="text-sm font-bold text-success">{c.rate.split(" ")[0]}</div><div className="text-[10px] text-muted-foreground">Per post</div></div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-lg bg-success py-2 text-xs font-semibold text-success-foreground">Send Invite</button>
              <button className="rounded-lg border border-border px-3 py-2 text-xs font-medium">View Profile</button>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 text-center">{c.cat}</div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
