import { useState } from "react";
import { Field, inputClass, WizardPrimaryButton, WizardShell } from "./WizardShell";
import type { MenuStepInput } from "@/lib/schemas/onboarding";

const SAMPLE_ITEMS = [
  { name: "Soup of the day", description: "Seasonal", price_cents: 900, category: "Starters" },
  { name: "House salad", description: "", price_cents: 1200, category: "Starters" },
  { name: "Steak frites", description: "AAA striploin", price_cents: 4200, category: "Mains" },
  { name: "Catch of the day", description: "Market price", price_cents: 3800, category: "Mains" },
  { name: "Chocolate mousse", description: "", price_cents: 1100, category: "Desserts" },
];

export function StepMenu({
  value,
  onChange,
  onBack,
  onContinue,
  onSkip,
  busy,
  error,
}: {
  value: MenuStepInput;
  onChange: (v: MenuStepInput) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [extracting, setExtracting] = useState(false);

  const runStubExtract = async () => {
    setExtracting(true);
    await new Promise((r) => window.setTimeout(r, 700));
    onChange({
      ...value,
      mode: value.link ? "link" : "upload",
      items: SAMPLE_ITEMS,
    });
    setExtracting(false);
  };

  return (
    <WizardShell
      step={5}
      title="Menu"
      subtitle="Upload a PDF/image, paste a link, or add manually. Used on your public page."
      error={error}
      onBack={onBack}
      onSkip={onSkip}
      canSkip
      footer={
        <WizardPrimaryButton disabled={busy} onClick={onContinue}>
          {busy ? "Saving…" : "Continue"}
        </WizardPrimaryButton>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["upload", "link", "manual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...value, mode: m })}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold capitalize ${
                value.mode === m
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-stone-200 text-stone-600"
              }`}
            >
              {m === "upload" ? "Upload" : m === "link" ? "Paste link" : "Add manually"}
            </button>
          ))}
        </div>

        {value.mode === "upload" && (
          <Field label="PDF or image">
            <input
              type="file"
              accept="image/*,application/pdf"
              className={inputClass}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onChange({ ...value, notes: f.name, mode: "upload" });
              }}
            />
          </Field>
        )}

        {value.mode === "link" && (
          <Field label="Menu URL">
            <input
              type="url"
              className={inputClass}
              placeholder="https://"
              value={value.link ?? ""}
              onChange={(e) => onChange({ ...value, link: e.target.value, mode: "link" })}
            />
          </Field>
        )}

        {(value.mode === "upload" || value.mode === "link") && (
          <button
            type="button"
            disabled={extracting}
            onClick={() => void runStubExtract()}
            className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {extracting ? "Extracting…" : "Extract with AI (preview)"}
          </button>
        )}

        {(value.mode === "manual" || value.items.length > 0) && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-stone-800">Review items</div>
            {value.items.map((item, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-xl border border-stone-100 p-3 sm:grid-cols-[1fr_1fr_100px]"
              >
                <input
                  className={inputClass}
                  value={item.name}
                  placeholder="Item"
                  onChange={(e) => {
                    const items = [...value.items];
                    items[idx] = { ...item, name: e.target.value };
                    onChange({ ...value, items, mode: "manual" });
                  }}
                />
                <input
                  className={inputClass}
                  value={item.category}
                  placeholder="Category"
                  onChange={(e) => {
                    const items = [...value.items];
                    items[idx] = { ...item, category: e.target.value };
                    onChange({ ...value, items });
                  }}
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputClass}
                  value={(item.price_cents / 100).toFixed(2)}
                  onChange={(e) => {
                    const items = [...value.items];
                    items[idx] = {
                      ...item,
                      price_cents: Math.round((Number(e.target.value) || 0) * 100),
                    };
                    onChange({ ...value, items });
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="text-xs font-semibold text-emerald-700"
              onClick={() =>
                onChange({
                  ...value,
                  mode: "manual",
                  items: [
                    ...value.items,
                    { name: "", description: "", price_cents: 0, category: "Mains" },
                  ],
                })
              }
            >
              + Add item
            </button>
          </div>
        )}

        <p className="text-xs text-stone-400">
          MVP: AI extraction returns a reviewable sample. Real parser ships later.
        </p>
      </div>
    </WizardShell>
  );
}
