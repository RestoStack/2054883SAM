import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'

export function Sparkline({
  data,
  color = '#16a34a',
  negative = false,
}: {
  data: { value: number }[]
  color?: string
  negative?: boolean
}) {
  const stroke = negative ? '#ef4444' : color
  const fill = negative ? '#fecaca' : '#bbf7d0'
  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area type="monotone" dataKey="value" stroke={stroke} fill={fill} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RevenueChart({
  series,
  compare,
}: {
  series: { day: string; value: number }[]
  compare: { day: string; value: number }[]
}) {
  const data = series.map((s, i) => ({
    day: s.day.slice(5),
    actual: s.value,
    yesterday: compare[i]?.value ?? 0,
  }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
            formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, '']}
          />
          <Area type="monotone" dataKey="yesterday" stroke="#c4b5fd" fill="#ede9fe" strokeWidth={2} name="vs yesterday" />
          <Area type="monotone" dataKey="actual" stroke="#16a34a" fill="#bbf7d0" strokeWidth={2} name="Actual Revenue" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function VisitChart({ data }: { data: { day: string; value: number }[] }) {
  const mapped = data.map((d) => ({ ...d, label: d.day.slice(5) }))
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={mapped}>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Area type="monotone" dataKey="value" stroke="#16a34a" fill="#bbf7d0" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function KpiCard({
  label,
  display,
  deltaLabel,
  up,
  spark,
  accent,
  negative,
  onClick,
}: {
  label: string
  display: string
  deltaLabel: string
  up: boolean
  spark: { value: number }[]
  accent?: boolean
  negative?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md',
        accent ? 'border-brand ring-1 ring-brand/30' : 'border-border',
      )}
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-semibold tracking-tight">{display}</div>
          <div className={cn('mt-1 text-xs font-medium', up ? 'text-emerald-600' : 'text-rose-500')}>
            {deltaLabel}
          </div>
        </div>
        <Sparkline data={spark} negative={negative && !up} />
      </div>
    </button>
  )
}
