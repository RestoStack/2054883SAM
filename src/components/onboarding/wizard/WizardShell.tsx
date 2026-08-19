import type { ReactNode } from "react";
import { STEP_ORDER, type OnboardingStepId } from "@/lib/schemas/onboarding";

const LABELS: Record<OnboardingStepId, string> = {
  welcome: "Welcome",
  organization: "Restaurant",
  location: "Location",
  tables: "Tables",
  booking: "Booking",
  team: "Team",
  done: "Done",
};

export function WizardShell({
  step,
  title,
  subtitle,
  children,
  footer,
  error,
}: {
  step: OnboardingStepId;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
  error?: string | null;
}) {
  const idx = STEP_ORDER.indexOf(step);
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_45%,_#ffffff_100%)] text-slate-900">
      <header className="mx-auto max-w-2xl px-4 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold tracking-tight text-lg">RestoStack</span>
          <span className="text-xs text-slate-500">
            Step {Math.min(idx + 1, 7)} of 7
          </span>
        </div>
        <ol className="mt-4 flex gap-1">
          {STEP_ORDER.map((s, i) => (
            <li
              key={s}
              title={LABELS[s]}
              className={`h-1.5 flex-1 rounded-full ${
                i <= idx ? "bg-emerald-600" : "bg-slate-200"
              }`}
            />
          ))}
        </ol>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-24">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {children}
          {error && (
            <p className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">{footer}</div>
      </main>
    </div>
  );
}

export function WizardPrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function WizardSecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";
