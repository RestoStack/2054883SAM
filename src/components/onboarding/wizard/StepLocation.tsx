import { HoursEditor, DEFAULT_HOURS, type WeekHours } from "@/components/onboarding/HoursEditor";
import { Field, inputClass, WizardPrimaryButton, WizardSecondaryButton, WizardShell } from "./WizardShell";
import type { LocationStepInput } from "@/lib/schemas/onboarding";

const TIMEZONES = [
  "America/Toronto",
  "America/Vancouver",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "UTC",
];

export function StepLocation({
  value,
  onChange,
  onBack,
  onContinue,
  busy,
  error,
}: {
  value: LocationStepInput;
  onChange: (v: LocationStepInput) => void;
  onBack: () => void;
  onContinue: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const hours = (value.hours ?? DEFAULT_HOURS) as WeekHours;

  return (
    <WizardShell
      step="location"
      title="First location"
      subtitle="Address, phone, timezone, and weekly hours. Google Places can be wired later."
      error={error}
      footer={
        <>
          <WizardSecondaryButton onClick={onBack} disabled={busy}>
            Back
          </WizardSecondaryButton>
          <WizardPrimaryButton disabled={busy} onClick={onContinue}>
            {busy ? "Saving…" : "Continue"}
          </WizardPrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Location name">
          <input
            className={inputClass}
            value={value.location_name ?? "Main"}
            onChange={(e) => onChange({ ...value, location_name: e.target.value })}
            placeholder="Main"
          />
        </Field>
        <Field label="Street address" hint="Google Places autocomplete optional — type freely for now.">
          <input
            className={inputClass}
            value={value.address ?? ""}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            placeholder="123 King St W"
            autoComplete="street-address"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="City">
            <input
              className={inputClass}
              value={value.city ?? ""}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              placeholder="Toronto"
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputClass}
              value={value.phone ?? ""}
              onChange={(e) => onChange({ ...value, phone: e.target.value })}
              placeholder="+1 416 555 0100"
              autoComplete="tel"
            />
          </Field>
        </div>
        <Field label="Timezone">
          <select
            className={inputClass}
            value={value.timezone ?? "America/Toronto"}
            onChange={(e) => onChange({ ...value, timezone: e.target.value })}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Public booking slug (optional)">
          <input
            className={inputClass}
            value={value.public_slug ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                public_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
              })
            }
            placeholder="casa-verde"
          />
        </Field>
        <div>
          <div className="text-xs font-medium text-slate-600 mb-2">Hours</div>
          <HoursEditor
            value={hours}
            onChange={(h) => onChange({ ...value, hours: h })}
          />
        </div>
      </div>
    </WizardShell>
  );
}
