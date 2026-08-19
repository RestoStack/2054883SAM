import { createFileRoute, redirect } from "@tanstack/react-router";

/** Calendar lives under Bookings (Phase 2). */
export const Route = createFileRoute("/calendar")({
  beforeLoad: () => {
    throw redirect({ to: "/bookings", search: { view: "calendar" } });
  },
  component: () => null,
});
