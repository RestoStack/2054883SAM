import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export type BrandValues = {
  brand_primary: string;
  brand_accent: string;
  booking_headline: string;
  booking_welcome: string;
};

export function BrandEditor({
  restaurantId,
  name,
  logoUrl,
  coverUrl,
  initial,
  onSaved,
}: {
  restaurantId: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  initial: Partial<BrandValues>;
  onSaved?: (v: BrandValues) => void;
}) {
  const [primary, setPrimary] = useState(initial.brand_primary ?? "#059669");
  const [accent, setAccent] = useState(initial.brand_accent ?? "#10b981");
  const [headline, setHeadline] = useState(initial.booking_headline ?? `Reserve a table at ${name}`);
  const [welcome, setWelcome] = useState(initial.booking_welcome ?? "Instant confirmation · takes under a minute");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If parent updates the initial values, sync once
    setPrimary(initial.brand_primary ?? "#059669");
    setAccent(initial.brand_accent ?? "#10b981");
    setHeadline(initial.booking_headline ?? `Reserve a table at ${name}`);
    setWelcome(initial.booking_welcome ?? "Instant confirmation · takes under a minute");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("v2_restaurants")
      .update({
        brand_primary: primary,
        brand_accent: accent,
        booking_headline: headline || null,
        booking_welcome: welcome || null,
      })
      .eq("id", restaurantId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Branding saved");
    onSaved?.({ brand_primary: primary, brand_accent: accent, booking_headline: headline, booking_welcome: welcome });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Primary color" value={primary} onChange={setPrimary} />
          <ColorField label="Accent color" value={accent} onChange={setAccent} />
        </div>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Booking page headline</span>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Welcome sentence</span>
          <textarea rows={2} value={welcome} onChange={(e) => setWelcome(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" />
        </label>
        <button onClick={save} disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save branding
        </button>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Live preview</div>
        <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
          <div
            className="p-6 text-white relative"
            style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
          >
            {coverUrl && (
              <div className="absolute inset-0 opacity-25 bg-cover bg-center" style={{ backgroundImage: `url(${coverUrl})` }} />
            )}
            <div className="relative">
              <div className="flex items-center gap-3">
                {logoUrl && <img src={logoUrl} alt="" className="size-10 rounded-md object-cover ring-2 ring-white/40" />}
                <div className="text-xs font-medium opacity-90">Reservations</div>
              </div>
              <h3 className="mt-3 text-xl font-serif">{headline || `Reserve a table at ${name}`}</h3>
              <p className="text-xs opacity-90 mt-1">{welcome}</p>
            </div>
          </div>
          <div className="bg-white p-4">
            <button className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: accent }}>
              Book a table
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="size-8 rounded cursor-pointer bg-transparent border-0" />
        <input value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm font-mono outline-none" />
      </div>
    </label>
  );
}
