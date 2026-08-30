import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * MVP: no public marketing site. Send visitors to login (or invite flow).
 */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RestoStack" },
      { name: "description", content: "Restaurant operations — invite only." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
