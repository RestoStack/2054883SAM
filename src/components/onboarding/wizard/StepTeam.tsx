import { Plus, Trash2 } from "lucide-react";
import { Field, inputClass, WizardPrimaryButton, WizardShell } from "./WizardShell";
import type { TeamStepInput } from "@/lib/schemas/onboarding";

export function StepTeam({
  value,
  onChange,
  onBack,
  onContinue,
  onSkip,
  busy,
  error,
}: {
  value: TeamStepInput;
  onChange: (v: TeamStepInput) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const invites = value.invites ?? [];

  const add = () => onChange({ invites: [...invites, { email: "", role: "host" }] });

  const patch = (i: number, p: Partial<(typeof invites)[0]>) => {
    onChange({
      invites: invites.map((row, idx) => (idx === i ? { ...row, ...p } : row)),
    });
  };

  const remove = (i: number) =>
    onChange({ invites: invites.filter((_, idx) => idx !== i) });

  return (
    <WizardShell
      step={6}
      title="Invite your team"
      subtitle="Add by email. Invites expire in 7 days and are scoped to this restaurant."
      error={error}
      onBack={onBack}
      onSkip={onSkip}
      canSkip
      footer={
        <WizardPrimaryButton disabled={busy} onClick={onContinue}>
          {busy ? "Sending…" : "Continue"}
        </WizardPrimaryButton>
      }
    >
      <div className="space-y-4">
        {invites.map((inv, i) => (
          <div key={i} className="grid grid-cols-[1fr_130px_40px] gap-2 items-end">
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
                  patch(i, {
                    role: e.target.value as "manager" | "host" | "server",
                  })
                }
              >
                <option value="manager">Manager</option>
                <option value="host">Host</option>
                <option value="server">Server</option>
              </select>
            </Field>
            <button
              type="button"
              onClick={() => remove(i)}
              className="size-10 grid place-items-center rounded-lg hover:bg-stone-100"
              aria-label="Remove"
            >
              <Trash2 className="size-4 text-stone-500" />
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
