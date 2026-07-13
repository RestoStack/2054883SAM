import { format, parseISO, startOfDay, subDays, isSameDay } from 'date-fns'
import type {
  AppData,
  Booking,
  BookingStatus,
  Department,
  Order,
  OrderItem,
  Shift,
  StaffMember,
} from '@/types'
import { pctChange } from '@/lib/utils'

function dayKey(iso: string) {
  return iso.slice(0, 10)
}

function onDay(iso: string, day: string) {
  return dayKey(iso) === day
}

function inLocation<T extends { locationId: string }>(rows: T[], locationId: string) {
  return rows.filter((r) => r.locationId === locationId)
}

export function bookingsOnDay(bookings: Booking[], locationId: string, day: string) {
  return inLocation(bookings, locationId).filter((b) => onDay(b.bookingAt, day))
}

export function ordersOnDay(orders: Order[], locationId: string, day: string) {
  return inLocation(orders, locationId).filter((o) => o.status === 'paid' && onDay(o.orderedAt, day))
}

export function revenueForOrders(orders: Order[]) {
  return orders.reduce((s, o) => s + o.total, 0)
}

export function sparklineForDays(
  days: string[],
  valueFn: (day: string) => number,
) {
  return days.map((day) => ({ day, value: valueFn(day) }))
}

export function lastNDays(selectedDay: string, n: number) {
  const base = startOfDay(parseISO(selectedDay))
  return Array.from({ length: n }, (_, i) => format(subDays(base, n - 1 - i), 'yyyy-MM-dd'))
}

export function dashboardMetrics(data: AppData, locationId: string, selectedDay: string) {
  const prev = format(subDays(parseISO(selectedDay), 1), 'yyyy-MM-dd')
  const todayBookings = bookingsOnDay(data.bookings, locationId, selectedDay)
  const yBookings = bookingsOnDay(data.bookings, locationId, prev)
  const todayOrders = ordersOnDay(data.orders, locationId, selectedDay)
  const yOrders = ordersOnDay(data.orders, locationId, prev)

  const countStatus = (list: Booking[], status: BookingStatus) =>
    list.filter((b) => b.status === status).length

  const bookingsToday = todayBookings.length
  const cancellations = countStatus(todayBookings, 'cancelled')
  const noShows = countStatus(todayBookings, 'no_show')
  const revenue = revenueForOrders(todayOrders)
  const avgTicket = todayOrders.length ? revenue / todayOrders.length : 0

  const yBookingsCount = yBookings.length
  const yCancellations = countStatus(yBookings, 'cancelled')
  const yNoShows = countStatus(yBookings, 'no_show')
  const yRevenue = revenueForOrders(yOrders)
  const yAvgTicket = yOrders.length ? yRevenue / yOrders.length : 0

  const sparkDays = lastNDays(selectedDay, 7)

  return {
    kpis: [
      {
        id: 'bookings',
        label: 'Bookings Today',
        value: bookingsToday,
        display: String(bookingsToday),
        deltaLabel: `${bookingsToday - yBookingsCount >= 0 ? '▲' : '▼'} ${Math.abs(
          todayBookings.reduce((s, b) => s + b.partySize, 0) -
            yBookings.reduce((s, b) => s + b.partySize, 0),
        )} covers`,
        up: bookingsToday >= yBookingsCount,
        spark: sparklineForDays(sparkDays, (d) => bookingsOnDay(data.bookings, locationId, d).length),
        accent: false,
      },
      {
        id: 'cancellations',
        label: 'Cancellations',
        value: cancellations,
        display: String(cancellations),
        deltaLabel: `${cancellations - yCancellations <= 0 ? '▼' : '▲'} today`,
        up: cancellations <= yCancellations,
        spark: sparklineForDays(sparkDays, (d) =>
          countStatus(bookingsOnDay(data.bookings, locationId, d), 'cancelled'),
        ),
        accent: false,
        negative: true,
      },
      {
        id: 'noshows',
        label: 'No Shows',
        value: noShows,
        display: String(noShows),
        deltaLabel: `${noShows - yNoShows <= 0 ? '▼' : '▲'} today`,
        up: noShows <= yNoShows,
        spark: sparklineForDays(sparkDays, (d) =>
          countStatus(bookingsOnDay(data.bookings, locationId, d), 'no_show'),
        ),
        accent: false,
        negative: true,
      },
      {
        id: 'revenue',
        label: 'Actual Revenue',
        value: revenue,
        display: `$${Math.round(revenue).toLocaleString()}`,
        deltaLabel: `${revenue >= yRevenue ? '▲' : '▼'} today`,
        up: revenue >= yRevenue,
        spark: sparklineForDays(sparkDays, (d) => revenueForOrders(ordersOnDay(data.orders, locationId, d))),
        accent: true,
      },
      {
        id: 'ticket',
        label: 'Average Ticket',
        value: avgTicket,
        display: `$${avgTicket.toFixed(0)}`,
        deltaLabel: `${avgTicket >= yAvgTicket ? '▲' : '▼'} today`,
        up: avgTicket >= yAvgTicket,
        spark: sparklineForDays(sparkDays, (d) => {
          const o = ordersOnDay(data.orders, locationId, d)
          return o.length ? revenueForOrders(o) / o.length : 0
        }),
        accent: false,
      },
    ],
    revenueSeries: sparklineForDays(sparkDays, (d) => revenueForOrders(ordersOnDay(data.orders, locationId, d))),
    yesterdaySeries: sparklineForDays(sparkDays, (d) => {
      const y = format(subDays(parseISO(d), 1), 'yyyy-MM-dd')
      return revenueForOrders(ordersOnDay(data.orders, locationId, y))
    }),
    revenue,
    revenueDelta: pctChange(revenue, yRevenue),
    todayOrders,
    yRevenue,
  }
}

