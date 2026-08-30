import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS, stepFromParam, stepMeta } from "@/lib/schemas/onboarding";

const GREEN = "#22C55E";

export function WizardPrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-50"
      style={{ backgroundColor: GREEN }}
    >
      {children}
    </button>
  );
}

export function WizardSecondaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 min-w-[100px] items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 disabled:opacity-50 hover:bg-stone-50"
    >
      {children}
    </button>
  );
}

export function WizardShell({
  step,
  title,
  subtitle,
  children,
  error,
  footer,
  onBack,
  onSkip,
  canSkip,
}: {
  step: number | string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  error?: string | null;
  footer?: React.ReactNode;
  onBack?: () => void;
  onSkip?: () => void;
  canSkip?: boolean;
}) {
  const stepNum = typeof step === "number" ? step : stepFromParam(String(step));
  const meta = stepMeta(stepNum);
  const pct = Math.round((stepNum / 7) * 100);

  return (
    <div className="min-h-dvh bg-[#F7F8FA]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/app" className="font-serif text-lg font-semibold text-stone-900">
            RestoStack
          </Link>
          <div className="text-xs font-medium text-stone-500">
            Step {stepNum} of 7 · {meta.title}
          </div>
        </div>
        <div className="h-1 w-full bg-stone-100">
          <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: GREEN }} />
        </div>
        <div className="mx-auto flex max-w-3xl gap-1 px-4 py-2">
          {WIZARD_STEPS.map((s) => (
            <div
              key={s.n}
              className={cn(
                "h-1 flex-1 rounded-full",
                s.n <= stepNum ? "bg-emerald-500" : "bg-stone-200",
              )}
            />
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-stone-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-stone-500">{subtitle}</p>}
        </div>

        <div className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          {children}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onBack && stepNum > 1 ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-medium text-stone-600 hover:bg-stone-100"
              >
                <ChevronLeft className="size-4" /> Back
              </button>
            ) : (
              <span />
            )}
            {canSkip && onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="h-11 rounded-xl px-3 text-sm font-medium text-stone-500 hover:text-stone-800"
              >
                Skip for now
              </button>
            )}
          </div>
          {footer}
        </div>
      </main>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-stone-600">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-stone-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30";
