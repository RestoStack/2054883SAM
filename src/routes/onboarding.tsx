import { createFileRoute, redirect } from "@tanstack/react-router";

/** /onboarding → resume at step 1; step page loads last_step and redirects if needed. */
export const Route = createFileRoute("/onboarding")({
  beforeLoad: () => {
    throw redirect({ to: "/onboarding/$step", params: { step: "1" } });
  },
});
