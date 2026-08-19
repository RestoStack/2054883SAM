import { Plus, Trash2 } from "lucide-react";
import { Field, inputClass, WizardPrimaryButton, WizardSecondaryButton, WizardShell } from "./WizardShell";
import type { TablesStepInput } from "@/lib/schemas/onboarding";

const PRESETS = [
  { label: "8 × 4-tops", count: 8, capacity: 4, section: "Main Floor" },
  { label: "4 × 2-tops patio", count: 4, capacity: 2, section: "Patio" },
  { label: "6 × bar seats", count: 6, capacity: 2, section: "Bar" },
];

export function StepTables({
  value,
  onChange,
  onBack,
  onContinue,
  busy,
  error,
}: {
  value: TablesStepInput;
  onChange: (v: TablesStepInput) => void;
  onBack: () => void;
  onContinue: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const groups = value.groups ?? [];

  const addGroup = (g?: { count: number; capacity: number; section: string }) => {
    onChange({
      groups: [
        ...groups,
        g ?? { count: 4, capacity: 4, section: "Main Floor" },
      ],
    });
  };

  const patch = (i: number, patch: Partial<(typeof groups)[0]>) => {
    onChange({
      groups: groups.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    });
  };

  const remove = (i: number) => {
    onChange({ groups: groups.filter((_, idx) => idx !== i) });
  };

  const total = groups.reduce((s, g) => s + (g.count || 0), 0);

  return (
    <WizardShell
      step="tables"
      title="Tables quick-setup"
      subtitle="Add groups of tables by capacity. The full floor editor lives in Settings later."
      error={error}
      footer={
        <>
          <WizardSecondaryButton onClick={onBack} disabled={busy}>
            Back
          </WizardSecondaryButton>
          <WizardPrimaryButton disabled={busy} onClick={onContinue}>
            {busy ? "Saving…" : `Continue · ${total} tables`}
          </WizardPrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => addGroup(p)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              + {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => addGroup()}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
          >
            <Plus className="size-3.5" /> Custom group
          </button>
        </div>

        {groups.length === 0 && (
          <p className="text-sm text-slate-500">Add at least one group to continue.</p>
        )}

        <div className="space-y-3">
          {groups.map((g, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 items-end rounded-xl border border-slate-200 p-3"
            >
              <Field label="Count">
                <input
                  type="number"
                  min={1}
                  max={200}
                  className={inputClass}
                  value={g.count}
                  onChange={(e) => patch(i, { count: Number(e.target.value) || 1 })}
                />
              </Field>
              <Field label="Capacity">
                <input
                  type="number"
                  min={1}
                  max={24}
                  className={inputClass}
                  value={g.capacity}
                  onChange={(e) => patch(i, { capacity: Number(e.target.value) || 2 })}
                />
              </Field>
              <Field label="Section">
                <input
                  className={inputClass}
                  value={g.section}
                  onChange={(e) => patch(i, { section: e.target.value })}
                />
              </Field>
              <button
                type="button"
                onClick={() => remove(i)}
                className="size-10 grid place-items-center rounded-lg hover:bg-slate-100"
                aria-label="Remove group"
              >
                <Trash2 className="size-4 text-slate-500" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </WizardShell>
  );
}
