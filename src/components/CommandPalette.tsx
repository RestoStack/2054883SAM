import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard, CalendarDays, ShoppingBag, Users, UtensilsCrossed, Megaphone, Award,
  BarChart3, UserCog, Settings, Calendar, Mail, MessageSquare, Tag, Search,
} from "lucide-react";
import { orderHistory, emailCampaigns, promotions } from "@/lib/mock-data";
import { useBookings, useCustomers } from "@/lib/v2-data";

const pages = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/marketing", label: "Marketing", icon: Megaphone },
  { to: "/marketing/email", label: "Email Marketing", icon: Mail },
  { to: "/marketing/sms", label: "Send SMS", icon: MessageSquare },
  { to: "/marketing/promotions", label: "Promotions", icon: Tag },
  { to: "/loyalty", label: "Loyalty", icon: Award },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/staff", label: "Staff", icon: UserCog },
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

  const go = (fn: () => void) => { setOpen(false); fn(); };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 w-96"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search anything…</span>
        <kbd className="text-[10px] font-mono rounded border border-border px-1.5 py-0.5 bg-muted/50">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search customers, bookings, orders, pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {pages.map((p) => (
              <CommandItem key={p.to} value={`page ${p.label}`} onSelect={() => go(() => navigate({ to: p.to as never }))}>
                <p.icon className="mr-2 size-4" />{p.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Customers">
            {customers.slice(0, 12).map((c) => (
              <CommandItem key={c.id} value={`customer ${c.name} ${c.email}`} onSelect={() => go(() => navigate({ to: "/customers/$id", params: { id: c.id } }))}>
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
                onSelect={() => go(() => {
                  if (b.customerId) navigate({ to: "/customers/$id", params: { id: b.customerId } });
                  else navigate({ to: "/bookings" });
                })}
              >
                <CalendarDays className="mr-2 size-4" />
                <span className="flex-1">{b.name} — {b.time}</span>
                <span className="text-xs text-muted-foreground">{b.table}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Orders">
            {orderHistory.slice(0, 6).map((o) => (
              <CommandItem key={o.id} value={`order ${o.id} ${o.items}`} onSelect={() => go(() => navigate({ to: "/orders" }))}>
                <ShoppingBag className="mr-2 size-4" />
                <span className="flex-1">{o.id} — {o.items}</span>
                <span className="text-xs text-muted-foreground">{o.total}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Campaigns">
            {emailCampaigns.slice(0, 5).map((c) => (
              <CommandItem key={c.name} value={`campaign ${c.name}`} onSelect={() => go(() => navigate({ to: "/marketing/email" }))}>
                <Mail className="mr-2 size-4" />{c.name}
              </CommandItem>
            ))}
            {promotions.slice(0, 3).map((p) => (
              <CommandItem key={p.name} value={`promo ${p.name}`} onSelect={() => go(() => navigate({ to: "/marketing/promotions" }))}>
                <Tag className="mr-2 size-4" />{p.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export { CommandPalette as CommandPaletteTrigger };
