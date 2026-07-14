import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Rocket, Building2, Grid3x3, Link as LinkIcon, Check, Copy, ExternalLink, Loader2, LayoutGrid, Clock, Palette, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { FloorplanDesigner } from "@/components/FloorplanDesigner";
import { ProfileEditor, type ProfileRestaurant } from "@/components/onboarding/ProfileEditor";
import { HoursEditor, DEFAULT_HOURS, type WeekHours } from "@/components/onboarding/HoursEditor";
import { BrandEditor } from "@/components/onboarding/BrandEditor";
import { MenuEditor } from "@/components/onboarding/MenuEditor";
import { TablesQuickAdd } from "@/components/onboarding/TablesQuickAdd";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — RestoStack" }] }),
  component: OnboardingPage,
});

type Restaurant = ProfileRestaurant & {
  hours: WeekHours | null;
  brand_primary: string | null;
  brand_accent: string | null;
  booking_headline: string | null;
  booking_welcome: string | null;
};

const STEPS = [
  { n: 1, label: "Profile", icon: Building2 },
  { n: 2, label: "Hours", icon: Clock },
  { n: 3, label: "Brand", icon: Palette },
  { n: 4, label: "Menu", icon: Utensils },
  { n: 5, label: "Tables", icon: Grid3x3 },
  { n: 6, label: "Floor plan", icon: LayoutGrid },
  { n: 7, label: "Go live", icon: LinkIcon },
] as const;

