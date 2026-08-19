import { createFileRoute, redirect } from "@tanstack/react-router";

/** Calendar lives under Reservations (Phase 2). */
export const Route = createFileRoute("/calendar")({
  beforeLoad: () => {
    throw redirect({ to: "/app/reservations" });
  },
  component: () => null,
});
