import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — Phase 1 uses /billing/setup. */
export const Route = createFileRoute("/billing/checkout")({
  beforeLoad: () => {
    throw redirect({ to: "/billing/setup" });
  },
  component: () => null,
});
