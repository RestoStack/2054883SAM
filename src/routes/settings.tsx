import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  Clock,
  CreditCard,
  LayoutGrid,
  MapPin,
  BookOpen,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsProfile } from "@/components/settings/SettingsProfile";
import { SettingsHours } from "@/components/settings/SettingsHours";
import { SettingsLocations } from "@/components/settings/SettingsLocations";
import { SettingsTeam } from "@/components/settings/SettingsTeam";
import { SettingsBilling } from "@/components/settings/SettingsBilling";
import { SettingsTables } from "@/components/settings/SettingsTables";
import { SettingsMenu } from "@/components/settings/SettingsMenu";
import { useAuth } from "@/lib/auth";

type SectionId = "profile" | "hours" | "locations" | "team" | "billing" | "tables" | "menu";

type SettingsSearch = { section?: string };

export const Route = createFileRoute("/settings")({
  validateSearch: (s: Record<string, unknown>): SettingsSearch => ({
    section: typeof s.section === "string" ? s.section : undefined,
  }),
  head: () => ({ meta: [{ title: "Settings — RestoStack" }] }),
  component: SettingsPage,
});

const SECTIONS: {
  id: SectionId;
  label: string;
  icon: typeof Building2;
  ownerOnly?: boolean;
  managerOnly?: boolean;
}[] = [
  { id: "profile", label: "Profile", icon: Building2 },
  { id: "hours", label: "Hours", icon: Clock },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "tables", label: "Tables & booking", icon: LayoutGrid },
  { id: "menu", label: "Menu", icon: BookOpen, managerOnly: true },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard, ownerOnly: true },
];

function SettingsPage() {
  const { org } = useAuth();
  const search = Route.useSearch();
  const initial =
    search.section && SECTIONS.some((s) => s.id === search.section)
      ? (search.section as SectionId)
      : "profile";
  const [active, setActive] = useState<SectionId>(initial);
  const isOwner = org.role === "owner" || !org.available;
  const isManager = isOwner || org.role === "manager";

  useEffect(() => {
    if (search.section && SECTIONS.some((s) => s.id === search.section)) {
      setActive(search.section as SectionId);
    }
  }, [search.section]);

  const visible = SECTIONS.filter(
    (s) => (!s.ownerOnly || isOwner) && (!s.managerOnly || isManager),
  );

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Profile, hours, locations, team, and billing."
        icon={SettingsIcon}
      />
      <div className="p-4 lg:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          <aside className="rounded-xl border border-border bg-card p-2 h-fit">
            <ul className="space-y-0.5">
              {visible.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setActive(s.id)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active === s.id
                          ? "bg-accent text-primary"
                          : "text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <Icon className="size-4" />
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="rounded-xl border border-border bg-card p-6">
            {active === "profile" && <SettingsProfile />}
            {active === "hours" && <SettingsHours />}
            {active === "locations" && <SettingsLocations />}
            {active === "team" && <SettingsTeam />}
            {active === "billing" && <SettingsBilling />}
            {active === "tables" && <SettingsTables />}
            {active === "menu" && <SettingsMenu />}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
