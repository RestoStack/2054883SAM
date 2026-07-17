import { useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const GREEN = "#39D400";

const BEST_TIMES = [
  "Morning (9am–12pm)",
  "Afternoon (12pm–5pm)",
  "Evening (5pm–8pm)",
  "Anytime",
] as const;

type DemoForm = {
  name: string;
  email: string;
  phone: string;
  restaurant: string;
  best_time: string;
};

const emptyForm: DemoForm = {
  name: "",
  email: "",
  phone: "",
  restaurant: "",
  best_time: "",
};

type DemoRequestDialogProps = {
  trigger: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DemoRequestDialog({ trigger, open, onOpenChange }: DemoRequestDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  const setDialogOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) {
      // Reset after close animation settles
      window.setTimeout(() => {
        setForm(emptyForm);
        setSubmitted(false);
        setError(null);
        setSubmitting(false);
      }, 200);
    }
  };

  const [form, setForm] = useState<DemoForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldClass =
    "mt-1 min-h-[44px] w-full rounded-lg bg-transparent text-sm outline-none placeholder:text-zinc-400";

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-zinc-200 bg-white sm:max-w-md">
        {submitted ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12" style={{ color: GREEN }} />
            <DialogHeader className="mt-4 space-y-2">
              <DialogTitle className="font-serif text-2xl">Thanks — we&apos;ll reach out</DialogTitle>
              <DialogDescription className="text-base text-zinc-600">
                Once your details are in, our team will contact you to set up a personalized demo.
              </DialogDescription>
            </DialogHeader>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              style={{ background: GREEN }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Try the demo</DialogTitle>
              <DialogDescription className="text-zinc-600">
                Tell us a bit about your restaurant and we&apos;ll reach out to walk you through RestoStack.
              </DialogDescription>
            </DialogHeader>
            <form
              className="mt-2 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (submitting) return;
                setError(null);
                setSubmitting(true);
                const { error: insertError } = await supabase.from("waitlist_signups").insert({
                  name: form.name.trim(),
                  email: form.email.trim(),
                  phone: form.phone.trim(),
                  restaurant: form.restaurant.trim(),
                  best_time: form.best_time.trim(),
                  source: "demo_request",
                });
                setSubmitting(false);
                if (insertError) {
                  setError("Something went wrong. Please check your details and try again.");
                  return;
                }
                setSubmitted(true);
              }}
            >
              {(
                [
                  { k: "name", l: "Name", p: "Jane Doe", type: "text", autoComplete: "name", max: 120 },
                  {
                    k: "email",
                    l: "Email",
                    p: "you@restaurant.com",
                    type: "email",
                    autoComplete: "email",
                    max: 255,
                  },
                  {
                    k: "phone",
                    l: "Phone number",
                    p: "(555) 123-4567",
                    type: "tel",
                    autoComplete: "tel",
                    max: 40,
                  },
                  {
                    k: "restaurant",
                    l: "Name of restaurant",
                    p: "Your restaurant name",
                    type: "text",
                    autoComplete: "organization",
                    max: 160,
                  },
                ] as const
              ).map((f) => (
                <label key={f.k} className="block rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{f.l}</span>
                  <input
                    type={f.type}
                    required
                    maxLength={f.max}
                    autoComplete={f.autoComplete}
                    placeholder={f.p}
                    value={form[f.k]}
                    onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                    className={fieldClass}
                  />
                </label>
              ))}

              <label className="block rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Best time to reach you
                </span>
                <select
                  required
                  value={form.best_time}
                  onChange={(e) => setForm({ ...form, best_time: e.target.value })}
                  className={`${fieldClass} text-black`}
                >
                  <option value="" disabled>
                    Select a time
                  </option>
                  {BEST_TIMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              {error && <p className="text-center text-xs text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-70"
                style={{ background: GREEN }}
              >
                {submitting ? (
                  "Submitting…"
                ) : (
                  <>
                    Request a demo <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-zinc-500">
                Once completed, we&apos;ll reach out to schedule your walkthrough.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
