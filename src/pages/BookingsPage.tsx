import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Filter, MoreHorizontal, Plus, Users, X } from 'lucide-react'
import { useAppStore } from '@/data/store'
import { bookingsOnDay, bookingsPageMetrics } from '@/data/aggregates'
import { PageHeader } from '@/components/AppShell'
import { Badge, Button, Card, Input } from '@/components/ui'
import { formatPercent } from '@/lib/utils'
import type { Booking, BookingStatus, RestaurantTable } from '@/types'

type Tab = 'all' | 'upcoming' | 'seated' | 'completed' | 'cancelled' | 'no_show'

const tabs: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All Bookings' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'seated', label: 'Seated' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'no_show', label: 'No Show' },
]

function statusTone(status: BookingStatus) {
  switch (status) {
    case 'confirmed':
      return 'green' as const
    case 'pending':
      return 'blue' as const
    case 'seated':
      return 'purple' as const
    case 'completed':
      return 'slate' as const
    case 'cancelled':
      return 'red' as const
    case 'no_show':
      return 'yellow' as const
  }
}

function matchesTab(b: Booking, tab: Tab) {
  if (tab === 'all') return true
  if (tab === 'upcoming') return b.status === 'pending' || b.status === 'confirmed'
  if (tab === 'no_show') return b.status === 'no_show'
  return b.status === tab
}

