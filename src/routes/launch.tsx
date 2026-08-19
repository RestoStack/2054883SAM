import { createFileRoute } from "@tanstack/react-router";
import { LaunchLanding } from "@/components/LaunchLanding";

/** Always shows the ready-for-launch homepage variation (preview / bookmark). */
export const Route = createFileRoute("/launch")({
  head: () => ({
    meta: [
      { title: "RestoStack — Launch" },
      {
        name: "description",
        content: "RestoStack invite-only launch. Request a demo to get your restaurant onboarded.",
      },
    ],
  }),
  component: LaunchLanding,
});
