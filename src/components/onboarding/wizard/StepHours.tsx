import { Field, inputClass, WizardPrimaryButton, WizardShell } from "./WizardShell";
import type { HoursStepInput } from "@/lib/schemas/onboarding";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function defaultRanges(): HoursStepInput["ranges"] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open: "11:00",
    close: "22:00",
    sort: 0,
  }));
}

export function StepHours({
  value,
  onChange,
  onContinue,
  onBack,
  busy,
  error,
}: {
  value: HoursStepInput;
  onChange: (v: HoursStepInput) => void;
  onContinue: () => void;
  onBack: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const ranges = value.ranges.length ? value.ranges : defaultRanges();
  const closed = new Set(value.closed_days);

  const setDay = (day: number, patch: Partial<{ open: string; close: string; closed: boolean }>) => {
    if (patch.closed) {
      onChange({
        ranges: ranges.filter((r) => r.day !== day),
        closed_days: [...new Set([...value.closed_days, day])],
      });
      return;
    }
    const nextClosed = value.closed_days.filter((d) => d !== day);
    const existing = ranges.find((r) => r.day === day);
    const row = {
      day,
      open: patch.open ?? existing?.open ?? "11:00",
      close: patch.close ?? existing?.close ?? "22:00",
      sort: 0,
    };
    const others = ranges.filter((r) => r.day !== day);
    onChange({ ranges: [...others, row].sort((a, b) => a.day - b.day), closed_days: nextClosed });
  };

  const addRange = (day: number) => {
    const count = ranges.filter((r) => r.day === day).length;
    onChange({
      ...value,
      closed_days: value.closed_days.filter((d) => d !== day),
      ranges: [
        ...ranges,
        { day, open: "17:00", close: "22:00", sort: count },
      ].sort((a, b) => a.day - b.day || (a.sort ?? 0) - (b.sort ?? 0)),
    });
  };

  return (
    <WizardShell
      step={2}
      title="Opening hours"
      subtitle="When the restaurant is open — not yet booking hours. Multiple ranges per day are OK."
      error={error}
      onBack={onBack}
      footer={
        <WizardPrimaryButton
          disabled={busy}
          onClick={() =>
            onContinue()
          }
        >
          {busy ? "Saving…" : "Continue"}
        </WizardPrimaryButton>
      }
    >
      <div className="space-y-3">
        {DAY_LABELS.map((label, day) => {
          const dayRanges = ranges.filter((r) => r.day === day);
          const isClosed = closed.has(day);
          return (
            <div key={day} className="rounded-xl border border-stone-100 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-stone-800 w-10">{label}</div>
                <label className="flex items-center gap-2 text-xs text-stone-500">
                  <input
                    type="checkbox"
                    checked={isClosed}
                    onChange={(e) => setDay(day, { closed: e.target.checked })}
                  />
                  Closed
                </label>
                {!isClosed && (
                  <button
                    type="button"
                    className="text-xs font-medium text-emerald-600"
                    onClick={() => addRange(day)}
                  >
                    + range
                  </button>
                )}
              </div>
              {!isClosed &&
                (dayRanges.length ? dayRanges : [{ day, open: "11:00", close: "22:00", sort: 0 }]).map(
                  (r, idx) => (
                    <div key={idx} className="mb-2 flex items-center gap-2">
                      <Field label="Open">
                        <input
                          type="time"
                          className={inputClass}
                          value={r.open}
                          onChange={(e) => {
                            const next = ranges.filter(
                              (x) => !(x.day === day && x.open === r.open && x.close === r.close),
                            );
                            onChange({
                              ...value,
                              ranges: [
                                ...next,
                                { ...r, open: e.target.value },
                              ].sort((a, b) => a.day - b.day),
                            });
                          }}
                        />
                      </Field>
                      <Field label="Close">
                        <input
                          type="time"
                          className={inputClass}
                          value={r.close}
                          onChange={(e) => {
                            const next = ranges.filter(
                              (x) => !(x.day === day && x.open === r.open && x.close === r.close),
                            );
                            onChange({
                              ...value,
                              ranges: [
                                ...next,
                                { ...r, close: e.target.value },
                              ].sort((a, b) => a.day - b.day),
                            });
                          }}
                        />
                      </Field>
                    </div>
                  ),
                )}
            </div>
          );
        })}
      </div>
    </WizardShell>
  );
}
