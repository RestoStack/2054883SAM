import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/book")({
  beforeLoad: () => {
    throw redirect({ to: "/book/$slug", params: { slug: "italian-bistro" } });
  },
});
