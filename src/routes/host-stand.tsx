import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/host-stand")({
  component: () => <Navigate to="/app/host" replace />,
});
