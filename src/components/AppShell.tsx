import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ConciergeBell,
  ClipboardList,
  CalendarDays,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  ChartColumn,
  Megaphone,
  Gift,
  FileBarChart,
  UserRound,
  Trophy,
  Wallet,
  Puzzle,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Star,
} from 'lucide-react'
import { useAppStore } from '@/data/store'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { Button } from '@/components/ui'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/host', label: 'Host Stand', icon: ConciergeBell },
  { to: '/server', label: 'Server Pad', icon: ClipboardList },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/analytics', label: 'Product Analytics', icon: ChartColumn },
  { to: '/marketing', label: 'Marketing', icon: Megaphone },
  { to: '/loyalty', label: 'Loyalty', icon: Gift },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/staff', label: 'Staff', icon: UserRound },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/payroll', label: 'Payroll', icon: Wallet },
  { to: '/integrations', label: 'Integrations', icon: Puzzle },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell() {
  const { data, location, locationId, setLocationId, selectedDay, setSelectedDay } = useAppStore()
  const [locOpen, setLocOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-sidebar text-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <Star className="h-4 w-4 fill-white text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">RestoStack</span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-muted transition hover:bg-sidebar-hover hover:text-white',
                  isActive && 'bg-brand/20 font-medium text-emerald-300',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setLocOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10"
            >
              <div>
                <div className="font-medium text-white">{location.name}</div>
                <div className="text-xs text-sidebar-muted">
                  {location.neighborhood}, {location.city}
                </div>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-sidebar-muted" />
            </button>
            {locOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-xl">
                {data.locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    className={cn(
                      'block w-full px-3 py-2 text-left text-sm hover:bg-white/10',
                      loc.id === locationId && 'bg-brand/20 text-emerald-300',
                    )}
                    onClick={() => {
                      setLocationId(loc.id)
                      setLocOpen(false)
                    }}
                  >
                    {loc.name} · {loc.neighborhood}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 p-3">
            <div className="text-sm font-medium">Upgrade to Pro</div>
            <div className="mt-1 text-xs text-sidebar-muted">Unlock payroll, AI insights & more</div>
            <Button size="sm" className="mt-3 w-full" onClick={() => navigate('/marketing')}>
              Upgrade Now
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border bg-white/90 px-4 backdrop-blur md:px-6">
          <div className="relative mx-auto hidden w-full max-w-md md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-full rounded-lg border border-border bg-slate-50 pl-9 pr-14 text-sm outline-none focus:ring-2 focus:ring-brand/30"
              placeholder="Search anything..."
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-white px-1.5 py-0.5 text-[10px] text-slate-400">
              ⌘K
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <div className="hidden items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-sm sm:flex">
              <button
                type="button"
                className="rounded p-1 hover:bg-slate-100"
                onClick={() => {
                  const d = parseISO(selectedDay)
                  d.setDate(d.getDate() - 1)
                  setSelectedDay(format(d, 'yyyy-MM-dd'))
                }}
              >
                ‹
              </button>
              <span className="min-w-28 text-center font-medium">
                {format(parseISO(selectedDay), 'MMM d, yyyy')}
              </span>
              <button
                type="button"
                className="rounded p-1 hover:bg-slate-100"
                onClick={() => {
                  const d = parseISO(selectedDay)
                  d.setDate(d.getDate() + 1)
                  setSelectedDay(format(d, 'yyyy-MM-dd'))
                }}
              >
                ›
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDay('2026-07-13')}
            >
              Today
            </Button>
            <button type="button" className="relative rounded-lg p-2 hover:bg-slate-100">
              <Bell className="h-4 w-4 text-slate-600" />
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                3
              </span>
            </button>
            <div className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-brand-dark">
                GK
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="text-sm font-medium">{data.currentUser.name}</div>
                <div className="text-xs text-slate-500">Super Admin</div>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {breadcrumb}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white text-center">
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        This module is stubbed for the showcase. Open Dashboard, Bookings, Customers, or Marketing for the full interactive prototype.
      </p>
      <div className="mt-4 flex items-center gap-1 text-sm text-brand">
        Try Bookings <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  )
}
