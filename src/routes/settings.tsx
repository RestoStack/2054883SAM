import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Settings as SettingsIcon, Building2, CreditCard, Bell, Users, Lock, Globe, Copy, ExternalLink, Link as LinkIcon, LayoutGrid, Clock, Palette, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStaffUsers } from "@/lib/v2-data";
import { isPlanId, PLANS, type PlanId } from "@/lib/plans";
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
  { id: "floor", label: "Floor plan", icon: LayoutGrid },
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
            {active === "floor" && (
              <div className="space-y-3 max-w-2xl">
                <h2 className="text-lg font-semibold">Floor plan</h2>
                <p className="text-sm text-muted-foreground">
                  Arrange tables to match your dining room. Structured menu is out of MVP scope.
                </p>
                <Link
                  to="/floorplan"
                  className="mt-2 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted/40"
                >
                  <LayoutGrid className="size-4" />
                  Open floor plan designer
                </Link>
              </div>
            )}
            {active === "billing" && <BillingSection />}
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
            {active === "team" && <TeamSection />}
            {active === "security" && (
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-lg font-semibold">Security</h2>
                <Field label="Password" defaultValue="••••••••••••" type="password" />
                <Toggle label="Two-factor authentication" defaultOn />
                <Toggle label="Require admin approval for refunds" defaultOn />
              </div>
            )}
            {active === "locale" && <LocaleSection />}
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

const TRIAL_DAYS = 14;

function BillingSection() {
  const { staff } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState<PlanId>("starter");
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");

  useEffect(() => {
    if (!staff) return;
    supabase
      .from("v2_restaurants")
      .select("plan, trial_started_at, name")
      .eq("id", staff.restaurant_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPlanId(isPlanId(data.plan) ? data.plan : "starter");
          setTrialStartedAt(data.trial_started_at);
          setRestaurantName(data.name ?? "");
        }
        setLoading(false);
      });
  }, [staff]);

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  let trialNote = "";
  if (trialStartedAt) {
    const start = new Date(trialStartedAt);
    const end = new Date(start);
    end.setDate(end.getDate() + TRIAL_DAYS);
    const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
    trialNote =
      daysLeft > 0
        ? `Free trial · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left (ends ${end.toLocaleDateString()})`
        : `Trial ended ${end.toLocaleDateString()} · ${plan.price}${plan.priceNote}`;
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-lg font-semibold">Billing & Plan</h2>
      <div className="rounded-xl border border-border p-5 bg-gradient-to-br from-accent/40 to-transparent">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm text-muted-foreground">Current plan</div>
            <div className="text-2xl font-bold">{plan.name}</div>
            {restaurantName && (
              <div className="text-xs text-muted-foreground mt-0.5">{restaurantName}</div>
            )}
          </div>
          <a
            href="mailto:sales@restostack.app?subject=Change%20plan"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted/60"
          >
            Contact sales to change plan
          </a>
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          {plan.price}
          {plan.priceNote}
          {plan.id !== "group" && " · billed monthly"}
        </div>
        {trialNote && <div className="text-sm text-success mt-1 font-medium">{trialNote}</div>}
        <p className="text-xs text-muted-foreground mt-3">{plan.description}</p>
      </div>
    </div>
  );
}

function TeamSection() {
  const { data: staffUsers = [], isLoading } = useStaffUsers();

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-semibold">Team Access</h2>
      {isLoading && (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> Loading team…
        </div>
      )}
      {!isLoading && staffUsers.length === 0 && (
        <p className="text-sm text-muted-foreground">No staff accounts yet for this restaurant.</p>
      )}
      {staffUsers.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-full bg-gradient-to-br from-accent to-primary/30 shrink-0" />
            <div className="min-w-0">
              <span className="text-sm font-medium block truncate">{m.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {m.role}
                {!m.active && " · inactive"}
              </span>
            </div>
          </div>
          <Link to="/staff" className="text-xs text-muted-foreground hover:text-foreground shrink-0">
            Manage
          </Link>
        </div>
      ))}
      <Link
        to="/staff"
        className="inline-flex rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground"
      >
        Invite teammate
      </Link>
    </div>
  );
}

function LocaleSection() {
  const { staff } = useAuth();
  const [id, setId] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("America/New_York");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!staff) return;
    supabase
      .from("v2_restaurants")
      .select("id, currency, timezone")
      .eq("id", staff.restaurant_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setId(data.id);
          setCurrency(data.currency ?? "USD");
          setTimezone(data.timezone ?? "America/New_York");
        }
      });
  }, [staff]);

  const save = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("v2_restaurants")
      .update({ currency, timezone })
      .eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Locale settings saved");
  };

  if (!id) {
    return (
      <div className="text-muted-foreground flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-semibold">Locale & Currency</h2>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Currency</span>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
          <option value="CAD">CAD ($)</option>
          <option value="AUD">AUD ($)</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Timezone</span>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="America/New_York">America/New_York (Eastern)</option>
          <option value="America/Chicago">America/Chicago (Central)</option>
          <option value="America/Denver">America/Denver (Mountain)</option>
          <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
          <option value="Europe/London">Europe/London</option>
          <option value="Europe/Paris">Europe/Paris</option>
        </select>
      </label>
      <button
        onClick={() => void save()}
        disabled={saving}
        className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
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