function OnboardingPage() {
  const { staff, loading, refreshStaff } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const load = async (id: string) => {
    const { data } = await supabase
      .from("v2_restaurants")
      .select("id,name,slug,city,address,phone,cuisine,website,logo_url,cover_url,hours,brand_primary,brand_accent,booking_headline,booking_welcome")
      .eq("id", id)
      .maybeSingle();
    if (data) setRestaurant(data as unknown as Restaurant);
  };

  useEffect(() => {
    if (loading || !staff) return;
    load(staff.restaurant_id);
  }, [staff, loading]);

  if (loading || !staff || !restaurant) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  const go = (n: number) => setStep(Math.max(1, Math.min(STEPS.length, n)));

  return (
    <AppShell>
      <PageHeader
        title="Welcome to RestoStack"
        description="Set up your restaurant end-to-end. Everything is editable later in Settings."
        icon={Rocket}
      />
      <div className="p-4 lg:p-5 max-w-5xl">
        <Stepper step={step} onJump={go} />
        <div className="mt-5 rounded-2xl border border-border bg-card p-6">
          {step === 1 && (
            <Section title="Restaurant profile" subtitle="Name is required — the rest is optional and editable.">
              <ProfileEditor
                restaurant={restaurant}
                ctaLabel="Save & continue"
                onSaved={(r) => { setRestaurant({ ...restaurant, ...r }); go(2); }}
              />
            </Section>
          )}

          {step === 2 && (
            <Section title="Weekly hours" subtitle="Guests see these on your booking page. You can change them any time.">
              <HoursEditor
                value={restaurant.hours}
                onChange={async (h) => {
                  setRestaurant({ ...restaurant, hours: h });
                  await supabase.from("v2_restaurants").update({ hours: h as any }).eq("id", restaurant.id);
                }}
              />
              <StepNav onBack={() => go(1)} onSkip={() => go(3)} onNext={async () => {
                if (!restaurant.hours) {
                  await supabase.from("v2_restaurants").update({ hours: DEFAULT_HOURS as any }).eq("id", restaurant.id);
                  setRestaurant({ ...restaurant, hours: DEFAULT_HOURS });
                }
                go(3);
              }} />
            </Section>
          )}

          {step === 3 && (
            <Section title="Brand & booking page" subtitle="Colors and copy applied to your public booking page.">
              <BrandEditor
                restaurantId={restaurant.id}
                name={restaurant.name}
                logoUrl={restaurant.logo_url}
                coverUrl={restaurant.cover_url}
                initial={{
                  brand_primary: restaurant.brand_primary ?? undefined,
                  brand_accent: restaurant.brand_accent ?? undefined,
                  booking_headline: restaurant.booking_headline ?? undefined,
                  booking_welcome: restaurant.booking_welcome ?? undefined,
                }}
                onSaved={(v) => setRestaurant({ ...restaurant, ...v })}
              />
              <StepNav onBack={() => go(2)} onSkip={() => go(4)} onNext={() => go(4)} />
            </Section>
          )}

          {step === 4 && (
            <Section title="Menu starter" subtitle="Add categories and a few items. You can grow it later on the Menu page.">
              <MenuEditor restaurantId={restaurant.id} />
              <StepNav onBack={() => go(3)} onSkip={() => go(5)} onNext={() => go(5)} />
            </Section>
          )}

          {step === 5 && (
            <Section title="Add tables" subtitle="Quick-add presets or list them manually. Arrange positions in the next step.">
              <TablesQuickAdd restaurantId={restaurant.id} onSaved={() => {}} />
              <StepNav onBack={() => go(4)} onSkip={() => go(6)} onNext={() => go(6)} />
            </Section>
          )}

          {step === 6 && (
            <Section title="Design your floor plan" subtitle="Click a table to place it, then drag to arrange. Use auto-layout for a starting grid.">
              <FloorplanDesigner restaurantId={restaurant.id} />
              <StepNav onBack={() => go(5)} onSkip={() => go(7)} onNext={() => go(7)} />
            </Section>
          )}

          {step === 7 && (
            <GoLiveStep
              restaurant={restaurant}
              onBack={() => go(6)}
              onFinish={async () => {
                await supabase
                  .from("v2_restaurants")
                  .update({ onboarding_completed_at: new Date().toISOString() })
                  .eq("id", restaurant.id);
                await refreshStaff();
                navigate({ to: "/dashboard" });
              }}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function StepNav({ onBack, onSkip, onNext }: { onBack?: () => void; onSkip?: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-border mt-4">
      {onBack ? (
        <button onClick={onBack} className="rounded-lg border border-border px-4 py-2 text-sm">Back</button>
      ) : <span />}
      <div className="flex gap-2">
        {onSkip && <button onClick={onSkip} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground">Skip</button>}
        <button onClick={onNext} className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground">Continue</button>
      </div>
    </div>
  );
}

function Stepper({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {STEPS.map((it, i) => {
        const Icon = it.icon;
        const active = step === it.n;
        const done = step > it.n;
        return (
          <div key={it.n} className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onJump(it.n)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition ${
                active ? "border-success bg-success/10 text-success"
                : done ? "border-success/40 bg-success/5 text-success"
                : "border-border bg-card text-muted-foreground"
              }`}
            >
              <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${done || active ? "bg-success text-success-foreground" : "bg-muted"}`}>
                {done ? <Check className="size-3.5" /> : it.n}
              </span>
              <Icon className="size-4" />
              <span className="text-xs font-semibold hidden md:inline">{it.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function GoLiveStep({ restaurant, onFinish, onBack }: { restaurant: Restaurant; onFinish: () => void; onBack: () => void }) {
  const url = useMemo(() => {
    if (typeof window === "undefined") return `/book/${restaurant.slug}`;
    return `${window.location.origin}/book/${restaurant.slug}`;
  }, [restaurant.slug]);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Copy failed"); }
  };
  const primary = restaurant.brand_primary ?? "#059669";
  const accent = restaurant.brand_accent ?? "#10b981";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">You're ready to go live 🎉</h2>
        <p className="text-sm text-muted-foreground">Share this link. Guests see your branding, hours, and can book instantly.</p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
        <div
          className="relative p-6 text-white"
          style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
        >
          {restaurant.cover_url && (
            <div className="absolute inset-0 opacity-25 bg-cover bg-center" style={{ backgroundImage: `url(${restaurant.cover_url})` }} />
          )}
          <div className="relative flex items-center gap-4">
            {restaurant.logo_url && <img src={restaurant.logo_url} alt="" className="size-14 rounded-lg object-cover ring-2 ring-white/40" />}
            <div>
              <h3 className="text-xl font-serif">{restaurant.booking_headline || `Reserve a table at ${restaurant.name}`}</h3>
              <p className="text-xs opacity-90 mt-1">{restaurant.booking_welcome || "Instant confirmation · takes under a minute"}</p>
              {restaurant.address && <p className="text-xs opacity-80 mt-2">{restaurant.address}{restaurant.city ? `, ${restaurant.city}` : ""}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-success/30 bg-success/5 p-5">
        <div className="text-[10px] font-semibold uppercase text-muted-foreground">Public booking URL</div>
        <div className="mt-1 font-mono text-sm break-all">{url}</div>
        <div className="mt-4 flex gap-2">
          <button onClick={copy} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground">
            <Copy className="size-4" /> {copied ? "Copied!" : "Copy link"}
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium">
            <ExternalLink className="size-4" /> Open booking page
          </a>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-lg border border-border px-4 py-2 text-sm">Back</button>
        <button onClick={onFinish} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Finish & go to dashboard</button>
      </div>
    </div>
  );
}
