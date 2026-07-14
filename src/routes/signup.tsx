import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create your restaurant — RestoStack" }] }),
  component: SignupPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function SignupPage() {
  const navigate = useNavigate();
  const { refreshStaff } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (!restaurantName.trim()) return setError("Restaurant name is required.");
    setBusy(true);
    try {
      // 1) create auth user (or recover if already registered)
      const { data: signUp, error: suErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });

      if (suErr) {
        const msg = (suErr as { message?: string })?.message ?? "";
        if (/already|registered|exists/i.test(msg)) {
          // Try signing in with provided password to recover partial signup
          const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
          if (siErr) {
            const sm = (siErr as { message?: string })?.message ?? "Could not sign in with that email/password.";
            throw new Error(`This email is already registered. ${sm}`);
          }
        } else {
          throw suErr;
        }
      } else if (!signUp.session) {
        // Email confirmations on — sign in immediately
        const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
        if (siErr) throw siErr;
      }

      // 2) create restaurant + admin staff row
      const { data, error: rpcErr } = await supabase.rpc("v2_signup_create_restaurant", {
        _restaurant_name: restaurantName,
        _slug: slugify(restaurantName),
        _city: city,
        _full_name: fullName,
      });
      if (rpcErr) throw rpcErr;

      await refreshStaff();
      const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : (data as Record<string, unknown> | null);
      const slug = (row?.out_slug ?? row?.slug) as string | undefined;
      toast.success("Restaurant created!", { description: slug ? `Public slug: ${slug}` : undefined });
      navigate({ to: "/onboarding", replace: true });
    } catch (err: unknown) {
      const e = err as { message?: string; error_description?: string; hint?: string; details?: string };
      const msg = e?.message || e?.error_description || e?.details || e?.hint || (typeof err === "string" ? err : "Something went wrong. Please try again.");
      setError(msg);
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-success text-success-foreground">
              <Utensils className="size-5" />
            </span>
            RestoStack
          </div>
          <h1 className="mt-4 text-2xl font-bold">Create your restaurant</h1>
          <p className="text-sm text-muted-foreground mt-1">Free trial · no credit card required</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <Field label="Your full name" value={fullName} onChange={setFullName} required autoComplete="name" />
          <Field label="Work email" value={email} onChange={setEmail} type="email" required autoComplete="email" />
          <div>
            <Field label="Password" value={password} onChange={setPassword} type="password" required autoComplete="new-password" />
            <p className="mt-1 text-[11px] text-muted-foreground">Use a stronger password (avoid common ones like password123).</p>
          </div>
          <Field label="Restaurant name" value={restaurantName} onChange={setRestaurantName} required placeholder="Nonna's Kitchen" />
          <Field label="City / neighborhood" value={city} onChange={setCity} placeholder="Brooklyn, NY" />

          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />} Create restaurant
          </button>

          <p className="text-xs text-center text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}{required && " *"}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-success/40"
      />
    </label>
  );
}
