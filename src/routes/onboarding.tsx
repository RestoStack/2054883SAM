import { createFileRoute, redirect } from "@tanstack/react-router";

/** Exact /onboarding → step 1. Step pages live at /onboarding_/$step (flat) so this
 *  redirect never runs for /onboarding/1…7 (that nesting caused an infinite 307). */
export const Route = createFileRoute("/onboarding")({
  beforeLoad: () => {
    throw redirect({ to: "/onboarding/$step", params: { step: "1" } });
  },
});
