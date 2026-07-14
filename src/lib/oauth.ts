import { lovable } from "@/integrations/lovable";
import type { PlanId } from "@/lib/plans";
import { saveSelectedPlan } from "@/lib/plans";

export function oauthCallbackUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/auth/callback`;
}

export async function signInWithGoogle(plan?: PlanId) {
  if (plan) saveSelectedPlan(plan);
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: oauthCallbackUrl(),
  });
  if (result?.error) {
    throw result.error instanceof Error
      ? result.error
      : new Error((result.error as { message?: string })?.message || "Google sign-in failed");
  }
  return result;
}
