import { createFileRoute, redirect } from "@tanstack/react-router";

/** Dashboard rebuilt on the reservation rollups (Phase 5). */
export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/app/dashboard" });
  },
  component: () => null,
});
