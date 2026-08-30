import { useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { BrandEditor } from "@/components/onboarding/BrandEditor";
import { PhotoUpload } from "@/components/onboarding/PhotoUpload";

type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_url: string | null;
  brand_primary: string | null;
  brand_accent: string | null;
  booking_headline: string | null;
  booking_welcome: string | null;
};

export function SettingsBookingPage() {
  const { staff } = useAuth();
  const restaurantId = staff?.restaurant_id ?? null;
  const [row, setRow] = useState<RestaurantRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("v2_restaurants")
        .select(
          "id, name, slug, logo_url, cover_url, brand_primary, brand_accent, booking_headline, booking_welcome",
        )
        .eq("id", restaurantId)
        .maybeSingle();
      if (cancelled) return;
      if (error) toast.error(error.message);
      setRow((data as RestaurantRow | null) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading booking page…
      </div>
    );
  }

  if (!restaurantId || !row) {
    return (
      <p className="text-sm text-muted-foreground">
        Finish onboarding to set up your public booking page.
      </p>
    );
  }

  const publicPath = `/book/${row.slug}`;
  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}${publicPath}` : publicPath;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold">Booking page</h2>
        <p className="text-sm text-muted-foreground">
          Guest-facing “Book your table” page at{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{publicPath}</code>
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
            Public link
          </div>
          <p className="text-sm font-mono truncate">{publicUrl}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(publicUrl);
                toast.success("Link copied");
              } catch {
                toast.error("Could not copy");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <Copy className="size-3.5" /> Copy
          </button>
          <a
            href={publicPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <ExternalLink className="size-3.5" /> Open
          </a>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Photos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4">
          <PhotoUpload
            restaurantId={row.id}
            kind="logo"
            url={row.logo_url}
            onChange={(u) => setRow((r) => (r ? { ...r, logo_url: u } : r))}
            aspect="square"
            label="Logo"
            hint="Square"
          />
          <PhotoUpload
            restaurantId={row.id}
            kind="cover"
            url={row.cover_url}
            onChange={(u) => setRow((r) => (r ? { ...r, cover_url: u } : r))}
            aspect="video"
            label="Cover image"
            hint="Hero background"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Headline & colours</h3>
        <BrandEditor
          restaurantId={row.id}
          name={row.name}
          logoUrl={row.logo_url}
          coverUrl={row.cover_url}
          initial={{
            brand_primary: row.brand_primary ?? "#059669",
            brand_accent: row.brand_accent ?? "#10b981",
            booking_headline: row.booking_headline ?? "Book your table",
            booking_welcome:
              row.booking_welcome ?? "Pick a date, party size, and time — under a minute.",
          }}
          onSaved={(v) =>
            setRow((r) =>
              r
                ? {
                    ...r,
                    brand_primary: v.brand_primary,
                    brand_accent: v.brand_accent,
                    booking_headline: v.booking_headline,
                    booking_welcome: v.booking_welcome,
                  }
                : r,
            )
          }
        />
      </div>
    </div>
  );
}
