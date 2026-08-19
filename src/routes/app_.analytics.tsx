import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app_/analytics")({
  head: () => ({ meta: [{ title: "Analytique — RestoStack" }] }),
  component: () => <Navigate to="/app/reports" replace />,
});
