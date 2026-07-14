import { supabase } from "@/integrations/supabase/client";
import type { PlanId } from "@/lib/plans";
import { saveSelectedPlan } from "@/lib/plans";

export function oauthCallbackUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/auth/callback`;
}

export async function signInWithGoogle(plan?: PlanId) {
  if (plan) saveSelectedPlan(plan);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: oauthCallbackUrl(),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error) throw error;
}
