import { Plus, Trash2 } from "lucide-react";
import { Field, inputClass, WizardPrimaryButton, WizardSecondaryButton, WizardShell } from "./WizardShell";
import type { TeamStepInput } from "@/lib/schemas/onboarding";

export function StepTeam({
  value,
  onChange,
  onBack,
  onContinue,
  busy,
  error,
}: {
  value: TeamStepInput;
  onChange: (v: TeamStepInput) => void;
  onBack: () => void;
  onContinue: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const invites = value.invites ?? [];

  const add = () =>
    onChange({ invites: [...invites, { email: "", role: "host" }] });

  const patch = (i: number, p: Partial<(typeof invites)[0]>) => {
    onChange({
      invites: invites.map((row, idx) => (idx === i ? { ...row, ...p } : row)),
    });
  };

  const remove = (i: number) =>
    onChange({ invites: invites.filter((_, idx) => idx !== i) });

  return (
    <WizardShell
      step="team"
      title="Invite your team"
      subtitle="Optional. Teammates skip payment and sign in with Google or email."
      error={error}
      footer={
        <>
          <WizardSecondaryButton onClick={onBack} disabled={busy}>
            Back
          </WizardSecondaryButton>
          <div className="flex gap-2">
            <WizardSecondaryButton onClick={onContinue} disabled={busy}>
              Skip for now
            </WizardSecondaryButton>
            <WizardPrimaryButton disabled={busy} onClick={onContinue}>
              {busy ? "Saving…" : "Continue"}
            </WizardPrimaryButton>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        {invites.map((inv, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_40px] gap-2 items-end">
            <Field label="Email">
              <input
                type="email"
                className={inputClass}
                value={inv.email}
                onChange={(e) => patch(i, { email: e.target.value })}
                placeholder="host@restaurant.com"
              />
            </Field>
            <Field label="Role">
              <select
                className={inputClass}
                value={inv.role}
                onChange={(e) =>
                  patch(i, { role: e.target.value as "manager" | "host" })
                }
              >
                <option value="host">Host</option>
                <option value="manager">Manager</option>
              </select>
            </Field>
            <button
              type="button"
              onClick={() => remove(i)}
              className="size-10 grid place-items-center rounded-lg hover:bg-slate-100"
              aria-label="Remove"
            >
              <Trash2 className="size-4 text-slate-500" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"
        >
          <Plus className="size-4" /> Add teammate
        </button>
      </div>
    </WizardShell>
  );
}
