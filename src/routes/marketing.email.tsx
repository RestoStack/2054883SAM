import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyTenantState } from "@/components/EmptyTenantState";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/marketing/email")({
  head: () => ({ meta: [{ title: "Email Marketing — RestoStack" }] }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <PageHeader
        title="Email Marketing"
        description="Data for this restaurant only — no sample metrics."
        icon={Megaphone}
      />
      <div className="p-4 lg:p-5">
        <EmptyTenantState title="No email marketing data yet" description="No email campaigns yet for this restaurant." />
      </div>
    </AppShell>
  );
}
