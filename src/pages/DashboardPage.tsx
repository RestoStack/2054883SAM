import { Link } from 'react-router-dom'
import { useAppStore } from '@/data/store'
import {
  dashboardMetrics,
  generateInsights,
  labourOverview,
  staffWorking,
  topPerformingItems,
  upcomingBookings,
} from '@/data/aggregates'
import { KpiCard, RevenueChart } from '@/components/Charts'
import { Badge, Button, Card } from '@/components/ui'
import { PageHeader } from '@/components/AppShell'
import { formatCurrency } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { AlertTriangle, Info, Sparkles, Star, TrendingUp } from 'lucide-react'

export function DashboardPage() {
  const { data, locationId, selectedDay } = useAppStore()
  const metrics = dashboardMetrics(data, locationId, selectedDay)
  const staff = staffWorking(data, locationId, selectedDay)
  const labour = labourOverview(data, locationId, selectedDay, metrics.revenue)
  const topItems = topPerformingItems(data, locationId, selectedDay)
  const insights = generateInsights(data, locationId, selectedDay)
  const upcoming = upcomingBookings(data, locationId, selectedDay).slice(0, 5)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Real-time performance for your restaurant"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.kpis.map((kpi) => (
          <KpiCard key={kpi.id} {...kpi} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-500">Actual Revenue Overview</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-semibold">{formatCurrency(metrics.revenue)}</span>
                <span className="text-sm font-medium text-emerald-600">
                  ▲ {Math.abs(metrics.revenueDelta).toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand" /> Actual Revenue
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-violet-300" /> vs yesterday
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm">
              By Day ▾
            </Button>
          </div>
          <RevenueChart series={metrics.revenueSeries} compare={metrics.yesterdaySeries} />
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-semibold">Staff Working</div>
            <Link to="/staff" className="text-sm text-brand hover:underline">
              View all →
            </Link>
          </div>
          <div className="text-3xl font-semibold">{staff.total} Employees</div>
          <div className="mt-1 text-sm text-emerald-600">
            vs yesterday ▲ {staff.delta}
          </div>
          <div className="mt-6 space-y-3">
            {[
              { label: 'Front of House', value: staff.foh, color: 'bg-emerald-500' },
              { label: 'Back of House', value: staff.boh, color: 'bg-sky-500' },
              { label: 'Management', value: staff.management, color: 'bg-violet-500' },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-600">{row.label}</span>
                  <span className="font-medium">{row.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${row.color}`}
                    style={{ width: `${staff.total ? (row.value / staff.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <div className="font-semibold">Staff Labour Overview</div>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative flex h-28 w-28 items-center justify-center">
              <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="4"
                  strokeDasharray={`${Math.min(labour.pctOfRevenue, 100)} ${100 - Math.min(labour.pctOfRevenue, 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-sm font-semibold">{labour.pctOfRevenue.toFixed(1)}%</div>
                <div className="text-[10px] text-slate-500">of Revenue</div>
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{formatCurrency(labour.total)}</div>
              <div className="mt-1 text-sm text-rose-500">
                ▼ {Math.abs(labour.deltaVsYesterday).toFixed(1)}% vs yesterday
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {[
              { label: 'FOH Labour', value: labour.foh, pct: labour.fohPct },
              { label: 'BOH Labour', value: labour.boh, pct: labour.bohPct },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="font-medium">
                    {formatCurrency(row.value)}{' '}
                    <span className="text-slate-400">({row.pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-brand"
                    style={{ width: `${Math.min(row.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-semibold">Upcoming Bookings</div>
            <Link to="/bookings" className="text-sm text-brand hover:underline">
              View all →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-500">
              No upcoming bookings today
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => (
                <Link
                  key={b.id}
                  to={`/bookings?id=${b.id}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-slate-50"
                >
                  <div>
                    <div className="text-sm font-medium">{b.guestName}</div>
                    <div className="text-xs text-slate-500">
                      {format(parseISO(b.bookingAt), 'h:mm a')} · {b.partySize} guests
                    </div>
                  </div>
                  <Badge tone={b.status === 'confirmed' ? 'green' : 'blue'}>{b.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4 font-semibold">Top Performing Items</div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-3 py-3 font-medium">Orders</th>
                <th className="px-5 py-3 font-medium text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((item) => (
                <tr key={item.name} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{item.name}</td>
                  <td className="px-3 py-3 text-slate-600">{item.orders}</td>
                  <td className="px-5 py-3 text-right font-medium text-brand">
                    {formatCurrency(item.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-semibold">Insights</div>
          <button type="button" className="text-sm text-brand hover:underline">
            View all insights →
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((insight) => {
            const Icon =
              insight.tone === 'positive'
                ? TrendingUp
                : insight.tone === 'warning'
                  ? AlertTriangle
                  : insight.tone === 'star'
                    ? Star
                    : Info
            const tone =
              insight.tone === 'positive' || insight.tone === 'star'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                : insight.tone === 'warning'
                  ? 'border-amber-100 bg-amber-50 text-amber-900'
                  : 'border-sky-100 bg-sky-50 text-sky-900'
            return (
              <div key={insight.text} className={`flex gap-3 rounded-xl border p-3 ${tone}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-sm leading-relaxed">{insight.text}</p>
              </div>
            )
          })}
          {insights.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Sparkles className="h-4 w-4" /> No insights for this day yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
