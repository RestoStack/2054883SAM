import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";

export const Route = createFileRoute("/payroll")({
  head: () => ({ meta: [{ title: "Payroll — RestoStack" }] }),
  component: () => (
    <AppShell>
      <PageHeader title="Payroll" description="Manage staff payroll and compensation" />
      <div className="p-5">
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Payroll dashboard coming soon.
        </div>
      </div>
    </AppShell>
  ),
});