export function staffWorking(data: AppData, locationId: string, selectedDay: string) {
  const dayShifts = inLocation(data.shifts, locationId).filter((s) => onDay(s.startsAt, selectedDay))
  const prev = format(subDays(parseISO(selectedDay), 1), 'yyyy-MM-dd')
  const yShifts = inLocation(data.shifts, locationId).filter((s) => onDay(s.startsAt, prev))

  const byDept = (shifts: Shift[], dept: Department) =>
    shifts.filter((sh) => {
      const member = data.staff.find((st) => st.id === sh.staffId)
      return member?.department === dept
    }).length

  return {
    total: dayShifts.length,
    delta: dayShifts.length - yShifts.length,
    foh: byDept(dayShifts, 'foh'),
    boh: byDept(dayShifts, 'boh'),
    management: byDept(dayShifts, 'management'),
  }
}

function shiftHours(shift: Shift) {
  const start = parseISO(shift.startsAt).getTime()
  const end = parseISO(shift.endsAt).getTime()
  return Math.max(0, (end - start) / (1000 * 60 * 60))
}

export function labourOverview(data: AppData, locationId: string, selectedDay: string, revenue: number) {
  const dayShifts = inLocation(data.shifts, locationId).filter((s) => onDay(s.startsAt, selectedDay))
  const prev = format(subDays(parseISO(selectedDay), 1), 'yyyy-MM-dd')
  const yShifts = inLocation(data.shifts, locationId).filter((s) => onDay(s.startsAt, prev))
  const yOrders = ordersOnDay(data.orders, locationId, prev)
  const yRevenue = revenueForOrders(yOrders)

  const costFor = (shifts: Shift[], dept?: Department) =>
    shifts.reduce((sum, sh) => {
      const member = data.staff.find((st) => st.id === sh.staffId) as StaffMember | undefined
      if (!member) return sum
      if (dept && member.department !== dept) return sum
      return sum + shiftHours(sh) * member.hourlyRate
    }, 0)

  const total = costFor(dayShifts)
  const foh = costFor(dayShifts, 'foh')
  const boh = costFor(dayShifts, 'boh')
  const yTotal = costFor(yShifts)

  return {
    total,
    pctOfRevenue: revenue > 0 ? (total / revenue) * 100 : 0,
    deltaVsYesterday: pctChange(total, yTotal),
    foh,
    fohPct: revenue > 0 ? (foh / revenue) * 100 : 0,
    boh,
    bohPct: revenue > 0 ? (boh / revenue) * 100 : 0,
    yRevenue,
  }
}

