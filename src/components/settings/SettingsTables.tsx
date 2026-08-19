import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutGrid, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { FloorplanDesigner } from "@/components/FloorplanDesigner";
import { settingsListLocations } from "@/lib/settings-api";
import { getBookingRules, upsertBookingRules } from "@/lib/booking-api";

type Loc = { id: string; name: string };

export function SettingsTables() {
  const { org, staff } = useAuth();
  const orgId = org.activeOrganizationId;
  const [locations, setLocations] = useState<Loc[]>([]);
  const [locationId, setLocationId] = useState("");
  const [interval, setInterval] = useState<15 | 30 | 60>(30);
  const [maxParty, setMaxParty] = useState(12);
  const [leadHours, setLeadHours] = useState(2);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    (async () => {
      const res = await settingsListLocations(orgId);
      const locs = (res.ok && Array.isArray(res.locations) ? res.locations : []) as Loc[];
      setLocations(locs);
      const first =
        (org.activeLocationId && locs.find((l) => l.id === org.activeLocationId)?.id) ||
        locs[0]?.id ||
        "";
      setLocationId(first);
      if (first) {
        const rules = await getBookingRules(orgId, first);
        if (rules.ok) {
          setInterval(rules.slot_interval_minutes as 15 | 30 | 60);
          setMaxParty(rules.max_party_size);
          setLeadHours(rules.lead_time_hours);
        }
      }
      setLoading(false);
    })();
  }, [orgId, org.activeLocationId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold">Tables & booking rules</h2>
        <p className="text-sm text-muted-foreground">
          Edit the floor layout and how guests book online.
        </p>
      </div>

      {locations.length > 0 && (
        <label className="block max-w-xs space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Location</span>
          <select
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={locationId}
            onChange={async (e) => {
              const id = e.target.value;
              setLocationId(id);
              if (!orgId) return;
              const rules = await getBookingRules(orgId, id);
              if (rules.ok) {
                setInterval(rules.slot_interval_minutes as 15 | 30 | 60);
                setMaxParty(rules.max_party_size);
                setLeadHours(rules.lead_time_hours);
              }
            }}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="rounded-xl border border-border p-4 space-y-4">
        <h3 className="text-sm font-semibold">Booking rules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Slot interval</span>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value) as 15 | 30 | 60)}
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Max party size</span>
            <input
              type="number"
              min={1}
              max={50}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={maxParty}
              onChange={(e) => setMaxParty(Number(e.target.value) || 1)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Lead time (hours)</span>
            <input
              type="number"
              min={0}
              max={168}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={leadHours}
              onChange={(e) => setLeadHours(Number(e.target.value) || 0)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy || !orgId || !locationId}
          onClick={async () => {
            if (!orgId || !locationId) return;
            setBusy(true);
            const res = await upsertBookingRules({
              organization_id: orgId,
              location_id: locationId,
              slot_interval_minutes: interval,
              max_party_size: maxParty,
              lead_time_hours: leadHours,
            });
            setBusy(false);
            if (!res.ok) toast.error(res.error);
            else toast.success("Booking rules saved");
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Save booking rules
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Floor plan</h3>
          <Link
            to="/floorplan"
            className="inline-flex items-center gap-1.5 text-xs font-semibold underline"
          >
            <LayoutGrid className="size-3.5" /> Full-screen editor
          </Link>
        </div>
        {staff?.restaurant_id ? (
          <div className="rounded-xl border border-border overflow-hidden min-h-[320px]">
            <FloorplanDesigner restaurantId={staff.restaurant_id} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sign in with a linked restaurant to edit tables, or open the full-screen editor.
          </p>
        )}
      </div>
    </div>
  );
}
