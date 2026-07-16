import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarDays, ShoppingBag, Users, UtensilsCrossed,
  Megaphone, Award, BarChart3, UserCog, Network, Settings, ChevronRight,
  Sparkles, Mail, MessageSquare, UserPlus, Star, Tag, FileText, Share2, Wallet,
  Calendar, LineChart, ClipboardList, Utensils, Trophy, Menu,
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

const ADMIN_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/host-stand", label: "Host Stand", icon: ClipboardList },
  { to: "/server-app", label: "Server Pad", icon: Utensils },
  { to: "/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/floorplan", label: "Floor Plan", icon: Network },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/product-analytics", label: "Product Analytics", icon: LineChart },
  { to: "/marketing", label: "Marketing", icon: Megaphone },
  { to: "/loyalty", label: "Loyalty", icon: Award },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/staff", label: "Staff", icon: UserCog },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/payroll", label: "Payroll", icon: Wallet },
  { to: "/integrations", label: "Integrations", icon: Network },
  { to: "/settings", label: "Settings", icon: Settings },
];

const HOSTESS_NAV: NavItem[] = [
  { to: "/host-stand", label: "Host Stand", icon: ClipboardList },
  { to: "/bookings", label: "Reservations", icon: CalendarDays },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/customers", label: "Guests", icon: Users },
];

const SERVER_NAV: NavItem[] = [
  { to: "/server-app", label: "Order Pad", icon: Utensils },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/orders", label: "My Orders", icon: ShoppingBag },
];

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin: ADMIN_NAV,
  hostess: HOSTESS_NAV,
  server: SERVER_NAV,
};

const marketingActions = [
  { to: "/marketing/email", label: "Email Marketing", icon: Mail },
  { to: "/marketing/sms", label: "Send SMS", icon: MessageSquare },
  { to: "/marketing/catch-back", label: "Catch Back Relapsed", icon: UserPlus },
  { to: "/marketing/creators", label: "Book a Creator", icon: Star },
  { to: "/marketing/promotions", label: "Promotions & Offers", icon: Tag },
  { to: "/marketing/landing", label: "Landing Pages", icon: FileText },
  { to: "/marketing/reviews", label: "Review Management", icon: Star },
  { to: "/marketing/referral", label: "Referral Program", icon: Share2 },
];

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role } = useRole();
  const nav = NAV_BY_ROLE[role];
  const showMarketing = role === "admin" && (pathname.startsWith("/marketing") || pathname.startsWith("/loyalty"));

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

        {showMarketing && (
          <div className="mt-6 rounded-xl border border-sidebar-border p-3">
            <div className="px-2 pb-2 text-xs font-semibold text-muted-foreground">Marketing Actions</div>
            <ul className="space-y-0.5">
              {marketingActions.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.to;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-3 shrink-0">
        <RestaurantTile />

        {role === "admin" && (
          <div className="relative overflow-hidden rounded-xl bg-foreground text-background p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-4 text-success" />
              <span className="font-semibold text-sm">Upgrade to Pro</span>
            </div>
            <p className="text-[11px] text-background/70 leading-snug mb-3">Unlock advanced analytics, smart automation and more.</p>
            <button className="w-full rounded-lg bg-success py-2 text-xs font-semibold text-background hover:bg-success/90">Upgrade Now</button>
            <Sparkles className="absolute -bottom-2 -right-2 size-12 text-success/30" />
          </div>
        )}
      </div>
    </>
  );
}

function RestaurantTile() {
  const { staff } = useAuth();
  const [info, setInfo] = useState<{ name: string; city: string | null; logo_url: string | null } | null>(null);

  useEffect(() => {
    if (!staff) { setInfo(null); return; }
    (async () => {
      const { data } = await supabase
        .from("v2_restaurants")
        .select("name, city, logo_url")
        .eq("id", staff.restaurant_id)
        .maybeSingle();
      if (data) setInfo(data);
    })();
  }, [staff]);

  const name = info?.name ?? (staff ? "Your restaurant" : "RestoStack");
  const city = info?.city ?? (staff ? "—" : "");

  return (
    <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 text-left">
      {info?.logo_url ? (
        <img src={info.logo_url} alt="" className="size-8 rounded-md object-cover shrink-0" />
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <span className="truncate">{name}</span> <span className="size-1.5 rounded-full bg-success shrink-0" />
        </div>
        <div className="text-xs text-muted-foreground truncate">{city}</div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </button>
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
          {(NAV_BY_ROLE[role] ?? ADMIN_NAV).slice(0, 6).map((item) => (
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
