import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Shield, Users, Utensils, LogOut } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

export type Role = "admin" | "hostess" | "server";

export const ROLE_META: Record<Role, { label: string; icon: typeof Shield; home: string; desc: string }> = {
  admin:   { label: "Owner", icon: Shield,   home: "/dashboard",   desc: "Full restaurant access" },
  hostess: { label: "Host",        icon: Users,    home: "/host-stand",  desc: "Floor & reservations" },
  server:  { label: "Host",        icon: Utensils, home: "/host-stand",  desc: "Floor & reservations" },
};

const STORAGE_KEY = "restostack:role";

type Ctx = { role: Role; setRole: (r: Role) => void };
const RoleCtx = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { staff } = useAuth();
  const [role, setRoleState] = useState<Role>("admin");

  // When a real staff user is loaded, lock the role to theirs.
  useEffect(() => {
    if (staff) {
      setRoleState(staff.role);
      try { localStorage.setItem(STORAGE_KEY, staff.role); } catch {}
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Role | null;
      if (stored && stored in ROLE_META) setRoleState(stored);
    } catch {}
  }, [staff]);

  const setRole = (r: Role) => {
    setRoleState(r);
    try { localStorage.setItem(STORAGE_KEY, r); } catch {}
  };

  return <RoleCtx.Provider value={{ role, setRole }}>{children}</RoleCtx.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleCtx);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

export function RoleSwitcher({ className }: { className?: string }) {
  const { role } = useRole();
  const { staff, session, signOut } = useAuth();
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  const displayName = staff?.full_name ?? meta.label;

  const handleSignOut = async () => {
    await signOut();
    if (typeof window !== "undefined") window.location.href = "/login";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors " +
          (className ?? "")
        }
      >
        <Icon className="size-3.5" />
        <span className="font-semibold">{displayName}</span>
        <span className="hidden sm:inline text-muted-foreground">· {meta.label}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          {staff ? (
            <div className="flex flex-col">
              <span className="text-sm">{staff.full_name}</span>
              <span className="text-[11px] text-muted-foreground font-normal capitalize">{staff.role}</span>
            </div>
          ) : (
            "Not signed in"
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {session ? (
          <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer">
            <LogOut className="size-4 text-muted-foreground" />
            <span className="text-sm">Sign out</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => { if (typeof window !== "undefined") window.location.href = "/login"; }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Shield className="size-4 text-muted-foreground" />
            <span className="text-sm">Sign in</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
