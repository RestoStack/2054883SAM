import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '@/data/store'
import { customerStats } from '@/data/aggregates'
import { VisitChart } from '@/components/Charts'
import { Badge, Button, Card, Input } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

const tabs = [
  'Overview',
  'Order History',
  'Bookings',
  'Loyalty & Rewards',
  'Communications',
  'Notes',
  'Preferences',
] as const

function tagTone(tag: string) {
  if (tag.toLowerCase().includes('vip') || tag.toLowerCase().includes('birthday')) return 'green' as const
  if (tag.toLowerCase().includes('spender')) return 'pink' as const
  if (tag.toLowerCase().includes('instagram')) return 'purple' as const
  return 'default' as const
}

export function CustomerDetailPage() {
  const { customerId } = useParams()
  const { data, addCustomerTag, removeCustomerTag, updateCustomer } = useAppStore()
  const customer = data.customers.find((c) => c.id === customerId)
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview')
  const [newTag, setNewTag] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(customer?.notes ?? '')

  const stats = useMemo(
    () => (customer ? customerStats(data, customer.id) : null),
    [customer, data],
  )

  if (!customer || !stats) {
    return (
      <div className="rounded-xl border border-border bg-white p-10 text-center">
        <div className="font-semibold">Customer not found</div>
        <Link to="/customers" className="mt-2 inline-block text-sm text-brand">
          Back to customers
        </Link>
      </div>
    )
  }

  const customerBookings = data.bookings
    .filter((b) => b.customerId === customer.id)
    .sort((a, b) => b.bookingAt.localeCompare(a.bookingAt))
  const customerOrders = data.orders
    .filter((o) => o.customerId === customer.id)
    .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))

  const kpis = [
    { label: 'Total Visits', value: String(stats.totalVisits) },
    { label: 'Total Spent', value: formatCurrency(stats.totalSpent) },
    { label: 'Average Spend', value: formatCurrency(stats.averageSpend) },
    { label: 'Page Visits', value: String(customer.pageVisits) },
    { label: 'Points Earned', value: String(customer.pointsEarned) },
  ]

  return (
    <div className="space-y-6">
      <div className="text-sm text-slate-500">
        <Link to="/customers" className="hover:text-brand">
          Customers
        </Link>{' '}
        <span className="mx-1">›</span> {customer.fullName}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-brand-dark">
            {customer.fullName
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{customer.fullName}</h1>
              {customer.customerType === 'vip' && <Badge tone="green">VIP</Badge>}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {customer.email} · {customer.phone}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Member since {format(parseISO(customer.memberSince), 'MMM d, yyyy')}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Edit Customer</Button>
          <Button variant="secondary">More Actions</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="text-sm text-slate-500">{k.label}</div>
            <div className="mt-2 text-2xl font-semibold">{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit p-2">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                tab === t ? 'bg-brand/10 font-medium text-brand-dark' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{t}</span>
              {t === 'Bookings' && (
                <span className="rounded-full bg-slate-100 px-1.5 text-xs">{customerBookings.length}</span>
              )}
            </button>
          ))}
        </Card>

        <div className="space-y-4">
          {tab === 'Overview' && (
            <>
              <div className="grid gap-4 xl:grid-cols-3">
                <Card className="p-5 xl:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="font-semibold">Customer Details</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (editingNotes) updateCustomer(customer.id, { notes })
                        setEditingNotes((v) => !v)
                      }}
                    >
                      {editingNotes ? 'Save' : 'Edit'}
                    </Button>
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                    {[
                      ['Full Name', customer.fullName],
                      ['Email', customer.email],
                      ['Phone', customer.phone],
                      ['Birthday', customer.birthday ? format(parseISO(customer.birthday), 'MMM d') : '—'],
                      ['Source', customer.source],
                      ['Customer Type', customer.customerType.toUpperCase()],
                      ['Accepts Uber Orders', customer.acceptsDelivery ? 'Yes' : 'No'],
                      ['Marketing Consent', customer.marketingConsent ? 'Yes' : 'No'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd
                          className={`mt-0.5 font-medium capitalize ${
                            value === 'Yes' || label === 'Birthday' ? 'text-brand' : ''
                          }`}
                        >
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4">
                    <div className="text-xs text-slate-500">Notes</div>
                    {editingNotes ? (
                      <textarea
                        className="mt-1 w-full rounded-lg border border-border p-2 text-sm"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    ) : (
                      <p className="mt-1 text-sm italic text-slate-700">{customer.notes || 'No notes'}</p>
                    )}
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="font-semibold">Visit & Engagement</div>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Total Visits</dt>
                      <dd className="font-medium">{stats.totalVisits}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">First Visit</dt>
                      <dd className="font-medium">
                        {stats.firstVisit ? format(parseISO(stats.firstVisit), 'MMM d, yyyy') : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Last Visit</dt>
                      <dd className="font-medium">
                        {stats.lastVisit ? format(parseISO(stats.lastVisit), 'MMM d, yyyy') : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Page Visits</dt>
                      <dd className="font-medium">{customer.pageVisits}</dd>
                    </div>
                  </dl>
                </Card>
              </div>

              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-semibold">Tags</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => removeCustomerTag(customer.id, tag)}
                      title="Click to remove"
                    >
                      <Badge tone={tagTone(tag)}>{tag} ×</Badge>
                    </button>
                  ))}
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!newTag.trim()) return
                      addCustomerTag(customer.id, newTag.trim())
                      setNewTag('')
                    }}
                  >
                    <Input
                      className="h-7 w-32"
                      placeholder="+ Add Tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                    />
                  </form>
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="font-semibold">Favourite Items</div>
                  <span className="text-sm text-brand">View All</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  {stats.favourites.map((item) => {
                    const menu = data.menuItems.find((m) => m.id === item.menuItemId)
                    return (
                      <div key={item.menuItemId} className="w-24 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl">
                          {menu?.imageEmoji ?? '🍽️'}
                        </div>
                        <div className="mt-2 text-xs font-medium leading-tight">{item.name}</div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="p-5">
                  <div className="font-semibold">Last Visit Summary</div>
                  {stats.lastOrder ? (
                    <div className="mt-3 text-sm">
                      <div className="font-medium">
                        {format(parseISO(stats.lastOrder.orderedAt), 'MMM d, yyyy')} at{' '}
                        {format(parseISO(stats.lastOrder.orderedAt), 'h:mm a')}
                      </div>
                      <div className="mt-1 text-slate-500">
                        Served by {stats.lastOrder.serverName}
                        {stats.lastOrder.tableId
                          ? ` at Table ${data.tables.find((t) => t.id === stats.lastOrder!.tableId)?.label}`
                          : ''}{' '}
                        (Indoor)
                      </div>
                      <ul className="mt-3 space-y-1 text-slate-700">
                        {stats.lastOrderItems.map((oi) => (
                          <li key={oi.id}>
                            {oi.quantity}× {oi.itemName}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 font-semibold text-brand">
                        Total {formatCurrency(stats.lastOrder.total)}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No visits yet.</p>
                  )}
                </Card>

                <Card className="p-5">
                  <div className="font-semibold">Preferences</div>
                  <dl className="mt-3 space-y-2 text-sm">
                    {[
                      ['Preferred Seating', customer.preferredSeating],
                      ['Preferred Area', customer.preferredArea],
                      ['Time Preference', customer.timePreference],
                      ['Dietary Restrictions', customer.dietaryNotes || 'None'],
                      ['Other Preferences', customer.otherPreferences || '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4">
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="text-right font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              </div>

              <Card className="p-5">
                <div className="mb-3 font-semibold">Visit Frequency</div>
                <VisitChart data={stats.visitFrequency} />
              </Card>
            </>
          )}

          {tab === 'Order History' && (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Server</th>
                    <th className="px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {customerOrders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-4 py-3">{format(parseISO(o.orderedAt), 'MMM d, yyyy h:mm a')}</td>
                      <td className="px-4 py-3">{o.serverName}</td>
                      <td className="px-4 py-3 font-medium text-brand">{formatCurrency(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {tab === 'Bookings' && (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Party</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerBookings.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <Link to={`/bookings?id=${b.id}`} className="hover:text-brand">
                          {format(parseISO(b.bookingAt), 'MMM d, yyyy h:mm a')}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{b.partySize}</td>
                      <td className="px-4 py-3 capitalize">{b.status.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {tab === 'Loyalty & Rewards' && (
            <Card className="p-5">
              <div className="text-3xl font-semibold">{customer.pointsBalance}</div>
              <div className="text-sm text-slate-500">Points balance · {customer.pointsEarned} earned lifetime</div>
            </Card>
          )}

          {tab === 'Communications' && (
            <Card className="p-5 text-sm text-slate-600">
              Marketing consent: {customer.marketingConsent ? 'Yes' : 'No'}. Campaign history will appear here.
            </Card>
          )}

          {tab === 'Notes' && (
            <Card className="p-5">
              <p className="text-sm italic text-slate-700">{customer.notes || 'No notes'}</p>
            </Card>
          )}

          {tab === 'Preferences' && (
            <Card className="p-5">
              <dl className="space-y-3 text-sm">
                {[
                  ['Preferred Seating', customer.preferredSeating],
                  ['Preferred Area', customer.preferredArea],
                  ['Time Preference', customer.timePreference],
                  ['Dietary Restrictions', customer.dietaryNotes || 'None'],
                  ['Other Preferences', customer.otherPreferences || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
