import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { settingsListLocations, settingsUpsertLocation } from "@/lib/settings-api";

type Loc = {
  id: string;
  name: string;
  public_slug: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  timezone: string | null;
  is_active: boolean;
  kind?: "primary" | "extra";
};

const empty = {
  name: "",
  public_slug: "",
  address: "",
  city: "",
  phone: "",
  timezone: "America/Toronto",
  is_active: true,
};

export function SettingsLocations() {
  const { org, staff } = useAuth();
  const orgId = org.activeOrganizationId;
  const restaurantId = staff?.restaurant_id ?? null;
  const tenantReady = Boolean(orgId || restaurantId);

  const [locations, setLocations] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Loc> & typeof empty>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!tenantReady) return;
    const res = await settingsListLocations(orgId, restaurantId);
    if (!res.ok) {
      toast.error(res.error ?? "Failed to load locations");
      setLocations([]);
      return;
    }
    if (Array.isArray(res.locations)) setLocations(res.locations as Loc[]);
  };

  useEffect(() => {
    if (!tenantReady) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, restaurantId, tenantReady]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading locations…
      </div>
    );
  }

  if (!tenantReady) {
    return <p className="text-sm text-muted-foreground">No restaurant workspace found.</p>;
  }

  const tenantId = orgId ?? restaurantId!;

  const startEdit = (loc?: Loc) => {
    if (loc) {
      setEditId(loc.id);
      setEditing({
        name: loc.name,
        public_slug: loc.public_slug,
        address: loc.address ?? "",
        city: loc.city ?? "",
        phone: loc.phone ?? "",
        timezone: loc.timezone ?? "America/Toronto",
        is_active: loc.is_active,
      });
    } else {
      setEditId(null);
      setEditing(empty);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Locations</h2>
          <p className="text-sm text-muted-foreground">
            Add or edit dining rooms. Extra sites are saved with this restaurant until organization
            mode is enabled.
          </p>
        </div>
        <button
          type="button"
          onClick={() => startEdit()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
        >
          <Plus className="size-3.5" /> Add location
        </button>
      </div>

      <ul className="space-y-2">
        {locations.map((l) => (
          <li
            key={l.id}
            className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-sm truncate">{l.name}</div>
                {l.kind === "primary" && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Primary
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                /book/{l.public_slug}
                {l.city ? ` · ${l.city}` : ""}
                {!l.is_active ? " · inactive" : ""}
              </div>
            </div>
            <button
              type="button"
              className="text-xs font-semibold underline"
              onClick={() => startEdit(l)}
            >
              Edit
            </button>
          </li>
        ))}
        {locations.length === 0 && (
          <li className="text-sm text-muted-foreground">No locations yet. Add your first site.</li>
        )}
      </ul>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">{editId ? "Edit location" : "New location"}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name">
            <input
              className="field"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </Field>
          <Field label="Slug">
            <input
              className="field"
              value={editing.public_slug}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  public_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                })
              }
              placeholder="casa-verde-king"
            />
          </Field>
          <Field label="Address">
            <input
              className="field"
              value={editing.address}
              onChange={(e) => setEditing({ ...editing, address: e.target.value })}
            />
          </Field>
          <Field label="City">
            <input
              className="field"
              value={editing.city}
              onChange={(e) => setEditing({ ...editing, city: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <input
              className="field"
              value={editing.phone}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
            />
          </Field>
          <Field label="Timezone">
            <input
              className="field"
              value={editing.timezone}
              onChange={(e) => setEditing({ ...editing, timezone: e.target.value })}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={editing.is_active}
            onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
          />
          Active
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!editing.name.trim()) {
              toast.error("Name is required");
              return;
            }
            setBusy(true);
            const res = await settingsUpsertLocation({
              organization_id: tenantId,
              location_id: editId,
              name: editing.name,
              public_slug: editing.public_slug || undefined,
              address: editing.address || null,
              city: editing.city || null,
              phone: editing.phone || null,
              timezone: editing.timezone || null,
              is_active: editing.is_active,
              restaurant_id: restaurantId,
            });
            setBusy(false);
            if (!res.ok) toast.error(res.error);
            else {
              toast.success(editId ? "Location updated" : "Location created");
              setEditing(empty);
              setEditId(null);
              await refresh();
            }
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save location"}
        </button>
      </div>
      <style>{`.field{width:100%;border:1px solid hsl(var(--border));border-radius:0.5rem;background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
