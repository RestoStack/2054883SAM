import { supabase } from "@/integrations/supabase/client";
import type { PlanId } from "@/lib/plans";
import { saveSelectedPlan } from "@/lib/plans";

/** OAuth redirect target — must be allowlisted in Supabase Auth → URL Configuration. */
export function oauthCallbackUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/auth/callback`;
}

/**
 * Native Supabase Google OAuth (no Lovable broker).
 *
 * Required in Supabase Dashboard → Authentication → URL Configuration:
 * - Site URL: your primary app origin (e.g. https://restostacks.com)
 * - Redirect URLs must include:
 *   - https://restostacks.com/auth/callback
 *   - https://app.restostacks.com/auth/callback (if used)
 *   - http://localhost:5173/auth/callback
 *   - https://*-restostacks-projects.vercel.app/auth/callback  (or disable Vercel Deployment Protection)
 *
 * Vercel Deployment Protection (SSO) blocks Google’s return to /auth/callback on
 * preview URLs — use the public production domain for signup until protection is off.
 */
export async function signInWithGoogle(plan?: PlanId) {
  if (plan) saveSelectedPlan(plan);
  const redirectTo = oauthCallbackUrl();
  if (!redirectTo) throw new Error("OAuth redirect URL unavailable");

  // Fail fast when Google Client Secret is missing in Supabase.
  try {
    const base = (await import("@/integrations/supabase/config")).getSupabaseUrl();
    const key = (await import("@/integrations/supabase/config")).getSupabasePublishableKey();
    const probeUrl = `${base}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
    const probe = await fetch(probeUrl, {
      method: "GET",
      redirect: "manual",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (probe.status === 400) {
      const body = await probe.text();
      if (/missing OAuth secret|Unsupported provider/i.test(body)) {
        throw new Error("Unsupported provider: missing OAuth secret");
      }
    }
  } catch (e) {
    if (e instanceof Error && /missing OAuth secret/i.test(e.message)) throw e;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });
  if (error) throw error;
  if (!data?.url) {
    throw new Error(
      "Google sign-in did not return a URL. Check that Google is enabled in Supabase Auth → Providers.",
    );
  }

  window.location.assign(data.url);
  return data;
}
