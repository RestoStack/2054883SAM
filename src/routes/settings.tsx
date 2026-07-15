import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Settings as SettingsIcon, Building2, CreditCard, Bell, Users, Lock, Globe, Copy, ExternalLink, Link as LinkIcon, LayoutGrid, Clock, Palette, UtensilsCrossed, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ProfileEditor, type ProfileRestaurant } from "@/components/onboarding/ProfileEditor";
import { HoursEditor, type WeekHours } from "@/components/onboarding/HoursEditor";
import { BrandEditor } from "@/components/onboarding/BrandEditor";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — RestoStack" }] }),
  component: SettingsPage,
});

const sections = [
  { id: "restaurant", label: "Restaurant", icon: Building2 },
  { id: "hours", label: "Hours", icon: Clock },
  { id: "brand", label: "Brand & booking page", icon: Palette },
  { id: "menu", label: "Menu & Floor plan", icon: UtensilsCrossed },
  { id: "billing", label: "Billing & Plan", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team Access", icon: Users },
  { id: "security", label: "Security", icon: Lock },
  { id: "locale", label: "Locale & Currency", icon: Globe },
];

function SettingsPage() {
  const [active, setActive] = useState("restaurant");

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Configure your restaurant, billing, team and preferences."
        icon={SettingsIcon}
      />
      <div className="p-4 lg:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          <aside className="rounded-xl border border-border bg-card p-2 h-fit">
            <ul className="space-y-0.5">
              {sections.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setActive(s.id)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active === s.id ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted/60"}`}
                    >
                      <Icon className="size-4" />
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="rounded-xl border border-border bg-card p-6">
            {active === "restaurant" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Restaurant profile</h2>
                  <p className="text-sm text-muted-foreground">Public-facing info shown to guests.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <BookingLinkCard />
                  <FloorplanLinkCard />
                </div>
                <ProfileSection />
              </div>
            )}
            {active === "hours" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Hours</h2>
                  <p className="text-sm text-muted-foreground">Guests see these on your booking page.</p>
                </div>
                <HoursSection />
              </div>
            )}
            {active === "brand" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Brand & booking page</h2>
                  <p className="text-sm text-muted-foreground">Colors and copy for your public booking page.</p>
                </div>
                <BrandSection />
              </div>
            )}
            {active === "menu" && (
              <div className="space-y-3 max-w-2xl">
                <h2 className="text-lg font-semibold">Menu & floor plan</h2>
                <p className="text-sm text-muted-foreground">Manage them on their dedicated pages.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <Link to="/menu" className="rounded-xl border border-border p-4 hover:bg-muted/40 transition">
                    <UtensilsCrossed className="size-5 text-success" />
                    <div className="mt-2 font-semibold">Menu</div>
                    <div className="text-xs text-muted-foreground">Categories, items, prices, availability.</div>
                  </Link>
                  <Link to="/floorplan" className="rounded-xl border border-border p-4 hover:bg-muted/40 transition">
                    <LayoutGrid className="size-5 text-success" />
                    <div className="mt-2 font-semibold">Floor plan</div>
                    <div className="text-xs text-muted-foreground">Arrange tables the way your dining room is laid out.</div>
                  </Link>
                </div>
              </div>
            )}
            {active === "billing" && (
              <div className="space-y-5 max-w-2xl">
                <h2 className="text-lg font-semibold">Billing & Plan</h2>
                <div className="rounded-xl border border-border p-5 bg-gradient-to-br from-accent/40 to-transparent">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Current Plan</div>
                      <div className="text-2xl font-bold">Pro</div>
                    </div>
                    <button className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground">Upgrade</button>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">$249/month • Renews Jun 28, 2024</div>
                </div>
                <Field label="Card on file" defaultValue="•••• •••• •••• 4242" />
                <Field label="Billing email" defaultValue="billing@italianbistro.com" />
              </div>
            )}
            {active === "notifications" && (
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-lg font-semibold">Notifications</h2>
                {[
                  "Email me when a new booking is made",
                  "Daily revenue summary at 11 PM",
                  "Alert when no-show rate exceeds 5%",
                  "Weekly marketing performance report",
                ].map((l, i) => <Toggle key={l} label={l} defaultOn={i !== 2} />)}
              </div>
            )}
            {active === "team" && (
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-lg font-semibold">Team Access</h2>
                {["Alex Morgan — Owner", "Michael Brown — Manager", "Sarah Thompson — Server"].map((m) => (
                  <div key={m} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-gradient-to-br from-accent to-primary/30" />
                      <span className="text-sm font-medium">{m}</span>
                    </div>
                    <button className="text-xs text-muted-foreground hover:text-foreground">Manage</button>
                  </div>
                ))}
                <button className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground">Invite teammate</button>
              </div>
            )}
            {active === "security" && (
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-lg font-semibold">Security</h2>
                <Field label="Password" defaultValue="••••••••••••" type="password" />
                <Toggle label="Two-factor authentication" defaultOn />
                <Toggle label="Require admin approval for refunds" defaultOn />
              </div>
            )}
            {active === "locale" && (
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-lg font-semibold">Locale & Currency</h2>
                <Field label="Currency" defaultValue="USD ($)" />
                <Field label="Timezone" defaultValue="America/New_York (UTC-5)" />
                <Field label="Date format" defaultValue="MMM D, YYYY" />
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, defaultValue, type = "text" }: { label: string; defaultValue: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input type={type} defaultValue={defaultValue} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}

function Toggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <span className="text-sm">{label}</span>
      <button onClick={() => setOn(!on)} className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-success" : "bg-muted"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function BookingLinkCard() {
  const { staff } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!staff) return;
    (async () => {
      const { data } = await supabase
        .from("v2_restaurants")
        .select("slug")
        .eq("id", staff.restaurant_id)
        .maybeSingle();
      if (data?.slug) setSlug(data.slug);
    })();
  }, [staff]);

  if (!slug) return null;
  const url = typeof window !== "undefined" ? `${window.location.origin}/book/${slug}` : `/book/${slug}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    catch { toast.error("Copy failed"); }
  };

  return (
    <div className="rounded-xl border border-success/30 bg-success/5 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-success">
        <LinkIcon className="size-3.5" /> Public booking link
      </div>
      <div className="mt-1 font-mono text-sm break-all">{url}</div>
      <div className="mt-3 flex gap-2">
        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground">
          <Copy className="size-3.5" /> Copy
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium">
          <ExternalLink className="size-3.5" /> Open
        </a>
      </div>
    </div>
  );
}

function FloorplanLinkCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
        <LayoutGrid className="size-3.5" /> Floor plan
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Arrange your tables the way your dining room is laid out.</p>
      <Link to="/floorplan" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
        <LayoutGrid className="size-3.5" /> Open designer
      </Link>
    </div>
  );
}

function ProfileSection() {
  const { staff } = useAuth();
  const [r, setR] = useState<ProfileRestaurant | null>(null);
  useEffect(() => {
    if (!staff) return;
    supabase.from("v2_restaurants")
      .select("id,name,slug,city,address,phone,cuisine,website,logo_url,cover_url")
      .eq("id", staff.restaurant_id).maybeSingle()
      .then(({ data }) => setR(data as ProfileRestaurant | null));
  }, [staff]);
  if (!r) return <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading…</div>;
  return <ProfileEditor restaurant={r} ctaLabel="Save changes" onSaved={setR} />;
}

function HoursSection() {
  const { staff } = useAuth();
  const [hours, setHours] = useState<WeekHours | null>(null);
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (!staff) return;
    supabase.from("v2_restaurants").select("id,hours").eq("id", staff.restaurant_id).maybeSingle()
      .then(({ data }) => { if (data) { setId(data.id); setHours((data.hours as unknown as WeekHours) ?? null); } });
  }, [staff]);
  if (!id) return <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading…</div>;
  return (
    <HoursEditor value={hours} onChange={async (h) => {
      setHours(h);
      const { error } = await supabase.from("v2_restaurants").update({ hours: h as any }).eq("id", id);
      if (error) toast.error(error.message);
    }} />
  );
}

function BrandSection() {
  const { staff } = useAuth();
  const [r, setR] = useState<{ id: string; name: string; logo_url: string | null; cover_url: string | null; brand_primary: string | null; brand_accent: string | null; booking_headline: string | null; booking_welcome: string | null } | null>(null);
  useEffect(() => {
    if (!staff) return;
    supabase.from("v2_restaurants")
      .select("id,name,logo_url,cover_url,brand_primary,brand_accent,booking_headline,booking_welcome")
      .eq("id", staff.restaurant_id).maybeSingle()
      .then(({ data }) => setR(data as any));
  }, [staff]);
  if (!r) return <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading…</div>;
  return (
    <BrandEditor
      restaurantId={r.id}
      name={r.name}
      logoUrl={r.logo_url}
      coverUrl={r.cover_url}
      initial={{
        brand_primary: r.brand_primary ?? undefined,
        brand_accent: r.brand_accent ?? undefined,
        booking_headline: r.booking_headline ?? undefined,
        booking_welcome: r.booking_welcome ?? undefined,
      }}
    />
  );
}
