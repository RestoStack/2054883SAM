import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarDays, Users, BarChart3, UserCog, Settings, ChevronRight,
  ClipboardList, Menu,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import logo from "@/assets/logo.png";
import { CommandPaletteTrigger } from "@/components/CommandPalette";
import { RoleSwitcher, useRole, type Role } from "@/lib/role";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

/** MVP nav only — docs/ROUTES.md */
const ADMIN_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/host-stand", label: "Host Stand", icon: ClipboardList },
  { to: "/customers", label: "Guests", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/staff", label: "Team", icon: UserCog },
  { to: "/settings", label: "Settings", icon: Settings },
];

const HOSTESS_NAV: NavItem[] = [
  { to: "/host-stand", label: "Host Stand", icon: ClipboardList },
  { to: "/bookings", label: "Reservations", icon: CalendarDays },
  { to: "/customers", label: "Guests", icon: Users },
];

const SERVER_NAV: NavItem[] = [
  { to: "/host-stand", label: "Host Stand", icon: ClipboardList },
  { to: "/bookings", label: "Bookings", icon: CalendarDays },
];

function navForRole(role: Role): NavItem[] {
  if (role === "admin") return ADMIN_NAV;
  if (role === "hostess") return HOSTESS_NAV;
  return SERVER_NAV;
}
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role } = useRole();
  const nav = navForRole(role);

  return (
    <>
      <div className="flex items-center justify-center px-2 h-24 lg:h-36 overflow-hidden shrink-0">
        <img src={logo} alt="RestoStack" className="h-[220px] lg:h-[320px] w-auto object-contain" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-3 shrink-0">
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
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 text-left"
        disabled={switching}
      >
        {info?.logo_url ? (
          <img src={info.logo_url} alt="" className="size-8 rounded-md object-cover shrink-0" />
        ) : null}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span className="truncate">{name}</span>{" "}
            <span className="size-1.5 rounded-full bg-success shrink-0" />
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {org.role ? `${org.role} · ` : ""}
            {city}
          </div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
      </button>
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
                "w-full text-left rounded-md px-2 py-1.5 text-xs truncate",
                m.organization_id === org.activeOrganizationId
                  ? "bg-sidebar-accent font-semibold"
                  : "hover:bg-sidebar-accent/50 text-muted-foreground",
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

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar sticky top-0 h-screen">
      <SidebarBody />
    </aside>
  );
}

export function AppShell({
  children,
  fullBleed = false,
  /** Keep full sidebar but drop search chrome — Host Stand fills the workspace */
  immersive = false,
}: {
  children: ReactNode;
  /** Hide chrome padding for immersive pages like Host Stand */
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
          <Link to="/dashboard" className="mb-2" title="Dashboard">
            <img src={logo} alt="RestoStack" className="h-8 w-8 object-contain" />
          </Link>
          {navForRole(role).slice(0, 6).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
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
