import { supabase } from "@/integrations/supabase/client";
import type { PlanId } from "@/lib/plans";
import { saveSelectedPlan } from "@/lib/plans";

/** OAuth redirect target — must be allowlisted in your Supabase Auth settings. */
export function oauthCallbackUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/auth/callback`;
}

/**
 * Native Supabase Google OAuth (no Lovable broker).
 * Enable Google under Supabase → Authentication → Providers, then add
 * `{origin}/auth/callback` to Redirect URLs.
 */
export async function signInWithGoogle(plan?: PlanId) {
  if (plan) saveSelectedPlan(plan);
  const redirectTo = oauthCallbackUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  if (error) throw error;
  return data;
}
