import { Field, inputClass, WizardPrimaryButton, WizardSecondaryButton, WizardShell } from "./WizardShell";
import type { BookingStepInput } from "@/lib/schemas/onboarding";

export function StepBooking({
  value,
  onChange,
  onBack,
  onContinue,
  busy,
  error,
}: {
  value: BookingStepInput;
  onChange: (v: BookingStepInput) => void;
  onBack: () => void;
  onContinue: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  return (
    <WizardShell
      step="booking"
      title="Booking basics"
      subtitle="Slot length, party size cap, and how far ahead guests must book."
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
        <Field label="Slot interval">
          <select
            className={inputClass}
            value={value.slot_interval_minutes}
            onChange={(e) =>
              onChange({
                ...value,
                slot_interval_minutes: Number(e.target.value) as 15 | 30 | 60,
              })
            }
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </Field>
        <Field label="Max party size">
          <input
            type="number"
            min={1}
            max={50}
            className={inputClass}
            value={value.max_party_size}
            onChange={(e) =>
              onChange({ ...value, max_party_size: Number(e.target.value) || 1 })
            }
          />
        </Field>
        <Field label="Lead time (hours)" hint="Minimum notice before a reservation.">
          <input
            type="number"
            min={0}
            max={168}
            className={inputClass}
            value={value.lead_time_hours}
            onChange={(e) =>
              onChange({ ...value, lead_time_hours: Number(e.target.value) || 0 })
            }
          />
        </Field>
      </div>
    </WizardShell>
  );
}
