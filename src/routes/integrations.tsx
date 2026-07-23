import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Network, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/integrations")({
  head: () => ({ meta: [{ title: "Integrations — RestoStack" }] }),
  component: IntegrationsPage,
});

/** Same names as onboarding step — stored in v2_restaurants.integrations */
const INTEGRATIONS = [
  { name: "Toast", desc: "Sync POS tickets and menu items.", cat: "POS" },
  { name: "Square", desc: "Sync sales, tickets and tabs.", cat: "Payments" },
  { name: "OpenTable", desc: "Sync reservations and guest profiles.", cat: "Bookings" },
  { name: "Resy", desc: "Import Resy reservations into your book.", cat: "Bookings" },
  { name: "DoorDash", desc: "Manage delivery menus and dispatch.", cat: "Delivery" },
  { name: "Uber Eats", desc: "Receive orders into the kitchen display.", cat: "Delivery" },
  { name: "Google Reserve", desc: "Accept bookings directly from Google Search.", cat: "Bookings" },
  { name: "Mailchimp", desc: "Sync segments for email blasts.", cat: "Marketing" },
  { name: "Stripe", desc: "Process online deposits and gift cards.", cat: "Payments" },
  { name: "QuickBooks", desc: "Export daily sales to accounting.", cat: "Accounting" },
];

function IntegrationsPage() {
  const { staff } = useAuth();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [connected, setConnected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!staff) return;
    setRestaurantId(staff.restaurant_id);
    supabase
      .from("v2_restaurants")
      .select("integrations")
      .eq("id", staff.restaurant_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && Array.isArray(data.integrations)) {
          setConnected(data.integrations as string[]);
        }
        setLoading(false);
      });
  }, [staff]);

  const toggle = async (name: string) => {
    if (!restaurantId) return;
    setBusy(name);
    const next = connected.includes(name)
      ? connected.filter((n) => n !== name)
      : [...connected, name];
    const { error } = await supabase
      .from("v2_restaurants")
      .update({ integrations: next })
      .eq("id", restaurantId);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setConnected(next);
    toast.success(connected.includes(name) ? `${name} disconnected` : `${name} connected`);
  };

  return (
    <AppShell>
      <PageHeader
        title="Integrations"
        description="Connect tools your restaurant already uses — saved per location."
        icon={Network}
        iconBg="bg-info/15"
        iconColor="text-info"
      />
      <div className="p-4 lg:p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading integrations…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {INTEGRATIONS.map((a) => {
              const isConnected = connected.includes(a.name);
              return (
                <div key={a.name} className="rounded-xl border border-border bg-card p-5 flex gap-4">
                  <div className="size-12 rounded-xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {a.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold">{a.name}</div>
                      {isConnected && (
                        <span className="rounded-full bg-success/15 text-success text-[10px] font-semibold px-2 py-0.5">
                          Connected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.cat} · {isConnected ? "Active" : "Not connected"}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{a.desc}</p>
                    <button
                      disabled={busy === a.name}
                      onClick={() => void toggle(a.name)}
                      className={`mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                        isConnected
                          ? "border border-border bg-background hover:bg-muted/60"
                          : "bg-success text-success-foreground"
                      }`}
                    >
                      {busy === a.name ? "Saving…" : isConnected ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
