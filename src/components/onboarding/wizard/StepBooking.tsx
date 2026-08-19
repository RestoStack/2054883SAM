import { Field, inputClass, WizardPrimaryButton, WizardShell } from "./WizardShell";
import type { BookingStepInput, HoursStepInput } from "@/lib/schemas/onboarding";

export function StepBooking({
  value,
  openingHours,
  onChange,
  onBack,
  onContinue,
  onSkip,
  busy,
  error,
}: {
  value: BookingStepInput;
  openingHours: HoursStepInput;
  onChange: (v: BookingStepInput) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const copyFromOpening = () => {
    onChange({
      ...value,
      use_opening_hours: true,
      booking_ranges: openingHours.ranges
        .filter((r) => !openingHours.closed_days.includes(r.day))
        .map((r) => ({ day: r.day, open: r.open, close: r.close })),
    });
  };

  return (
    <WizardShell
      step={3}
      title="Booking hours & slot rules"
      subtitle="What guests can book online — usually narrower than open hours."
      error={error}
      onBack={onBack}
      onSkip={onSkip}
      canSkip
      footer={
        <WizardPrimaryButton disabled={busy} onClick={onContinue}>
          {busy ? "Saving…" : "Continue"}
        </WizardPrimaryButton>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyFromOpening}
            className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Copy from opening hours
          </button>
          <label className="flex items-center gap-2 text-xs text-stone-500">
            <input
              type="checkbox"
              checked={value.use_opening_hours}
              onChange={(e) => onChange({ ...value, use_opening_hours: e.target.checked })}
            />
            Same as opening hours
          </label>
        </div>

        {!value.use_opening_hours && (
          <p className="text-xs text-stone-500">
            Booking windows saved as custom ranges ({value.booking_ranges.length} ranges). Use
            &quot;Copy from opening hours&quot; then narrow later in Settings.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
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
          <Field label="Max covers per slot">
            <input
              type="number"
              min={1}
              max={500}
              className={inputClass}
              value={value.max_covers_per_slot}
              onChange={(e) =>
                onChange({ ...value, max_covers_per_slot: Number(e.target.value) || 1 })
              }
            />
          </Field>
          <Field label="Min party size (online)">
            <input
              type="number"
              min={1}
              max={50}
              className={inputClass}
              value={value.min_party_size}
              onChange={(e) =>
                onChange({ ...value, min_party_size: Number(e.target.value) || 1 })
              }
            />
          </Field>
          <Field label="Max party size (online)">
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
          <Field label="Advance booking window (days)">
            <input
              type="number"
              min={1}
              max={365}
              className={inputClass}
              value={value.advance_days}
              onChange={(e) =>
                onChange({ ...value, advance_days: Number(e.target.value) || 1 })
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

        <div className="rounded-xl border border-stone-100 p-4 space-y-3">
          <div className="text-sm font-semibold text-stone-800">Default turn times</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="1–2 guests (min)">
              <input
                type="number"
                min={30}
                className={inputClass}
                value={value.turn_times.party_1_2}
                onChange={(e) =>
                  onChange({
                    ...value,
                    turn_times: {
                      ...value.turn_times,
                      party_1_2: Number(e.target.value) || 75,
                    },
                  })
                }
              />
            </Field>
            <Field label="3–4 guests (min)">
              <input
                type="number"
                min={30}
                className={inputClass}
                value={value.turn_times.party_3_4}
                onChange={(e) =>
                  onChange({
                    ...value,
                    turn_times: {
                      ...value.turn_times,
                      party_3_4: Number(e.target.value) || 90,
                    },
                  })
                }
              />
            </Field>
            <Field label="5+ guests (min)">
              <input
                type="number"
                min={30}
                className={inputClass}
                value={value.turn_times.party_5_plus}
                onChange={(e) =>
                  onChange({
                    ...value,
                    turn_times: {
                      ...value.turn_times,
                      party_5_plus: Number(e.target.value) || 120,
                    },
                  })
                }
              />
            </Field>
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
