import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Mail,
  MessageSquare,
  Percent,
  RefreshCcw,
  Star,
  Users,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '@/data/store'
import { marketingMetrics } from '@/data/aggregates'
import { PageHeader } from '@/components/AppShell'
import { Badge, Button, Card } from '@/components/ui'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Sparkline } from '@/components/Charts'

const actions = [
  {
    title: 'Email Campaign',
    description: 'Send offers to segmented guest lists',
    icon: Mail,
    color: 'bg-sky-50 text-sky-600',
  },
  {
    title: 'SMS Campaign',
    description: 'Reach guests with timely text offers',
    icon: MessageSquare,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    title: 'Win Back Customers',
    description: 'Re-engage guests who have not visited',
    icon: RefreshCcw,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    title: 'Promotions',
    description: 'Create limited-time menu promotions',
    icon: Percent,
    color: 'bg-violet-50 text-violet-600',
  },
  {
    title: 'Reviews',
    description: 'Request and manage guest reviews',
    icon: Star,
    color: 'bg-rose-50 text-rose-600',
  },
  {
    title: 'Referrals',
    description: 'Reward guests who bring new diners',
    icon: Users,
    color: 'bg-slate-100 text-slate-700',
  },
]

export function MarketingPage() {
  const { data, locationId } = useAppStore()
  const metrics = marketingMetrics(data, locationId)

  const kpis = [
    {
      label: 'New Customers',
      value: metrics.newCustomers.toLocaleString(),
      delta: 18.6,
      spark: [12, 14, 13, 16, 18, 17, 20].map((value) => ({ value })),
    },
    {
      label: 'Returning Customers',
      value: metrics.returningCustomers.toLocaleString(),
      delta: 9.2,
      spark: [30, 32, 31, 34, 33, 36, 38].map((value) => ({ value })),
    },
    {
      label: 'Revenue from Marketing',
      value: formatCurrency(metrics.marketingRevenue),
      delta: 15.2,
      spark: [8, 9, 10, 11, 12, 13, 14].map((value) => ({ value })),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        subtitle="Grow covers and revenue with targeted campaigns"
        actions={
          <Button variant="outline" size="sm">
            Last 30 days
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-500">{kpi.label}</div>
                <div className="mt-2 text-2xl font-semibold">{kpi.value}</div>
                <div className="mt-1 text-xs font-medium text-emerald-600">
                  {formatPercent(kpi.delta)}
                </div>
              </div>
              <Sparkline data={kpi.spark} />
            </div>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">What would you like to do?</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => (
            <button
              key={action.title}
              type="button"
              className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 text-left shadow-sm transition hover:border-brand/40 hover:shadow-md"
            >
              <div className={`rounded-lg p-2 ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{action.title}</div>
                <div className="mt-1 text-sm text-slate-500">{action.description}</div>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 text-slate-400" />
            </button>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Recent Campaigns</h2>
          <Link to="/customers" className="text-sm text-brand hover:underline">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {metrics.campaigns.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-slate-500">{c.description}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">
                  {format(parseISO(c.sentAt), 'MMM d')}
                </span>
                <Badge tone="green">{c.openRate}% opened</Badge>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" className="mt-4 w-full border-dashed">
          + Create new campaign
        </Button>
      </Card>
    </div>
  )
}
