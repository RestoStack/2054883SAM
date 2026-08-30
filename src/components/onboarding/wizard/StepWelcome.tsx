import { Field, inputClass, WizardPrimaryButton, WizardShell } from "./WizardShell";
import type { WelcomeStepInput } from "@/lib/schemas/onboarding";

export function StepWelcome({
  value,
  onChange,
  onContinue,
  busy,
  error,
}: {
  value: WelcomeStepInput;
  onChange: (v: WelcomeStepInput) => void;
  onContinue: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  return (
    <WizardShell
      step="welcome"
      title="Welcome to RestoStack"
      subtitle="We’ll get your restaurant live in a few short steps. Start with your name."
      error={error}
      footer={
        <>
          <span />
          <WizardPrimaryButton disabled={busy} onClick={onContinue}>
            {busy ? "Saving…" : "Continue"}
          </WizardPrimaryButton>
        </>
      }
    >
      <Field label="Your name">
        <input
          className={inputClass}
          value={value.full_name}
          onChange={(e) => onChange({ full_name: e.target.value })}
          placeholder="Alex Rivera"
          autoFocus
          autoComplete="name"
        />
      </Field>
    </WizardShell>
  );
}