function FloorPlan({
  tables,
  bookings,
  selectedTableId,
  onSelect,
}: {
  tables: RestaurantTable[]
  bookings: Booking[]
  selectedTableId?: string
  onSelect: (tableId: string) => void
}) {
  const occupied = new Set(
    bookings
      .filter((b) => b.tableId && (b.status === 'seated' || b.status === 'confirmed' || b.status === 'pending'))
      .map((b) => b.tableId!),
  )

  return (
    <div className="relative h-80 overflow-hidden rounded-xl bg-slate-800">
      <div className="absolute left-3 top-3 z-10 flex gap-2 text-[10px] text-white/80">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> Occupied</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-white" /> Reserved</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500" /> Free</span>
      </div>
      {tables.map((t) => {
        const seated = bookings.some((b) => b.tableId === t.id && b.status === 'seated')
        const reserved = occupied.has(t.id) && !seated
        const selected = selectedTableId === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            title={`${t.label} · ${t.capacity} seats · ${t.area}`}
            className={`absolute flex items-center justify-center text-[11px] font-semibold transition ${
              t.shape === 'circle' ? 'rounded-full' : 'rounded-md'
            } ${
              seated
                ? 'bg-rose-400 text-white'
                : reserved
                  ? 'bg-white text-slate-800'
                  : 'bg-slate-600 text-white'
            } ${selected ? 'ring-2 ring-brand ring-offset-2 ring-offset-slate-800' : ''}`}
            style={{ left: t.posX, top: t.posY, width: t.width, height: t.height }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export function BookingsPage() {
  const { data, locationId, selectedDay, updateBookingStatus, assignTable, addBooking } = useAppStore()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('all')
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({
    guestName: '',
    partySize: 2,
    time: '19:00',
    source: 'phone' as Booking['source'],
  })

  const metrics = bookingsPageMetrics(data, locationId, selectedDay)
  const dayBookings = useMemo(
    () =>
      bookingsOnDay(data.bookings, locationId, selectedDay).sort((a, b) =>
        a.bookingAt.localeCompare(b.bookingAt),
      ),
    [data.bookings, locationId, selectedDay],
  )
  const filtered = dayBookings.filter((b) => matchesTab(b, tab))
  const selectedId = params.get('id')
  const selected = data.bookings.find((b) => b.id === selectedId) ?? null
  const selectedCustomer = selected
    ? data.customers.find((c) => c.id === selected.customerId)
    : undefined
  const selectedTable = selected?.tableId
    ? data.tables.find((t) => t.id === selected.tableId)
    : undefined
  const visitCount = selected
    ? data.bookings.filter((b) => b.customerId === selected.customerId && b.status === 'completed').length
    : 0

  useEffect(() => {
    if (!selectedId && dayBookings[0]) {
      // keep URL clean until user clicks
    }
  }, [selectedId, dayBookings])

  const openBooking = (id: string) => {
    setParams({ id })
  }

  const closePanel = () => {
    setParams({})
  }

  return (
    <div className="relative">
      <PageHeader
        title="Bookings"
        subtitle="Manage all restaurant bookings in one place."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" /> Filters
            </Button>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4" /> New Booking
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((m) => (
          <Card key={m.label} className="p-4">
            <div className="text-sm text-slate-500">{m.label}</div>
            <div className="mt-2 text-2xl font-semibold">{m.value}</div>
            <div className={`mt-1 text-xs font-medium ${m.up ? 'text-emerald-600' : 'text-rose-500'}`}>
              {m.up ? '▲' : '▼'} {formatPercent(Math.abs(m.delta))} vs yesterday
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-white p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
              tab === t.id ? 'bg-brand/10 font-medium text-brand-dark' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className={`overflow-hidden ${selected ? 'xl:mr-[420px]' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Booking Time</th>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">People</th>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">Visits</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const table = data.tables.find((t) => t.id === b.tableId)
                const visits = data.bookings.filter(
                  (x) => x.customerId === b.customerId && x.status === 'completed',
                ).length
                const active = selectedId === b.id
                return (
                  <tr
                    key={b.id}
                    onClick={() => openBooking(b.id)}
                    className={`cursor-pointer border-t border-border transition hover:bg-emerald-50/40 ${
                      active ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{format(parseISO(b.bookingAt), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-slate-500">{format(parseISO(b.bookingAt), 'h:mm a')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold">
                          {b.guestName
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <span className="font-medium">{b.guestName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">{b.source}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <Users className="h-3.5 w-3.5" /> {b.partySize}
                      </span>
                    </td>
                    <td className="px-4 py-3">{table?.label ?? '—'}</td>
                    <td className="px-4 py-3">{visits}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(b.status)}>{b.status.replace('_', ' ')}</Badge>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No bookings in this filter for the selected day.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <aside className="fixed bottom-0 right-0 top-14 z-30 flex w-full max-w-[420px] flex-col border-l border-border bg-white shadow-2xl animate-in">
          <div className="flex items-start justify-between border-b border-border p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold">
                {selected.guestName
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <div className="font-semibold">{selected.guestName}</div>
                <div className="text-xs text-slate-500">{selectedCustomer?.email ?? 'Guest'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedCustomer && (
                <Link to={`/customers/${selectedCustomer.id}`}>
                  <Button variant="outline" size="sm">
                    View Customer
                  </Button>
                </Link>
              )}
              <button type="button" onClick={closePanel} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">Date</div>
                <div className="font-medium">{format(parseISO(selected.bookingAt), 'yyyy-MM-dd')}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Time</div>
                <div className="font-medium">{format(parseISO(selected.bookingAt), 'h:mm a')}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Party</div>
                <div className="font-medium">{selected.partySize} People</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Source</div>
                <div className="font-medium capitalize">{selected.source}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Table</div>
                <div className="font-medium">{selectedTable?.label ?? 'Unassigned'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Visits</div>
                <div className="font-medium">{visitCount}</div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">Status</div>
              <div className="flex flex-wrap gap-2">
                {(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'] as BookingStatus[]).map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateBookingStatus(selected.id, s)}
                      className={`rounded-full px-3 py-1 text-xs capitalize ${
                        selected.status === s ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">Table Location (Floor Plan)</div>
              <FloorPlan
                tables={data.tables.filter((t) => t.locationId === locationId)}
                bookings={dayBookings}
                selectedTableId={selected.tableId}
                onSelect={(tableId) => assignTable(selected.id, tableId)}
              />
              <p className="mt-2 text-xs text-slate-500">Click a table to assign it to this booking.</p>
            </div>
          </div>

          <div className="flex gap-2 border-t border-border p-4">
            <Button className="flex-1">Edit Booking</Button>
            <Button variant="outline" className="px-3">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </aside>
      )}

      {showNew && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-md p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Booking</h2>
              <button type="button" onClick={() => setShowNew(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Guest name</label>
                <Input
                  value={newForm.guestName}
                  onChange={(e) => setNewForm((f) => ({ ...f, guestName: e.target.value }))}
                  placeholder="Guest name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Party size</label>
                  <Input
                    type="number"
                    min={1}
                    value={newForm.partySize}
                    onChange={(e) => setNewForm((f) => ({ ...f, partySize: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Time</label>
                  <Input
                    type="time"
                    value={newForm.time}
                    onChange={(e) => setNewForm((f) => ({ ...f, time: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!newForm.guestName.trim()}
                onClick={() => {
                  const customer = data.customers[0]
                  addBooking({
                    locationId,
                    customerId: customer.id,
                    guestName: newForm.guestName.trim(),
                    bookingAt: `${selectedDay}T${newForm.time}:00`,
                    partySize: newForm.partySize,
                    source: newForm.source,
                    status: 'pending',
                  })
                  setShowNew(false)
                  setNewForm({ guestName: '', partySize: 2, time: '19:00', source: 'phone' })
                }}
              >
                Create Booking
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
