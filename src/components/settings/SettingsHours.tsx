import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { HoursEditor, DEFAULT_HOURS, type WeekHours } from "@/components/onboarding/HoursEditor";
import {
  settingsDeleteSpecialHours,
  settingsGetHours,
  settingsListLocations,
  settingsListSpecialHours,
  settingsUpdateHours,
  settingsUpsertSpecialHours,
} from "@/lib/settings-api";

type Loc = { id: string; name: string };
type Special = {
  id: string;
  on_date: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  label: string | null;
};

export function SettingsHours() {
  const { org } = useAuth();
  const orgId = org.activeOrganizationId;
  const [locations, setLocations] = useState<Loc[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [hours, setHours] = useState<WeekHours>(DEFAULT_HOURS);
  const [special, setSpecial] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [specDate, setSpecDate] = useState("");
  const [specLabel, setSpecLabel] = useState("");
  const [specClosed, setSpecClosed] = useState(true);

  const load = async (locId: string) => {
    if (!orgId || !locId) return;
    const [h, s] = await Promise.all([
      settingsGetHours(orgId, locId),
      settingsListSpecialHours(orgId, locId),
    ]);
    if (h.ok && h.hours && typeof h.hours === "object") {
      setHours({ ...DEFAULT_HOURS, ...(h.hours as WeekHours) });
    } else {
      setHours(DEFAULT_HOURS);
    }
    if (s.ok && Array.isArray(s.special_hours)) {
      setSpecial(s.special_hours as Special[]);
    } else {
      setSpecial([]);
    }
  };

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    (async () => {
      const res = await settingsListLocations(orgId);
      const locs = (res.ok && Array.isArray(res.locations) ? res.locations : []) as Loc[];
      setLocations(locs);
      const first = org.activeLocationId && locs.find((l) => l.id === org.activeLocationId)
        ? org.activeLocationId
        : locs[0]?.id ?? "";
      setLocationId(first);
      if (first) await load(first);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading hours…
      </div>
    );
  }

  if (!orgId || locations.length === 0) {
    return <p className="text-sm text-muted-foreground">Add a location first.</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Hours</h2>
        <p className="text-sm text-muted-foreground">Weekly hours per location, plus special dates.</p>
      </div>

      <label className="block space-y-1 max-w-xs">
        <span className="text-xs font-medium text-muted-foreground">Location</span>
        <select
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={locationId}
          onChange={async (e) => {
            setLocationId(e.target.value);
            await load(e.target.value);
          }}
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      <HoursEditor value={hours} onChange={setHours} />

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await settingsUpdateHours({
            organization_id: orgId,
            location_id: locationId,
            hours,
          });
          setBusy(false);
          if (!res.ok) toast.error(res.error);
          else toast.success("Hours saved");
        }}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        Save weekly hours
      </button>

      <div className="border-t border-border pt-6 space-y-3">
        <h3 className="font-semibold text-sm">Special hours</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Date</span>
            <input
              type="date"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={specDate}
              onChange={(e) => setSpecDate(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Label</span>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={specLabel}
              onChange={(e) => setSpecLabel(e.target.value)}
              placeholder="Holiday"
            />
          </label>
          <label className="flex items-center gap-2 text-sm pb-2">
            <input
              type="checkbox"
              checked={specClosed}
              onChange={(e) => setSpecClosed(e.target.checked)}
            />
            Closed
          </label>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
          onClick={async () => {
            if (!specDate) {
              toast.error("Pick a date");
              return;
            }
            const res = await settingsUpsertSpecialHours({
              organization_id: orgId,
              location_id: locationId,
              on_date: specDate,
              is_closed: specClosed,
              open: specClosed ? null : "11:00",
              close: specClosed ? null : "22:00",
              label: specLabel || null,
            });
            if (!res.ok) toast.error(res.error);
            else {
              toast.success("Special hours saved");
              setSpecDate("");
              setSpecLabel("");
              await load(locationId);
            }
          }}
        >
          <Plus className="size-3.5" /> Add special date
        </button>

        <ul className="space-y-2">
          {special.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{s.on_date}</span>
                {s.label ? ` · ${s.label}` : ""}
                {s.is_closed
                  ? " · Closed"
                  : ` · ${String(s.open_time).slice(0, 5)}–${String(s.close_time).slice(0, 5)}`}
              </span>
              <button
                type="button"
                className="size-8 grid place-items-center rounded-md hover:bg-muted"
                onClick={async () => {
                  const res = await settingsDeleteSpecialHours(orgId, s.id);
                  if (!res.ok) toast.error(res.error);
                  else await load(locationId);
                }}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
          {special.length === 0 && (
            <li className="text-xs text-muted-foreground">No special dates yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
