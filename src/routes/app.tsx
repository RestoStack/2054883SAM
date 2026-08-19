import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
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
    roles: ["admin", "hostess", "server"],
    accent: "from-emerald-500/20 to-emerald-500/5",
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
    roles: ["admin", "hostess", "server"],
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
    to: "/reports",
    label: "Reports",
    desc: "Trends & CSV",
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
    accent: "from-slate-500/20 to-slate-500/5",
  },
];

function MobileAppHome() {
  const { staff, signOut } = useAuth();
  const navigate = useNavigate();
  const role = (staff?.role ?? "admin") as "admin" | "hostess" | "server";
  const tiles = TILES.filter((t) => t.roles.includes(role));

  return (
    <div className="min-h-dvh bg-background text-foreground pb-8">
      <InstallAppBanner />
      <header className="px-4 pt-10 pb-4 flex items-center gap-3">
        <img src={logoUrl} alt="" className="h-10 w-auto object-contain" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{staff?.full_name ?? "Team"}</div>
          <div className="text-xs text-muted-foreground capitalize">{role}</div>
        </div>
        <button
          type="button"
          className="size-10 grid place-items-center rounded-full border border-border"
          aria-label="Sign out"
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="size-4" />
        </button>
      </header>

      <div className="px-4 grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to as never}
            className={`rounded-2xl border border-border bg-gradient-to-br ${t.accent} p-4 min-h-[120px] flex flex-col`}
          >
            <t.icon className="size-5 mb-3 opacity-80" />
            <div className="font-semibold text-sm">{t.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
