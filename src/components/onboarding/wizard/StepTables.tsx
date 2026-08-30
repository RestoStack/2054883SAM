import { Field, inputClass, WizardPrimaryButton, WizardShell } from "./WizardShell";
import type { TablesStepInput } from "@/lib/schemas/onboarding";

export function StepTables({
  value,
  onChange,
  onBack,
  onContinue,
  onSkip,
  busy,
  error,
}: {
  value: TablesStepInput;
  onChange: (v: TablesStepInput) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const count = value.count || 0;
  const seats = value.seats || 0;
  const capacity = count * seats;

  return (
    <WizardShell
      step={4}
      title="Table layout"
      subtitle="Quick setup: tell us how many tables and seats each. Capacity is computed live."
      error={error}
      onBack={onBack}
      onSkip={onSkip}
      canSkip
      footer={
        <WizardPrimaryButton disabled={busy || count < 1} onClick={onContinue}>
          {busy ? "Saving…" : "Continue"}
        </WizardPrimaryButton>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-900">
          Capacity: {capacity} seats across {count} tables
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Number of tables">
            <input
              type="number"
              min={1}
              max={200}
              className={inputClass}
              value={value.count}
              onChange={(e) =>
                onChange({ ...value, mode: "quick", count: Number(e.target.value) || 1 })
              }
            />
          </Field>
          <Field label="Seats per table">
            <input
              type="number"
              min={1}
              max={24}
              className={inputClass}
              value={value.seats}
              onChange={(e) =>
                onChange({ ...value, mode: "quick", seats: Number(e.target.value) || 2 })
              }
            />
          </Field>
          <Field label="Section name">
            <input
              className={inputClass}
              value={value.section}
              onChange={(e) => onChange({ ...value, section: e.target.value })}
            />
          </Field>
          <Field label="Online booking">
            <label className="flex h-11 items-center gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={value.bookable_online}
                onChange={(e) => onChange({ ...value, bookable_online: e.target.checked })}
              />
              Tables bookable online
            </label>
          </Field>
        </div>

        <p className="text-xs text-stone-500">
          We&apos;ll generate T1…T{count || "n"}. Full drag-and-drop floor editor is available later
          in Settings.
        </p>
      </div>
    </WizardShell>
  );
}