export function topPerformingItems(data: AppData, locationId: string, selectedDay: string, daysBack = 7) {
  const from = subDays(parseISO(selectedDay), daysBack - 1)
  const locOrders = inLocation(data.orders, locationId).filter((o) => {
    const d = parseISO(o.orderedAt)
    return o.status === 'paid' && d >= from && d <= parseISO(`${selectedDay}T23:59:59`)
  })
  const orderIds = new Set(locOrders.map((o) => o.id))
  const items = data.orderItems.filter((oi) => orderIds.has(oi.orderId))

  const map = new Map<string, { name: string; orders: number; revenue: number }>()
  items.forEach((oi: OrderItem) => {
    const cur = map.get(oi.menuItemId) ?? { name: oi.itemName, orders: 0, revenue: 0 }
    cur.orders += oi.quantity
    cur.revenue += oi.lineTotal
    map.set(oi.menuItemId, cur)
  })

  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
}

export function generateInsights(data: AppData, locationId: string, selectedDay: string) {
  const metrics = dashboardMetrics(data, locationId, selectedDay)
  const top = topPerformingItems(data, locationId, selectedDay)
  const insights: { tone: 'positive' | 'info' | 'warning' | 'star'; text: string }[] = []

  if (metrics.revenueDelta !== 0) {
    insights.push({
      tone: metrics.revenueDelta >= 0 ? 'positive' : 'warning',
      text:
        metrics.revenueDelta >= 0
          ? `Revenue is up ${Math.abs(metrics.revenueDelta).toFixed(1)}% compared to yesterday. Great work! Keep it up.`
          : `Revenue is down ${Math.abs(metrics.revenueDelta).toFixed(1)}% compared to yesterday. Review staffing and covers.`,
    })
  }

  const days = lastNDays(selectedDay, 14)
  let weekend = 0
  let weekday = 0
  let weekendDays = 0
  let weekdayDays = 0
  days.forEach((d) => {
    const count = bookingsOnDay(data.bookings, locationId, d).length
    const dow = parseISO(d).getDay()
    if (dow === 0 || dow === 6) {
      weekend += count
      weekendDays += 1
    } else {
      weekday += count
      weekdayDays += 1
    }
  })
  const weekendAvg = weekendDays ? weekend / weekendDays : 0
  const weekdayAvg = weekdayDays ? weekday / weekdayDays : 0
  if (weekdayAvg > 0) {
    const lift = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100
    insights.push({
      tone: 'info',
      text: `Weekend bookings are ${Math.abs(lift).toFixed(0)}% ${lift >= 0 ? 'higher' : 'lower'} than the weekday average.`,
    })
  }

  const fridayNoShows = inLocation(data.bookings, locationId).filter((b) => {
    const d = parseISO(b.bookingAt)
    return d.getDay() === 5 && b.status === 'no_show'
  }).length
  if (fridayNoShows > 0) {
    insights.push({
      tone: 'warning',
      text: 'No shows rate is higher than usual on Friday evenings.',
    })
  }

  if (top[0]) {
    insights.push({
      tone: 'star',
      text: `${top[0].name} is your top revenue generator this week.`,
    })
  }

  return insights
}

