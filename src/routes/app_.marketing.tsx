import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { AppFeaturePage } from "@/components/layout/AppFeaturePage";

export const Route = createFileRoute("/app_/marketing")({
  head: () => ({ meta: [{ title: "Marketing — RestoStack" }] }),
  component: () => (
    <AppFeaturePage
      title="Marketing"
      description="Campaign drafts and catch-back tools will live here. Export marketing-opted-in guests from Clients for email/SMS lists."
      icon={Megaphone}
      primaryTo="/app/guests"
      primaryLabel="Open Clients"
    />
  ),
});
