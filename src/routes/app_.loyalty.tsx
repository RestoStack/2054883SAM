import { createFileRoute } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { AppFeaturePage } from "@/components/layout/AppFeaturePage";

export const Route = createFileRoute("/app_/loyalty")({
  head: () => ({ meta: [{ title: "Fidélité — RestoStack" }] }),
  component: () => (
    <AppFeaturePage
      title="Fidélité"
      description="Loyalty points and rewards will appear here. Guest profiles and visit history are already available under Clients."
      icon={Gift}
      primaryTo="/app/guests"
      primaryLabel="Open Clients"
    />
  ),
});
