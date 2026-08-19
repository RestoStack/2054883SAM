import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard, CalendarDays, Users, BarChart3, UserCog, Settings, ClipboardList, Search,
} from "lucide-react";
import { useBookings, useCustomers } from "@/lib/v2-data";

const pages = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/host-stand", label: "Host Stand", icon: ClipboardList },
  { to: "/customers", label: "Guests", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/staff", label: "Team", icon: UserCog },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const { data: customers = [] } = useCustomers();
  const { data: bookings = [] } = useBookings();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 w-96"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search anything…</span>
        <kbd className="text-[10px] font-mono rounded border border-border px-1.5 py-0.5 bg-muted/50">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search guests, bookings, pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {pages.map((p) => (
              <CommandItem key={p.to} value={`page ${p.label}`} onSelect={() => go(() => navigate({ to: p.to as never }))}>
                <p.icon className="mr-2 size-4" />
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Guests">
            {customers.slice(0, 12).map((c) => (
              <CommandItem
                key={c.id}
                value={`customer ${c.name} ${c.email}`}
                onSelect={() =>
                  go(() => navigate({ to: "/customers/$id", params: { id: c.id }, search: { tab: "overview" } }))
                }
              >
                <Users className="mr-2 size-4" />
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.tag}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Bookings">
            {bookings.slice(0, 12).map((b) => (
              <CommandItem
                key={b.id}
                value={`booking ${b.id} ${b.name} ${b.table}`}
                onSelect={() =>
                  go(() => {
                    if (b.customerId) {
                      navigate({
                        to: "/customers/$id",
                        params: { id: b.customerId },
                        search: { tab: "overview" },
                      });
                    } else navigate({ to: "/bookings" });
                  })
                }
              >
                <CalendarDays className="mr-2 size-4" />
                <span className="flex-1">
                  {b.name} — {b.time}
                </span>
                <span className="text-xs text-muted-foreground">{b.table}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export { CommandPalette as CommandPaletteTrigger };
