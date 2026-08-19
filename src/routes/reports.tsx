import { createFileRoute, redirect } from "@tanstack/react-router";

/** Reports rebuilt on the reservation rollups (Phase 5). */
export const Route = createFileRoute("/reports")({
  beforeLoad: () => {
    throw redirect({ to: "/app/reports" });
  },
  component: () => null,
});
