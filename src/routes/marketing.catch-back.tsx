import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyTenantState } from "@/components/EmptyTenantState";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/marketing/catch-back")({
  head: () => ({ meta: [{ title: "Win Back Customers — RestoStack" }] }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Win Back Customers"
        description="Data for this restaurant only — no sample metrics."
        icon={Megaphone}
      />
      <div className="p-4 lg:p-5">
        <EmptyTenantState title="No win back customers data yet" description="No win-back campaigns yet. Guests who stop visiting will appear here once you have booking history." />
      </div>
    </AppShell>
  );
}
