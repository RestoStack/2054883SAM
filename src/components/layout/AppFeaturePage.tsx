import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

/** Selectable surface for mockup nav items that aren't full POS modules yet. */
export function AppFeaturePage({
  title,
  description,
  icon,
  primaryTo = "/app/host",
  primaryLabel = "Open Host Stand",
  secondaryTo = "/app/dashboard",
  secondaryLabel = "Dashboard",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  primaryTo?: string;
  primaryLabel?: string;
  secondaryTo?: string;
  secondaryLabel?: string;
}) {
  return (
    <AppShell>
      <PageHeader title={title} description={description} icon={icon} />
      <div className="p-5 lg:p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="h-11 font-semibold">
              <Link to={primaryTo}>{primaryLabel}</Link>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <Link to={secondaryTo}>{secondaryLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
