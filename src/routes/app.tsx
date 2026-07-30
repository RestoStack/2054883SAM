import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Utensils,
  Gift,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { InstallAppBanner } from "@/components/mobile/InstallAppBanner";
import logoUrl from "@/assets/restostack-logo.png";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "RestoStack App" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
  }),
  component: MobileAppHome,
});

type Tile = {
  to: string;
  label: string;
  desc: string;
  icon: typeof LayoutDashboard;
  roles: Array<"admin" | "hostess" | "server">;
  accent: string;
};

const TILES: Tile[] = [
  {
    to: "/host-stand",
    label: "Host Stand",
    desc: "Seat guests & floor",
    icon: ClipboardList,
    roles: ["admin", "hostess"],
    accent: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    to: "/server-app",
    label: "Server Pad",
    desc: "Take orders",
    icon: Utensils,
    roles: ["admin", "server", "hostess"],
    accent: "from-lime-500/20 to-lime-500/5",
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    desc: "Today’s numbers",
    icon: LayoutDashboard,
    roles: ["admin"],
    accent: "from-sky-500/20 to-sky-500/5",
  },
  {
    to: "/bookings",
    label: "Bookings",
    desc: "Reservations",
    icon: CalendarDays,
    roles: ["admin", "hostess"],
    accent: "from-violet-500/20 to-violet-500/5",
  },
  {
    to: "/customers",
    label: "Guests",
    desc: "CRM & profiles",
    icon: Users,
    roles: ["admin", "hostess"],
    accent: "from-amber-500/20 to-amber-500/5",
  },
  {
    to: "/loyalty",
    label: "Loyalty",
    desc: "Points & members",
    icon: Gift,
    roles: ["admin"],
    accent: "from-rose-500/20 to-rose-500/5",
  },
  {
    to: "/product-analytics",
    label: "Analytics",
    desc: "Item performance",
    icon: BarChart3,
    roles: ["admin"],
    accent: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    to: "/settings",
    label: "Settings",
    desc: "Restaurant setup",
    icon: Settings,
    roles: ["admin"],
    accent: "from-zinc-500/20 to-zinc-500/5",
  },
];

function MobileAppHome() {
  const { staff, loading, signOut, session } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground text-sm">
        Loading app…
      </div>
    );
  }

  if (!session || !staff) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <img src={logoUrl} alt="RestoStack" className="h-14 w-auto object-contain" />
        <h1 className="font-serif text-2xl font-bold">RestoStack Mobile</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Sign in to open Host Stand, Server Pad, and your restaurant tools on your phone.
        </p>
        <Link
          to="/login"
          className="mt-2 inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-2xl bg-[#39D400] px-6 text-sm font-semibold text-black"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const role = staff.role;
  const tiles = TILES.filter((t) => t.roles.includes(role));

  return (
    <div className="min-h-dvh bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoUrl} alt="" className="h-9 w-auto object-contain shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">RestoStack</div>
              <div className="truncate text-xs text-muted-foreground">
                {staff.full_name} · {role}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-5">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Home</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a tool to run service from your phone.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex min-h-[132px] flex-col justify-between rounded-2xl border border-border bg-gradient-to-br ${t.accent} p-4 active:scale-[0.98] transition`}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#39D400]/15 text-[#1a7a00]">
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className="font-semibold leading-tight">{t.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{t.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Tip: install this page to your home screen for an app-like experience.
        </p>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {(role === "server"
            ? [
                { to: "/app", label: "Home", icon: LayoutDashboard },
                { to: "/server-app", label: "Orders", icon: Utensils },
              ]
            : role === "hostess"
              ? [
                  { to: "/app", label: "Home", icon: LayoutDashboard },
                  { to: "/host-stand", label: "Host", icon: ClipboardList },
                  { to: "/bookings", label: "Book", icon: CalendarDays },
                ]
              : [
                  { to: "/app", label: "Home", icon: LayoutDashboard },
                  { to: "/host-stand", label: "Host", icon: ClipboardList },
                  { to: "/server-app", label: "Pad", icon: Utensils },
                  { to: "/dashboard", label: "Stats", icon: BarChart3 },
                ]
          ).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <InstallAppBanner />
    </div>
  );
}
