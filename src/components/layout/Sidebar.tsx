import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  ChevronRight,
  ClipboardList,
  Menu,
  Grid3x3,
  ShoppingBag,
  Smartphone,
  Gift,
  Megaphone,
  BookOpen,
  LineChart,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import logo from "@/assets/logo.png";
import { CommandPaletteTrigger } from "@/components/CommandPalette";
import { RoleSwitcher, useRole, type Role } from "@/lib/role";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useI18n, type MessageKey } from "@/lib/i18n";

type NavItem = {
  to: string;
  labelKey: MessageKey;
  icon: typeof LayoutDashboard;
  search?: Record<string, string>;
};

type NavSection = { labelKey?: "nav.ops" | "nav.clients" | "nav.manage"; items: NavItem[] };

/** Full FoH mockup nav — every item is a real selectable route. */
const ADMIN_SECTIONS: NavSection[] = [
  { items: [{ to: "/app/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard }] },
  {
    labelKey: "nav.ops",
    items: [
      { to: "/app/reservations", labelKey: "nav.reservations", icon: CalendarDays },
      { to: "/app/host", labelKey: "nav.host", icon: ClipboardList },
      { to: "/floorplan", labelKey: "nav.floor", icon: Grid3x3 },
      { to: "/app/orders", labelKey: "nav.orders", icon: ShoppingBag },
      { to: "/app/server", labelKey: "nav.server", icon: Smartphone },
    ],
  },
  {
    labelKey: "nav.clients",
    items: [
      { to: "/app/guests", labelKey: "nav.guests", icon: Users },
      { to: "/app/loyalty", labelKey: "nav.loyalty", icon: Gift },
      { to: "/app/marketing", labelKey: "nav.marketing", icon: Megaphone },
    ],
  },
  {
    labelKey: "nav.manage",
    items: [
      { to: "/app/menu", labelKey: "nav.menu", icon: BookOpen },
      { to: "/app/analytics", labelKey: "nav.analytics", icon: LineChart },
      { to: "/app/reports", labelKey: "nav.reports", icon: BarChart3 },
      { to: "/settings", labelKey: "nav.settings", icon: Settings },
    ],
  },
];

const HOSTESS_SECTIONS: NavSection[] = [
  {
    labelKey: "nav.ops",
    items: [
      { to: "/app/host", labelKey: "nav.host", icon: ClipboardList },
      { to: "/app/reservations", labelKey: "nav.reservations", icon: CalendarDays },
      { to: "/floorplan", labelKey: "nav.floor", icon: Grid3x3 },
    ],
  },
  {
    labelKey: "nav.clients",
    items: [{ to: "/app/guests", labelKey: "nav.guests", icon: Users }],
  },
];

const SERVER_SECTIONS: NavSection[] = [
  {
    labelKey: "nav.ops",
    items: [
      { to: "/app/host", labelKey: "nav.host", icon: ClipboardList },
      { to: "/app/server", labelKey: "nav.server", icon: Smartphone },
      { to: "/app/reservations", labelKey: "nav.reservations", icon: CalendarDays },
    ],
  },
];

function sectionsForRole(role: Role): NavSection[] {
  if (role === "admin") return ADMIN_SECTIONS;
  if (role === "hostess") return HOSTESS_SECTIONS;
  return SERVER_SECTIONS;
}

function navForRole(role: Role): NavItem[] {
  return sectionsForRole(role).flatMap((s) => s.items);
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role } = useRole();
  const { t, locale, setLocale } = useI18n();
  const sections = sectionsForRole(role);

  return (
    <>
      <div className="flex items-center justify-center px-2 h-24 lg:h-36 overflow-hidden shrink-0">
        <Link to="/app/dashboard" onClick={onNavigate} title="Dashboard">
          <img src={logo} alt="RestoStack" className="h-[220px] lg:h-[320px] w-auto object-contain" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-4">
          {sections.map((section, si) => (
            <li key={si}>
              {section.labelKey && (
                <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {t(section.labelKey)}
                </div>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.to === "/"
                      ? pathname === "/"
                      : pathname === item.to || pathname.startsWith(`${item.to}/`);
                  return (
                    <li key={`${item.to}-${item.labelKey}`}>
                      <Link
                        to={item.to}
                        search={item.search as never}
                        onClick={onNavigate}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? "bg-emerald-500/15 text-emerald-700"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`}
                      >
                        <Icon className="size-4" />
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-3 shrink-0">
        <Link
          to="/settings"
          search={{ section: "billing" } as never}
          onClick={onNavigate}
          className="block rounded-xl bg-stone-900 px-3 py-3 text-white hover:bg-stone-800"
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Sparkles className="size-3.5 text-emerald-400" />
            {t("nav.upgradeTitle")}
          </div>
          <p className="mt-1 text-[11px] text-white/70 leading-snug">{t("nav.upgradeBody")}</p>
          <span className="mt-2 inline-flex h-8 items-center rounded-lg bg-emerald-500 px-3 text-[11px] font-bold">
            {t("nav.upgradeCta")}
          </span>
        </Link>

        <a
          href="mailto:support@restostacks.com?subject=RestoStack%20help"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <HelpCircle className="size-3.5" />
          {t("nav.help")}
        </a>

        <div className="flex gap-1 rounded-lg bg-sidebar-accent/40 p-0.5">
          {(["fr-CA", "en-CA"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              className={cn(
                "flex-1 rounded-md py-1.5 text-[10px] font-semibold",
                locale === l ? "bg-white text-stone-900 shadow-sm" : "text-sidebar-foreground/60",
              )}
            >
              {l === "fr-CA" ? "FR" : "EN"}
            </button>
          ))}
        </div>
        <RestaurantTile />
      </div>
    </>
  );
}

function RestaurantTile() {
  const { staff, org, refreshStaff } = useAuth();
  const [info, setInfo] = useState<{ name: string; city: string | null; logo_url: string | null } | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!staff) {
      setInfo(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("v2_restaurants")
        .select("name, city, logo_url")
        .eq("id", staff.restaurant_id)
        .maybeSingle();
      if (data) setInfo(data);
    })();
  }, [staff]);

  const name =
    org.memberships.find((m) => m.organization_id === org.activeOrganizationId)?.organization_name ??
    info?.name ??
    (staff ? "Your restaurant" : "RestoStack");
  const city = info?.city ?? (staff ? "—" : "");
  const multi = org.available && org.memberships.length > 1;

  const switchOrg = async (organizationId: string) => {
    if (organizationId === org.activeOrganizationId) return;
    setSwitching(true);
    const mem = org.memberships.find((m) => m.organization_id === organizationId);
    const { setActiveOrgContext } = await import("@/lib/org");
    await setActiveOrgContext({
      organizationId,
      locationId: mem?.location_id ?? null,
    });
    await refreshStaff();
    setSwitching(false);
  };

  return (
    <div className="space-y-2">
      <Link
        to="/settings"
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 text-left"
      >
        {info?.logo_url ? (
          <img src={info.logo_url} alt="" className="size-8 rounded-md object-cover shrink-0" />
        ) : (
          <div className="size-8 rounded-md bg-emerald-500/20 text-emerald-700 grid place-items-center text-xs font-bold shrink-0">
            {(name[0] ?? "R").toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-sidebar-foreground">{name}</div>
          <div className="truncate text-[10px] text-muted-foreground">{city}</div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
      </Link>
      {multi && (
        <div className="px-1 space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">Switch org</div>
          {org.memberships.map((m) => (
            <button
              key={m.organization_id}
              type="button"
              disabled={switching}
              onClick={() => void switchOrg(m.organization_id)}
              className={cn(
                "w-full rounded-md px-2 py-1.5 text-left text-xs",
                m.organization_id === org.activeOrganizationId
                  ? "bg-emerald-500/15 text-emerald-700 font-semibold"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground",
              )}
            >
              {m.organization_name ?? m.organization_id.slice(0, 8)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar sticky top-0 h-dvh">
      <SidebarBody />
    </aside>
  );
}

export function AppShell({
  children,
  fullBleed = false,
  immersive = false,
}: {
  children: ReactNode;
  fullBleed?: boolean;
  immersive?: boolean;
}) {
  const { role } = useRole();
  const [open, setOpen] = useState(false);
  const fillViewport = fullBleed || immersive;
  return (
    <div className={cn("flex bg-background", fillViewport ? "h-dvh overflow-hidden" : "min-h-screen")}>
      {!fullBleed && <Sidebar />}
      {fullBleed && (
        <aside className="hidden lg:flex w-14 shrink-0 flex-col border-r border-sidebar-border bg-sidebar sticky top-0 h-dvh items-center py-3 gap-2">
          <Link to="/app/dashboard" className="mb-2" title="Dashboard">
            <img src={logo} alt="RestoStack" className="h-8 w-8 object-contain" />
          </Link>
          {navForRole(role)
            .slice(0, 8)
            .map((item) => (
              <Link
                key={`${item.to}-${item.labelKey}`}
                to={item.to}
                title={item.labelKey}
                className="inline-flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <item.icon className="size-4" />
              </Link>
            ))}
        </aside>
      )}
      <main className={cn("flex-1 min-w-0", fillViewport ? "overflow-hidden flex flex-col" : "overflow-x-hidden")}>
        {!fullBleed && !immersive && (
          <>
            <div className="lg:hidden sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 backdrop-blur px-3 py-2">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <button
                    aria-label="Open menu"
                    className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent"
                  >
                    <Menu className="size-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 flex flex-col bg-sidebar">
                  <SidebarBody onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>
              <img src={logo} alt="RestoStack" className="h-7 w-auto" />
              <div className="ml-auto">
                <RoleSwitcher />
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 px-4 sm:px-8 pt-3 sm:pt-4">
              <div className="flex flex-1 justify-center">
                {role === "admin" && <CommandPaletteTrigger />}
              </div>
              <div className="ml-auto">
                <RoleSwitcher />
              </div>
            </div>
          </>
        )}
        {(fullBleed || immersive) && (
          <div className="lg:hidden shrink-0 flex items-center gap-2 border-b border-border bg-background px-3 py-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Open menu"
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card"
                >
                  <Menu className="size-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col bg-sidebar">
                <SidebarBody onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold">Host Stand</span>
            <div className="ml-auto">
              <RoleSwitcher />
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
