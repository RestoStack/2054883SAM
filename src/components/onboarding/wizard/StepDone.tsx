import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { WizardPrimaryButton, WizardShell } from "./WizardShell";

export function StepDone({
  bookingPath,
  onFinish,
  busy,
  error,
}: {
  bookingPath: string | null;
  onFinish: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://restostacks.com";
  const url = bookingPath ? `${origin}${bookingPath}` : null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <WizardShell
      step="done"
      title="You’re live"
      subtitle="Share your public booking link, then jump into the app."
      error={error}
      footer={
        <>
          <span />
          <WizardPrimaryButton disabled={busy} onClick={onFinish}>
            {busy ? "Opening…" : "Go to app"}
          </WizardPrimaryButton>
        </>
      }
    >
      <div className="space-y-4 text-center">
        <div className="mx-auto size-14 rounded-full bg-emerald-500/15 grid place-items-center">
          <Check className="size-7 text-emerald-700" />
        </div>
        {url ? (
          <>
            <p className="text-sm text-slate-600">Public booking page</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm break-all">
              {url}
            </div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => void copy()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
              >
                <Copy className="size-3.5" />
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
              >
                <ExternalLink className="size-3.5" /> Open
              </a>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            Booking link will appear once your location slug is set.
          </p>
        )}
      </div>
    </WizardShell>
  );
}
