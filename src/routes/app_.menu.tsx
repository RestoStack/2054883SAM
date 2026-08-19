import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app_/menu")({
  head: () => ({ meta: [{ title: "Menu — RestoStack" }] }),
  component: () => <Navigate to="/settings" search={{ section: "menu" }} replace />,
});
