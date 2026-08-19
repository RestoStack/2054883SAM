import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { settingsUpdateProfile } from "@/lib/settings-api";

export function SettingsProfile() {
  const { org } = useAuth();
  const orgId = org.activeOrganizationId;
  const [name, setName] = useState("");
  const [brandColor, setBrandColor] = useState("#059669");
  const [logoUrl, setLogoUrl] = useState("");
  const [timezone, setTimezone] = useState("America/Toronto");
  const [currency, setCurrency] = useState("CAD");
  const [locale, setLocale] = useState("en-CA");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from("organizations")
        .select("name, brand_color, logo_url, timezone, currency, locale")
        .eq("id", orgId)
        .maybeSingle();
      if (data) {
        setName(data.name ?? "");
        setBrandColor(data.brand_color ?? "#059669");
        setLogoUrl(data.logo_url ?? "");
        setTimezone(data.timezone ?? "America/Toronto");
        setCurrency(data.currency ?? "CAD");
        setLocale(data.locale ?? "en-CA");
      } else {
        const mem = org.memberships.find((m) => m.organization_id === orgId);
        setName(mem?.organization_name ?? "");
      }
      setLoading(false);
    })();
  }, [orgId, org.memberships]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading profile…
      </div>
    );
  }

  if (!orgId) {
    return <p className="text-sm text-muted-foreground">No organization selected.</p>;
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">Organization name, brand, and locale defaults.</p>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Restaurant name</span>
        <input
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Brand colour</span>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="size-10 rounded-md border border-border"
          />
          <input
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
          />
        </div>
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Logo URL</span>
        <input
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://…"
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Timezone</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Currency</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={3}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Locale</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await settingsUpdateProfile({
            organization_id: orgId,
            name,
            brand_color: brandColor,
            logo_url: logoUrl || null,
            timezone,
            currency,
            locale,
          });
          setBusy(false);
          if (!res.ok) toast.error(res.error);
          else toast.success("Profile saved");
        }}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 inline-flex items-center gap-2"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        Save profile
      </button>
    </div>
  );
}
