import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Convenience entry for the Italian Bistro sample restaurant.
 * Sends visitors to the one-click demo login.
 */
export const Route = createFileRoute("/demo")({
  beforeLoad: () => {
    throw redirect({ to: "/admin-login" });
  },
});
