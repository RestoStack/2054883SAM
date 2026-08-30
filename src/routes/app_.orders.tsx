import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { AppFeaturePage } from "@/components/layout/AppFeaturePage";

export const Route = createFileRoute("/app_/orders")({
  head: () => ({ meta: [{ title: "Commandes — RestoStack" }] }),
  component: () => (
    <AppFeaturePage
      title="Commandes"
      description="Order tickets and kitchen flow will live here. For service tonight, use Host Stand to seat parties and track the floor."
      icon={ShoppingBag}
    />
  ),
});
