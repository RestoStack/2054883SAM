import { useMemo, useState } from "react";
import { Field, inputClass, WizardPrimaryButton, WizardShell } from "./WizardShell";
import type { RestaurantStepInput } from "@/lib/schemas/onboarding";

const DAYS_HINT = "Imported fields are editable — nothing locks until you confirm.";

export function StepRestaurant({
  value,
  onChange,
  onContinue,
  busy,
  error,
}: {
  value: RestaurantStepInput;
  onChange: (v: RestaurantStepInput) => void;
  onContinue: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [placeQuery, setPlaceQuery] = useState("");
  const [imported, setImported] = useState(false);
  const placesKey = typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_GOOGLE_PLACES_API_KEY : "";

  const slugPreview = useMemo(() => {
    if (value.slug) return value.slug;
    return value.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }, [value.name, value.slug]);

  const applyManualPlace = () => {
    // Without Places API key: treat query as address seed
    if (!placeQuery.trim()) return;
    onChange({
      ...value,
      address: value.address || placeQuery.trim(),
      city: value.city || "",
    });
    setImported(true);
  };

  return (
    <WizardShell
      step={1}
      title="Create your restaurant"
      subtitle="Name your venue. Optionally search Google to prefill address, phone, and hours."
      error={error}
      footer={
        <WizardPrimaryButton disabled={busy || !value.name.trim()} onClick={onContinue}>
          {busy ? "Saving…" : "Continue"}
        </WizardPrimaryButton>
      }
    >
      <div className="space-y-4">
        <Field label="Restaurant name">
          <input
            className={inputClass}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="Industria Laval"
            autoFocus
          />
        </Field>

        <Field
          label="Google Business / address search"
          hint={
            placesKey
              ? "Pick your listing to import details."
              : "Places API key not set — paste your address and we’ll use it as a starting point."
          }
        >
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder="Search or paste address"
            />
            <button
              type="button"
              onClick={applyManualPlace}
              className="h-11 shrink-0 rounded-xl border border-stone-200 px-3 text-sm font-medium"
            >
              Apply
            </button>
          </div>
        </Field>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
            <div className="text-xs font-semibold text-emerald-800">Restaurant details</div>
            <p className="text-[11px] text-emerald-700/80">{DAYS_HINT}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Address">
                <input
                  className={inputClass}
                  value={value.address ?? ""}
                  onChange={(e) => onChange({ ...value, address: e.target.value })}
                />
              </Field>
              <Field label="City">
                <input
                  className={inputClass}
                  value={value.city ?? ""}
                  onChange={(e) => onChange({ ...value, city: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <input
                  className={inputClass}
                  value={value.phone ?? ""}
                  onChange={(e) => onChange({ ...value, phone: e.target.value })}
                  placeholder="+1…"
                />
              </Field>
              <Field label="Website">
                <input
                  className={inputClass}
                  value={value.website ?? ""}
                  onChange={(e) => onChange({ ...value, website: e.target.value })}
                />
              </Field>
              <Field label="Cuisine">
                <input
                  className={inputClass}
                  value={value.cuisine ?? ""}
                  onChange={(e) => onChange({ ...value, cuisine: e.target.value })}
                />
              </Field>
              <Field label="Timezone">
                <input
                  className={inputClass}
                  value={value.timezone}
                  onChange={(e) => onChange({ ...value, timezone: e.target.value })}
                />
              </Field>
            </div>
          </div>

        <Field label="Booking slug preview" hint={`book.restostacks.com/${slugPreview || "…"}`}>
          <input
            className={inputClass}
            value={value.slug ?? slugPreview}
            onChange={(e) =>
              onChange({
                ...value,
                slug: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "")
                  .slice(0, 64),
              })
            }
          />
        </Field>
      </div>
    </WizardShell>
  );
}
