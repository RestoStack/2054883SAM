import { createFileRoute, redirect } from "@tanstack/react-router";

/** Guest profiles moved to the Guest CRM (Phase 4). */
export const Route = createFileRoute("/customers_/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/app/guests/$id", params: { id: params.id } });
  },
  component: () => null,
});
