import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createRestaurantForCurrentUser,
  isGoogleOAuthMisconfigured,
} from "@/lib/create-restaurant";
import { signInWithGoogle } from "@/lib/oauth";
import { isPlanId, PLANS, readSelectedPlan, saveSelectedPlan, type PlanId } from "@/lib/plans";
import { isPublicSignupEnabled } from "@/lib/ship-mode";
import { fetchSignupMode } from "@/lib/org";

type SignupSearch = { plan?: string };

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearch => ({
    plan: typeof search.plan === "string" ? search.plan : undefined,
  }),
  head: () => ({ meta: [{ title: "Create your account — RestoStack" }] }),
  component: SignupPage,
});

/** Yield so supabase-js can release its auth mutex before the next RPC. */
function yieldAuthLock(ms = 75) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function SignupPage() {
  const { plan: planParam } = Route.useSearch();
  const [plan, setPlan] = useState<PlanId>("starter");
  const [fullName, setFullName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [googleBroken, setGoogleBroken] = useState(false);
  const [modeLoading, setModeLoading] = useState(true);
  const [signupOpen, setSignupOpen] = useState(true);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isPublicSignupEnabled()) {
        if (!cancelled) {
          setSignupOpen(true);
          setModeLoading(false);
        }
        return;
      }
      try {
        const mode = await fetchSignupMode();
        if (!cancelled) setSignupOpen(mode === "open");
      } catch {
        if (!cancelled) setSignupOpen(true);
      }
      if (!cancelled) setModeLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isPlanId(planParam)) {
      saveSelectedPlan(planParam);
      setPlan(planParam);
    } else {
      setPlan(readSelectedPlan());
    }
  }, [planParam]);

  if (modeLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!signupOpen) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md rounded-2xl border bg-white p-6 text-center space-y-3">
          <h1 className="text-xl font-semibold">Signup is invite-only</h1>
          <p className="text-sm text-slate-500">
            Ask your RestoStack contact for an invite link, or open public signup in Supabase.
          </p>
          <Link to="/login" className="text-sm font-semibold text-emerald-700 underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const selected = PLANS.find((p) => p.id === plan) ?? PLANS[0];

  const goOnboarding = () => {
    // Hard navigation clears any React/auth listener loops that freeze the tab.
    window.location.assign("/onboarding/1");
  };

  const onGoogle = async () => {
    setError(null);
    setBusy("google");
    try {
      await signInWithGoogle(plan);
    } catch (e) {
      const msg = (e as Error).message || "Google sign-in failed.";
      if (isGoogleOAuthMisconfigured(msg)) {
        setGoogleBroken(true);
        setError(
          "Google is not configured in Supabase yet (missing OAuth client secret). Use email signup below.",
        );
      } else {
        setError(msg + " Try email signup below.");
      }
      setBusy(null);
    }
  };

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (inFlight.current || busy) return;
    inFlight.current = true;
    setBusy("email");
    saveSelectedPlan(plan);

    try {
      const { data: signUp, error: suErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName.trim(),
            restaurant_name: restaurantName.trim(),
          },
        },
      });

      if (suErr) {
        const msg = suErr.message ?? "";
        if (/already|registered|exists/i.test(msg)) {
          const { error: siErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (siErr) throw new Error(`This email is already registered. ${siErr.message}`);
        } else if (/weak|easy to guess|pwned/i.test(msg)) {
          throw new Error("Choose a stronger password (letters, numbers, and symbols).");
        } else {
          throw new Error(msg || "Sign up failed");
        }
      } else if (!signUp.session) {
        const { error: siErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (siErr) {
          throw new Error(
            "Check your email to confirm the account, then sign in. Or disable email confirmation in Supabase Auth.",
          );
        }
      }

      // Critical: release supabase-js auth lock before restaurant RPC.
      await yieldAuthLock(100);

      const full = fullName.trim() || email.split("@")[0] || "Owner";
      const restaurant =
        restaurantName.trim() || `${full.split(/\s+/)[0]}'s restaurant` || "My restaurant";

      const created = await createRestaurantForCurrentUser({
        restaurantName: restaurant,
        fullName: full,
        plan,
      });

      if (!created.ok && !created.needsMigration) {
        throw new Error(created.error);
      }

      goOnboarding();
      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      inFlight.current = false;
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_50%,_#ffffff_100%)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Utensils className="size-5" />
            </span>
            RestoStack
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">
            Plan: <span className="font-medium text-slate-800">{selected.name}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
          {!googleBroken && (
            <button
              type="button"
              onClick={() => void onGoogle()}
              disabled={!!busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60 shadow-sm"
            >
              {busy === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
              Sign up with Google
            </button>
          )}

          {googleBroken && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Google signup needs the OAuth client secret in Supabase. Use email below for now.
            </div>
          )}

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-xs text-slate-400">or use email</span>
            </div>
          </div>

          <form onSubmit={(e) => void onEmail(e)} className="space-y-3">
            <Field label="Your full name" value={fullName} onChange={setFullName} required autoComplete="name" />
            <Field
              label="Restaurant name"
              value={restaurantName}
              onChange={setRestaurantName}
              required
              autoComplete="organization"
            />
            <Field
              label="Work email"
              value={email}
              onChange={setEmail}
              type="email"
              required
              autoComplete="email"
            />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              required
              autoComplete="new-password"
            />

            {error && (
              <div className="rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2 border border-rose-100 whitespace-pre-wrap">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!!busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 hover:bg-emerald-500"
            >
              {busy === "email" && <Loader2 className="size-4 animate-spin" />}
              {busy === "email" ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-xs text-center text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-700 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      />
    </label>
  );
}
