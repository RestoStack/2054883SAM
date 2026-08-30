import { createFileRoute } from "@tanstack/react-router";
import { Smartphone } from "lucide-react";
import { AppFeaturePage } from "@/components/layout/AppFeaturePage";

export const Route = createFileRoute("/app_/server")({
  head: () => ({ meta: [{ title: "Server Pad — RestoStack" }] }),
  component: () => (
    <AppFeaturePage
      title="Server Pad"
      description="Server Pad is available from this menu. Staff sign in with Google or email — no PIN. Use Host Stand for seating and table status during service."
      icon={Smartphone}
      primaryTo="/app/host"
      primaryLabel="Open Host Stand"
      secondaryTo="/app/reservations"
      secondaryLabel="Reservations"
    />
  ),
});