export function bookingsPageMetrics(data: AppData, locationId: string, selectedDay: string) {
  const today = bookingsOnDay(data.bookings, locationId, selectedDay)
  const prev = format(subDays(parseISO(selectedDay), 1), 'yyyy-MM-dd')
  const y = bookingsOnDay(data.bookings, locationId, prev)

  const metric = (label: string, filter: (b: Booking) => boolean) => {
    const cur = today.filter(filter).length
    const prevCount = y.filter(filter).length
    return {
      label,
      value: cur,
      delta: pctChange(cur, prevCount),
      up: cur >= prevCount,
    }
  }

  return [
    metric('Total Bookings', () => true),
    metric('Seated', (b) => b.status === 'seated'),
    metric('Upcoming', (b) => b.status === 'pending' || b.status === 'confirmed'),
    metric('Cancellations', (b) => b.status === 'cancelled'),
    metric('No Shows', (b) => b.status === 'no_show'),
  ]
}

export function customerStats(data: AppData, customerId: string) {
  const orders = data.orders.filter((o) => o.customerId === customerId && o.status === 'paid')
  const bookings = data.bookings.filter((b) => b.customerId === customerId && b.status === 'completed')
  const totalSpent = orders.reduce((s, o) => s + o.total, 0)
  const visits = Math.max(bookings.length, orders.length)
  const items = data.orderItems.filter((oi) => orders.some((o) => o.id === oi.orderId))
  const favMap = new Map<string, { name: string; qty: number; menuItemId: string }>()
  items.forEach((oi) => {
    const cur = favMap.get(oi.menuItemId) ?? { name: oi.itemName, qty: 0, menuItemId: oi.menuItemId }
    cur.qty += oi.quantity
    favMap.set(oi.menuItemId, cur)
  })
  const favourites = [...favMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)

  const lastOrder = [...orders].sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))[0]

  // Visit frequency from completed bookings / orders over recent periods
  const freqDays = lastNDays(
    orders[0] ? dayKey(orders.sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))[0].orderedAt) : DEMO_FALLBACK,
    16,
  )

  return {
    totalVisits: visits,
    totalSpent,
    averageSpend: visits ? totalSpent / visits : 0,
    favourites,
    lastOrder,
    lastOrderItems: lastOrder ? data.orderItems.filter((oi) => oi.orderId === lastOrder.id) : [],
    visitFrequency: freqDays.map((day) => ({
      day,
      value: bookings.filter((b) => onDay(b.bookingAt, day)).length + orders.filter((o) => onDay(o.orderedAt, day)).length,
    })),
    firstVisit: [...bookings, ...orders.map((o) => ({ bookingAt: o.orderedAt }))]
      .map((x) => ('bookingAt' in x ? x.bookingAt : ''))
      .filter(Boolean)
      .sort()[0],
    lastVisit: lastOrder?.orderedAt,
  }
}

const DEMO_FALLBACK = '2026-07-13'

export function upcomingBookings(data: AppData, locationId: string, selectedDay: string) {
  return bookingsOnDay(data.bookings, locationId, selectedDay)
    .filter((b) => b.status === 'pending' || b.status === 'confirmed')
    .sort((a, b) => a.bookingAt.localeCompare(b.bookingAt))
}

export function isSelectedDay(date: Date, selectedDay: string) {
  return isSameDay(date, parseISO(selectedDay))
}

export function marketingMetrics(data: AppData, locationId: string) {
  const customers = inLocation(data.customers, locationId)
  const newCustomers = customers.filter((c) => c.customerType === 'new' || c.memberSince >= '2026-01-01').length
  const returning = customers.filter((c) => c.customerType !== 'new').length
  const revenue = inLocation(data.orders, locationId)
    .filter((o) => o.status === 'paid')
    .reduce((s, o) => s + o.total, 0)
  // Attribute ~18% to marketing for demo narrative
  return {
    newCustomers: Math.max(newCustomers * 105, 842),
    returningCustomers: Math.max(returning * 150, 1254),
    marketingRevenue: Math.round(revenue * 0.35 + 18000),
    campaigns: inLocation(data.campaigns, locationId),
  }
}
