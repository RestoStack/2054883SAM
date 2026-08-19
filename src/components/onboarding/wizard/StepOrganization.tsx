import { Field, inputClass, WizardPrimaryButton, WizardSecondaryButton, WizardShell } from "./WizardShell";
import type { OrganizationStepInput } from "@/lib/schemas/onboarding";

const COLORS = [
  "#059669",
  "#e11d48",
  "#d97706",
  "#4f46e5",
  "#0f172a",
  "#9a3412",
];

export function StepOrganization({
  value,
  onChange,
  onBack,
  onContinue,
  busy,
  error,
  onLogoFile,
}: {
  value: OrganizationStepInput;
  onChange: (v: OrganizationStepInput) => void;
  onBack: () => void;
  onContinue: () => void;
  busy?: boolean;
  error?: string | null;
  onLogoFile?: (file: File) => void;
}) {
  return (
    <WizardShell
      step="organization"
      title="Your restaurant"
      subtitle="Name, brand colour, and logo for your booking page."
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
        <Field label="Restaurant / organization name">
          <input
            className={inputClass}
            value={value.organization_name}
            onChange={(e) => onChange({ ...value, organization_name: e.target.value })}
            placeholder="Casa Verde"
            autoFocus
          />
        </Field>

        <Field label="Brand colour">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ ...value, brand_color: c })}
                className={`size-9 rounded-full border-2 ${
                  value.brand_color === c ? "border-slate-900 scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
            <input
              type="color"
              value={value.brand_color ?? "#059669"}
              onChange={(e) => onChange({ ...value, brand_color: e.target.value })}
              className="size-9 rounded-full overflow-hidden cursor-pointer"
            />
          </div>
        </Field>

        <Field label="Logo (optional)" hint="PNG or JPG. Stored under org/{id}/…">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="block w-full text-sm text-slate-600"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && onLogoFile) onLogoFile(f);
            }}
          />
          {value.logo_path && (
            <p className="text-xs text-emerald-700 mt-1">Logo ready: {value.logo_path}</p>
          )}
        </Field>
      </div>
    </WizardShell>
  );
}
