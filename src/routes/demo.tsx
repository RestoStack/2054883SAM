import { createFileRoute, redirect } from "@tanstack/react-router";
import { isDemoAccessEnabled } from "@/lib/ship-mode";

/**
 * Convenience entry for the Italian Bistro sample restaurant.
 * Disabled when ship mode is invite-only (demo access off).
 */
export const Route = createFileRoute("/demo")({
  beforeLoad: () => {
    if (!isDemoAccessEnabled()) {
      throw redirect({ to: "/" });
    }
    throw redirect({ to: "/admin-login" });
  },
});
