import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyTenantState } from "@/components/EmptyTenantState";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/product-analytics")({
  head: () => ({ meta: [{ title: "Product Analytics — RestoStack" }] }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Product Analytics"
        description="Data for this restaurant only — no sample metrics."
        icon={Megaphone}
      />
      <div className="p-4 lg:p-5">
        <EmptyTenantState title="No product analytics data yet" description="Item and upsell analytics appear once this restaurant records orders." />
      </div>
    </AppShell>
  );
}
