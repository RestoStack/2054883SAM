import { createFileRoute, redirect } from "@tanstack/react-router";

/** Guests moved to the Guest CRM (Phase 4). */
export const Route = createFileRoute("/customers")({
  beforeLoad: () => {
    throw redirect({ to: "/app/guests" });
  },
  component: () => null,
});
