import { Link } from 'react-router-dom'
import { useAppStore } from '@/data/store'
import { customerStats } from '@/data/aggregates'
import { PageHeader } from '@/components/AppShell'
import { Badge, Card } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

export function CustomersPage() {
  const { data, locationId } = useAppStore()
  const customers = data.customers.filter((c) => c.locationId === locationId)

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="CRM for guests across your locations"
      />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Guest</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Visits</th>
              <th className="px-4 py-3 font-medium">Spent</th>
              <th className="px-4 py-3 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const stats = customerStats(data, c.id)
              return (
                <tr key={c.id} className="border-t border-border hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/customers/${c.id}`} className="flex items-center gap-3 hover:text-brand">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-brand-dark">
                        {c.fullName
                          .split(' ')
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div className="font-medium">{c.fullName}</div>
                        <div className="text-xs text-slate-500">{c.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={c.customerType === 'vip' ? 'green' : 'default'}>{c.customerType}</Badge>
                  </td>
                  <td className="px-4 py-3">{stats.totalVisits}</td>
                  <td className="px-4 py-3 font-medium text-brand">{formatCurrency(stats.totalSpent)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 2).map((t) => (
                        <Badge key={t} tone="green">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
