import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { Field, inputClass, WizardPrimaryButton, WizardShell } from "./WizardShell";

export function StepDone({
  slug,
  onSlugChange,
  onCheckSlug,
  slugAvailable,
  onBack,
  onFinish,
  busy,
  error,
}: {
  slug: string;
  onSlugChange: (slug: string) => void;
  onCheckSlug: () => Promise<void>;
  slugAvailable: boolean | null;
  onBack: () => void;
  onFinish: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);

  const bookingUrl = useMemo(() => {
    const host =
      typeof window !== "undefined" ? window.location.host : "book.restostacks.com";
    // Prefer book subdomain when on app; fall back to current origin /book/:slug
    if (host.startsWith("app.") || host.includes("localhost") || host.includes("vercel.app")) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      return `${origin}/book/${slug || "…"}`;
    }
    return `https://book.restostacks.com/${slug || "…"}`;
  }, [slug]);

  const embed = useMemo(
    () =>
      `<iframe src="${bookingUrl}" title="Book a table" width="100%" height="720" style="border:0;border-radius:12px;" loading="lazy"></iframe>`,
    [bookingUrl],
  );

  const qrSrc = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(bookingUrl)}`,
    [bookingUrl],
  );

  const copy = async (kind: "link" | "embed", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <WizardShell
      step={7}
      title="Your booking link"
      subtitle="Share with guests, add to Google Business Profile, or embed on your site."
      error={error}
      onBack={onBack}
      footer={
        <WizardPrimaryButton
          disabled={busy || !slug || slugAvailable === false}
          onClick={onFinish}
        >
          {busy ? "Finishing…" : "Go to dashboard"}
        </WizardPrimaryButton>
      }
    >
      <div className="space-y-5">
        <div className="mx-auto size-12 rounded-full bg-emerald-500/15 grid place-items-center">
          <Check className="size-6 text-emerald-700" />
        </div>

        <Field label="Booking slug">
          <div className="flex flex-wrap gap-2">
            <input
              className={`${inputClass} font-mono`}
              value={slug}
              onChange={(e) =>
                onSlugChange(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                    .replace(/-+/g, "-")
                    .slice(0, 64),
                )
              }
            />
            <button
              type="button"
              onClick={() => void onCheckSlug()}
              className="h-11 rounded-xl border border-stone-200 px-3 text-sm font-semibold"
            >
              Check
            </button>
          </div>
          {slugAvailable === true && (
            <span className="mt-1 block text-xs text-emerald-700">Slug is available.</span>
          )}
          {slugAvailable === false && (
            <span className="mt-1 block text-xs text-rose-600">Slug is taken — try another.</span>
          )}
        </Field>

        <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-3 font-mono text-sm break-all">
          {bookingUrl}
        </div>
        <button
          type="button"
          onClick={() => void copy("link", bookingUrl)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold"
        >
          <Copy className="size-3.5" />
          {copied === "link" ? "Copied" : "Copy link"}
        </button>

        <div className="flex flex-wrap items-start gap-6">
          <div>
            <div className="text-sm font-semibold text-stone-800">QR code</div>
            <img
              src={qrSrc}
              alt="Booking QR code"
              className="mt-2 h-[180px] w-[180px] rounded-xl border bg-white p-2"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="text-sm font-semibold text-stone-800">
              Add to Google Business Profile
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-500">
              <li>Open your Google Business Profile</li>
              <li>Edit website / appointment link</li>
              <li>Paste your booking URL</li>
              <li>Save</li>
            </ol>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-stone-800">Website embed</div>
          <pre className="overflow-x-auto rounded-xl bg-stone-100 p-3 text-xs">{embed}</pre>
          <button
            type="button"
            onClick={() => void copy("embed", embed)}
            className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold"
          >
            {copied === "embed" ? "Copied" : "Copy embed snippet"}
          </button>
        </div>
      </div>
    </WizardShell>
  );
}
