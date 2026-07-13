import type { AppData, Booking, Shift } from '@/types'

/** Fixed "today" so the demo always looks populated. */
export const DEMO_TODAY = '2026-07-13'

const ORG = 'org_1'
const LOC_1 = 'loc_downtown'
const LOC_2 = 'loc_brooklyn'

function iso(date: string, time = '12:00:00') {
  return `${date}T${time}`
}

function daysAgo(n: number) {
  const d = new Date(`${DEMO_TODAY}T12:00:00`)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function createSeedData(): AppData {
  const menuItems = [
    { id: 'mi_1', locationId: LOC_1, name: 'Truffle Pasta', category: 'Mains', price: 21, imageEmoji: '🍝' },
    { id: 'mi_2', locationId: LOC_1, name: 'Grilled Salmon', category: 'Mains', price: 22, imageEmoji: '🐟' },
    { id: 'mi_3', locationId: LOC_1, name: 'Margherita Pizza', category: 'Mains', price: 18, imageEmoji: '🍕' },
    { id: 'mi_4', locationId: LOC_1, name: 'Ribeye Steak', category: 'Mains', price: 20, imageEmoji: '🥩' },
    { id: 'mi_5', locationId: LOC_1, name: 'Tiramisu', category: 'Dessert', price: 12, imageEmoji: '🍰' },
    { id: 'mi_6', locationId: LOC_1, name: 'Chicken Alfredo', category: 'Mains', price: 19, imageEmoji: '🍗' },
    { id: 'mi_7', locationId: LOC_1, name: 'Caesar Salad', category: 'Starters', price: 14, imageEmoji: '🥗' },
    { id: 'mi_8', locationId: LOC_1, name: 'House Wine', category: 'Drinks', price: 11, imageEmoji: '🍷' },
  ]

  const customers = [
    {
      id: 'cu_emma',
      organizationId: ORG,
      locationId: LOC_1,
      fullName: 'Emma Johnson',
      email: 'emma.johnson@email.com',
      phone: '+1 (212) 555-0142',
      birthday: '1992-04-12',
      source: 'instagram' as const,
      customerType: 'vip' as const,
      marketingConsent: true,
      acceptsDelivery: true,
      notes: 'Prefers window seats. Allergic to nuts.',
      dietaryNotes: 'Allergic to nuts',
      preferredSeating: 'Window Seat',
      preferredArea: 'Indoor',
      timePreference: 'Evening',
      otherPreferences: 'Prefers quiet atmosphere',
      pointsEarned: 480,
      pointsBalance: 320,
      pageVisits: 250,
      memberSince: '2024-01-15',
      tags: ['VIP', 'Birthday This Month', 'High Spender', 'Instagram'],
    },
    {
      id: 'cu_jp',
      organizationId: ORG,
      locationId: LOC_1,
      fullName: 'Jean-Philippe Côté',
      email: 'jp.cote@email.com',
      phone: '+1 (646) 555-0198',
      source: 'phone' as const,
      customerType: 'regular' as const,
      marketingConsent: true,
      acceptsDelivery: false,
      notes: 'Large party regular. Prefers round tables.',
      dietaryNotes: '',
      preferredSeating: 'Booth',
      preferredArea: 'Indoor',
      timePreference: 'Evening',
      otherPreferences: '',
      pointsEarned: 210,
      pointsBalance: 140,
      pageVisits: 88,
      memberSince: '2024-06-02',
      tags: ['Regular', 'Large Party'],
    },
    {
      id: 'cu_sarah',
      organizationId: ORG,
      locationId: LOC_1,
      fullName: 'Sarah Chen',
      email: 'sarah.chen@email.com',
      phone: '+1 (917) 555-0110',
      source: 'web' as const,
      customerType: 'regular' as const,
      marketingConsent: true,
      acceptsDelivery: true,
      notes: '',
      dietaryNotes: 'Vegetarian',
      preferredSeating: 'Patio',
      preferredArea: 'Patio',
      timePreference: 'Lunch',
      otherPreferences: '',
      pointsEarned: 156,
      pointsBalance: 90,
      pageVisits: 64,
      memberSince: '2025-02-20',
      tags: ['Vegetarian'],
    },
    {
      id: 'cu_marcus',
      organizationId: ORG,
      locationId: LOC_1,
      fullName: 'Marcus Williams',
      email: 'marcus.w@email.com',
      phone: '+1 (212) 555-0177',
      source: 'opentable' as const,
      customerType: 'vip' as const,
      marketingConsent: false,
      acceptsDelivery: false,
      notes: 'Wine enthusiast',
      dietaryNotes: '',
      preferredSeating: 'Bar',
      preferredArea: 'Bar',
      timePreference: 'Evening',
      otherPreferences: 'Wine pairings',
      pointsEarned: 620,
      pointsBalance: 410,
      pageVisits: 190,
      memberSince: '2023-11-08',
      tags: ['VIP', 'Wine Club'],
    },
    {
      id: 'cu_aisha',
      organizationId: ORG,
      locationId: LOC_1,
      fullName: 'Aisha Rahman',
      email: 'aisha.r@email.com',
      phone: '+1 (347) 555-0133',
      source: 'google' as const,
      customerType: 'new' as const,
      marketingConsent: true,
      acceptsDelivery: true,
      notes: '',
      dietaryNotes: 'Halal',
      preferredSeating: 'Window Seat',
      preferredArea: 'Indoor',
      timePreference: 'Dinner',
      otherPreferences: '',
      pointsEarned: 40,
      pointsBalance: 40,
      pageVisits: 12,
      memberSince: '2026-06-01',
      tags: ['New'],
    },
    {
      id: 'cu_david',
      organizationId: ORG,
      locationId: LOC_1,
      fullName: 'David Park',
      email: 'david.park@email.com',
      phone: '+1 (718) 555-0166',
      source: 'phone' as const,
      customerType: 'regular' as const,
      marketingConsent: true,
      acceptsDelivery: false,
      notes: '',
      dietaryNotes: '',
      preferredSeating: 'Booth',
      preferredArea: 'Indoor',
      timePreference: 'Evening',
      otherPreferences: '',
      pointsEarned: 280,
      pointsBalance: 200,
      pageVisits: 110,
      memberSince: '2024-09-12',
      tags: ['Regular'],
    },
    {
      id: 'cu_lisa',
      organizationId: ORG,
      locationId: LOC_1,
      fullName: 'Lisa Nguyen',
      email: 'lisa.nguyen@email.com',
      phone: '+1 (929) 555-0181',
      source: 'instagram' as const,
      customerType: 'regular' as const,
      marketingConsent: true,
      acceptsDelivery: true,
      notes: 'Celebrates birthdays here often',
      dietaryNotes: 'Gluten-free',
      preferredSeating: 'Window Seat',
      preferredArea: 'Indoor',
      timePreference: 'Brunch',
      otherPreferences: '',
      pointsEarned: 340,
      pointsBalance: 220,
      pageVisits: 145,
      memberSince: '2024-03-22',
      tags: ['Gluten-Free', 'Instagram'],
    },
    {
      id: 'cu_tom',
      organizationId: ORG,
      locationId: LOC_1,
      fullName: 'Tom Bradley',
      email: 'tom.bradley@email.com',
      phone: '+1 (212) 555-0190',
      source: 'walk-in' as const,
      customerType: 'regular' as const,
      marketingConsent: false,
      acceptsDelivery: false,
      notes: '',
      dietaryNotes: '',
      preferredSeating: 'Bar',
      preferredArea: 'Bar',
      timePreference: 'Lunch',
      otherPreferences: '',
      pointsEarned: 95,
      pointsBalance: 60,
      pageVisits: 30,
      memberSince: '2025-08-14',
      tags: ['Walk-in'],
    },
  ]

  // Floor plan tables
  const tables = [
    { id: 't_501', locationId: LOC_1, label: '501', capacity: 2, shape: 'circle' as const, area: 'indoor' as const, posX: 40, posY: 40, width: 44, height: 44 },
    { id: 't_502', locationId: LOC_1, label: '502', capacity: 2, shape: 'circle' as const, area: 'indoor' as const, posX: 110, posY: 40, width: 44, height: 44 },
    { id: 't_503', locationId: LOC_1, label: '503', capacity: 4, shape: 'rect' as const, area: 'indoor' as const, posX: 180, posY: 36, width: 64, height: 48 },
    { id: 't_504', locationId: LOC_1, label: '504', capacity: 4, shape: 'rect' as const, area: 'indoor' as const, posX: 270, posY: 36, width: 64, height: 48 },
    { id: 't_505', locationId: LOC_1, label: '505', capacity: 6, shape: 'rect' as const, area: 'indoor' as const, posX: 360, posY: 30, width: 80, height: 56 },
    { id: 't_401', locationId: LOC_1, label: '401', capacity: 4, shape: 'rect' as const, area: 'indoor' as const, posX: 40, posY: 120, width: 64, height: 48 },
    { id: 't_402', locationId: LOC_1, label: '402', capacity: 4, shape: 'rect' as const, area: 'indoor' as const, posX: 130, posY: 120, width: 64, height: 48 },
    { id: 't_403', locationId: LOC_1, label: '403', capacity: 2, shape: 'circle' as const, area: 'indoor' as const, posX: 220, posY: 124, width: 44, height: 44 },
    { id: 't_404', locationId: LOC_1, label: '404', capacity: 8, shape: 'rect' as const, area: 'indoor' as const, posX: 290, posY: 112, width: 100, height: 56 },
    { id: 't_12', locationId: LOC_1, label: '12', capacity: 4, shape: 'rect' as const, area: 'indoor' as const, posX: 40, posY: 200, width: 64, height: 48 },
    { id: 't_t1', locationId: LOC_1, label: 'T1', capacity: 2, shape: 'circle' as const, area: 'patio' as const, posX: 40, posY: 280, width: 44, height: 44 },
    { id: 't_t2', locationId: LOC_1, label: 'T2', capacity: 2, shape: 'circle' as const, area: 'patio' as const, posX: 110, posY: 280, width: 44, height: 44 },
    { id: 't_t3', locationId: LOC_1, label: 'T3', capacity: 4, shape: 'rect' as const, area: 'patio' as const, posX: 180, posY: 276, width: 64, height: 48 },
    { id: 't_b1', locationId: LOC_1, label: 'B1', capacity: 2, shape: 'rect' as const, area: 'bar' as const, posX: 360, posY: 200, width: 48, height: 36 },
    { id: 't_b2', locationId: LOC_1, label: 'B2', capacity: 2, shape: 'rect' as const, area: 'bar' as const, posX: 360, posY: 250, width: 48, height: 36 },
  ]

  const today = DEMO_TODAY
  const yesterday = daysAgo(1)

  const bookings: Booking[] = [
    // Today
    { id: 'bk_1', organizationId: ORG, locationId: LOC_1, customerId: 'cu_jp', guestName: 'Jean-Philippe Côté', bookingAt: iso(today, '18:30:00'), partySize: 6, source: 'phone', status: 'pending', tableId: 't_505' },
    { id: 'bk_2', organizationId: ORG, locationId: LOC_1, customerId: 'cu_emma', guestName: 'Emma Johnson', bookingAt: iso(today, '19:00:00'), partySize: 2, source: 'instagram', status: 'confirmed', tableId: 't_501' },
    { id: 'bk_3', organizationId: ORG, locationId: LOC_1, customerId: 'cu_sarah', guestName: 'Sarah Chen', bookingAt: iso(today, '12:30:00'), partySize: 3, source: 'web', status: 'seated', tableId: 't_402' },
    { id: 'bk_4', organizationId: ORG, locationId: LOC_1, customerId: 'cu_marcus', guestName: 'Marcus Williams', bookingAt: iso(today, '20:00:00'), partySize: 4, source: 'opentable', status: 'confirmed', tableId: 't_404' },
    { id: 'bk_5', organizationId: ORG, locationId: LOC_1, customerId: 'cu_aisha', guestName: 'Aisha Rahman', bookingAt: iso(today, '17:00:00'), partySize: 2, source: 'google', status: 'confirmed', tableId: 't_502' },
    { id: 'bk_6', organizationId: ORG, locationId: LOC_1, customerId: 'cu_david', guestName: 'David Park', bookingAt: iso(today, '13:00:00'), partySize: 4, source: 'phone', status: 'completed', tableId: 't_12' },
    { id: 'bk_7', organizationId: ORG, locationId: LOC_1, customerId: 'cu_lisa', guestName: 'Lisa Nguyen', bookingAt: iso(today, '19:30:00'), partySize: 5, source: 'instagram', status: 'confirmed', tableId: 't_403' },
    { id: 'bk_8', organizationId: ORG, locationId: LOC_1, customerId: 'cu_tom', guestName: 'Tom Bradley', bookingAt: iso(today, '11:30:00'), partySize: 2, source: 'walk-in', status: 'completed', tableId: 't_b1' },
    { id: 'bk_9', organizationId: ORG, locationId: LOC_1, customerId: 'cu_sarah', guestName: 'Sarah Chen', bookingAt: iso(today, '21:00:00'), partySize: 2, source: 'web', status: 'cancelled' },
    { id: 'bk_10', organizationId: ORG, locationId: LOC_1, customerId: 'cu_tom', guestName: 'Tom Bradley', bookingAt: iso(today, '18:00:00'), partySize: 3, source: 'phone', status: 'no_show', tableId: 't_401' },
    // Yesterday
    { id: 'bk_y1', organizationId: ORG, locationId: LOC_1, customerId: 'cu_emma', guestName: 'Emma Johnson', bookingAt: iso(yesterday, '19:00:00'), partySize: 2, source: 'instagram', status: 'completed', tableId: 't_501' },
    { id: 'bk_y2', organizationId: ORG, locationId: LOC_1, customerId: 'cu_marcus', guestName: 'Marcus Williams', bookingAt: iso(yesterday, '20:00:00'), partySize: 4, source: 'opentable', status: 'completed', tableId: 't_404' },
    { id: 'bk_y3', organizationId: ORG, locationId: LOC_1, customerId: 'cu_david', guestName: 'David Park', bookingAt: iso(yesterday, '18:30:00'), partySize: 3, source: 'phone', status: 'cancelled' },
    { id: 'bk_y4', organizationId: ORG, locationId: LOC_1, customerId: 'cu_lisa', guestName: 'Lisa Nguyen', bookingAt: iso(yesterday, '12:00:00'), partySize: 2, source: 'web', status: 'completed', tableId: 't_12' },
    { id: 'bk_y5', organizationId: ORG, locationId: LOC_1, customerId: 'cu_jp', guestName: 'Jean-Philippe Côté', bookingAt: iso(yesterday, '19:30:00'), partySize: 6, source: 'phone', status: 'no_show' },
    { id: 'bk_y6', organizationId: ORG, locationId: LOC_1, customerId: 'cu_aisha', guestName: 'Aisha Rahman', bookingAt: iso(yesterday, '17:30:00'), partySize: 2, source: 'google', status: 'completed', tableId: 't_502' },
    { id: 'bk_y7', organizationId: ORG, locationId: LOC_1, customerId: 'cu_tom', guestName: 'Tom Bradley', bookingAt: iso(yesterday, '13:00:00'), partySize: 2, source: 'walk-in', status: 'completed', tableId: 't_b1' },
    { id: 'bk_y8', organizationId: ORG, locationId: LOC_1, customerId: 'cu_sarah', guestName: 'Sarah Chen', bookingAt: iso(yesterday, '18:00:00'), partySize: 3, source: 'web', status: 'completed', tableId: 't_402' },
  ]

  // Historical bookings for Emma visit frequency + more volume
  for (let i = 2; i <= 30; i++) {
    const day = daysAgo(i)
    const weekend = [0, 6].includes(new Date(`${day}T12:00:00`).getDay())
    const count = weekend ? 6 : 4
    for (let j = 0; j < count; j++) {
      const cust = customers[j % customers.length]
      bookings.push({
        id: `bk_h_${i}_${j}`,
        organizationId: ORG,
        locationId: LOC_1,
        customerId: cust.id,
        guestName: cust.fullName,
        bookingAt: iso(day, `${17 + (j % 4)}:${j % 2 === 0 ? '00' : '30'}:00`),
        partySize: 2 + (j % 4),
        source: (cust.source === 'instagram' ? 'instagram' : cust.source === 'opentable' ? 'opentable' : cust.source === 'google' ? 'google' : cust.source === 'walk-in' ? 'walk-in' : cust.source === 'phone' ? 'phone' : 'web'),
        status: j === 0 && i % 7 === 0 ? 'cancelled' : j === 1 && i % 9 === 0 ? 'no_show' : 'completed',
        tableId: tables[j % tables.length].id,
      })
    }
  }

  // Emma past visits
  const emmaVisitDays = [3, 7, 12, 18, 24, 28, 35, 42, 50, 60, 75]
  emmaVisitDays.forEach((n, idx) => {
    bookings.push({
      id: `bk_emma_${idx}`,
      organizationId: ORG,
      locationId: LOC_1,
      customerId: 'cu_emma',
      guestName: 'Emma Johnson',
      bookingAt: iso(daysAgo(n), '19:30:00'),
      partySize: 2,
      source: 'instagram',
      status: 'completed',
      tableId: 't_12',
    })
  })

  // Orders for revenue — today + historical
  const orders: AppData['orders'] = []
  const orderItems: AppData['orderItems'] = []

  function addOrder(opts: {
    id: string
    date: string
    time: string
    customerId?: string
    tableId?: string
    serverName: string
    items: { menuItemId: string; qty: number }[]
  }) {
    const lines = opts.items.map((item, idx) => {
      const menu = menuItems.find((m) => m.id === item.menuItemId)!
      const lineTotal = menu.price * item.qty
      return {
        id: `${opts.id}_li_${idx}`,
        orderId: opts.id,
        menuItemId: menu.id,
        itemName: menu.name,
        quantity: item.qty,
        unitPrice: menu.price,
        lineTotal,
      }
    })
    const total = lines.reduce((s, l) => s + l.lineTotal, 0)
    orders.push({
      id: opts.id,
      organizationId: ORG,
      locationId: LOC_1,
      customerId: opts.customerId,
      tableId: opts.tableId,
      serverName: opts.serverName,
      orderedAt: iso(opts.date, opts.time),
      total,
      status: 'paid',
    })
    orderItems.push(...lines)
  }

  // Today orders
  addOrder({
    id: 'ord_t1',
    date: today,
    time: '12:45:00',
    customerId: 'cu_sarah',
    tableId: 't_402',
    serverName: 'Michael Brown',
    items: [
      { menuItemId: 'mi_3', qty: 1 },
      { menuItemId: 'mi_7', qty: 1 },
      { menuItemId: 'mi_8', qty: 2 },
    ],
  })
  addOrder({
    id: 'ord_t2',
    date: today,
    time: '13:20:00',
    customerId: 'cu_david',
    tableId: 't_12',
    serverName: 'Michael Brown',
    items: [
      { menuItemId: 'mi_1', qty: 2 },
      { menuItemId: 'mi_4', qty: 1 },
      { menuItemId: 'mi_5', qty: 2 },
      { menuItemId: 'mi_8', qty: 3 },
    ],
  })
  addOrder({
    id: 'ord_t3',
    date: today,
    time: '11:50:00',
    customerId: 'cu_tom',
    tableId: 't_b1',
    serverName: 'Ana Torres',
    items: [
      { menuItemId: 'mi_6', qty: 1 },
      { menuItemId: 'mi_8', qty: 1 },
    ],
  })
  addOrder({
    id: 'ord_t4',
    date: today,
    time: '14:10:00',
    customerId: 'cu_lisa',
    tableId: 't_401',
    serverName: 'Ana Torres',
    items: [
      { menuItemId: 'mi_2', qty: 2 },
      { menuItemId: 'mi_7', qty: 1 },
      { menuItemId: 'mi_5', qty: 1 },
    ],
  })

  // Yesterday orders (slightly lower)
  addOrder({
    id: 'ord_y1',
    date: yesterday,
    time: '19:15:00',
    customerId: 'cu_emma',
    tableId: 't_12',
    serverName: 'Michael Brown',
    items: [
      { menuItemId: 'mi_1', qty: 1 },
      { menuItemId: 'mi_6', qty: 1 },
      { menuItemId: 'mi_5', qty: 1 },
      { menuItemId: 'mi_8', qty: 2 },
    ],
  })
  addOrder({
    id: 'ord_y2',
    date: yesterday,
    time: '20:20:00',
    customerId: 'cu_marcus',
    tableId: 't_404',
    serverName: 'Ana Torres',
    items: [
      { menuItemId: 'mi_4', qty: 2 },
      { menuItemId: 'mi_2', qty: 1 },
      { menuItemId: 'mi_8', qty: 4 },
    ],
  })
  addOrder({
    id: 'ord_y3',
    date: yesterday,
    time: '12:30:00',
    customerId: 'cu_lisa',
    tableId: 't_12',
    serverName: 'Michael Brown',
    items: [
      { menuItemId: 'mi_3', qty: 2 },
      { menuItemId: 'mi_7', qty: 1 },
    ],
  })

  // Last 14 days revenue history
  for (let i = 2; i <= 14; i++) {
    const day = daysAgo(i)
    const weekendBoost = [0, 6].includes(new Date(`${day}T12:00:00`).getDay()) ? 1.25 : 1
    const orderCount = Math.round((3 + (i % 3)) * weekendBoost)
    for (let j = 0; j < orderCount; j++) {
      const picks = [menuItems[j % menuItems.length], menuItems[(j + 2) % menuItems.length], menuItems[(j + 4) % menuItems.length]]
      addOrder({
        id: `ord_h_${i}_${j}`,
        date: day,
        time: `${18 + (j % 3)}:${j % 2 === 0 ? '00' : '30'}:00`,
        customerId: customers[j % customers.length].id,
        tableId: tables[j % tables.length].id,
        serverName: j % 2 === 0 ? 'Michael Brown' : 'Ana Torres',
        items: picks.map((p, idx) => ({ menuItemId: p.id, qty: 1 + (idx % 2) })),
      })
    }
  }

  // Emma last visit order (May-like — use daysAgo 26 ≈ mid June for demo, but label as last visit)
  addOrder({
    id: 'ord_emma_last',
    date: daysAgo(26),
    time: '19:30:00',
    customerId: 'cu_emma',
    tableId: 't_12',
    serverName: 'Michael Brown',
    items: [
      { menuItemId: 'mi_1', qty: 1 },
      { menuItemId: 'mi_6', qty: 1 },
      { menuItemId: 'mi_3', qty: 1 },
      { menuItemId: 'mi_5', qty: 1 },
      { menuItemId: 'mi_8', qty: 2 },
    ],
  })

  // More Emma historical orders for spend totals
  emmaVisitDays.forEach((n, idx) => {
    if (n === 26) return
    addOrder({
      id: `ord_emma_${idx}`,
      date: daysAgo(n),
      time: '19:45:00',
      customerId: 'cu_emma',
      tableId: 't_12',
      serverName: 'Michael Brown',
      items: [
        { menuItemId: 'mi_1', qty: 1 },
        { menuItemId: menuItems[(idx + 1) % menuItems.length].id, qty: 1 },
        { menuItemId: 'mi_8', qty: 1 },
      ],
    })
  })

  const staff = [
    { id: 'st_1', locationId: LOC_1, fullName: 'Michael Brown', department: 'foh' as const, hourlyRate: 22, isActive: true },
    { id: 'st_2', locationId: LOC_1, fullName: 'Ana Torres', department: 'foh' as const, hourlyRate: 21, isActive: true },
    { id: 'st_3', locationId: LOC_1, fullName: 'James Lee', department: 'foh' as const, hourlyRate: 20, isActive: true },
    { id: 'st_4', locationId: LOC_1, fullName: 'Sofia Patel', department: 'foh' as const, hourlyRate: 20, isActive: true },
    { id: 'st_5', locationId: LOC_1, fullName: 'Chris Evans', department: 'foh' as const, hourlyRate: 19, isActive: true },
    { id: 'st_6', locationId: LOC_1, fullName: 'Maya Lopez', department: 'foh' as const, hourlyRate: 19, isActive: true },
    { id: 'st_7', locationId: LOC_1, fullName: 'Ryan Scott', department: 'foh' as const, hourlyRate: 18, isActive: true },
    { id: 'st_8', locationId: LOC_1, fullName: 'Nina Brooks', department: 'foh' as const, hourlyRate: 18, isActive: true },
    { id: 'st_9', locationId: LOC_1, fullName: 'Omar Hassan', department: 'foh' as const, hourlyRate: 18, isActive: true },
    { id: 'st_10', locationId: LOC_1, fullName: 'Emily White', department: 'foh' as const, hourlyRate: 17, isActive: true },
    { id: 'st_11', locationId: LOC_1, fullName: 'Jake Miller', department: 'foh' as const, hourlyRate: 17, isActive: true },
    { id: 'st_12', locationId: LOC_1, fullName: 'Priya Shah', department: 'foh' as const, hourlyRate: 18, isActive: true },
    { id: 'st_13', locationId: LOC_1, fullName: 'Luis Gomez', department: 'foh' as const, hourlyRate: 16, isActive: true },
    { id: 'st_14', locationId: LOC_1, fullName: 'Hannah Kim', department: 'foh' as const, hourlyRate: 16, isActive: true },
    { id: 'st_15', locationId: LOC_1, fullName: 'Chef Marco Rossi', department: 'boh' as const, hourlyRate: 32, isActive: true },
    { id: 'st_16', locationId: LOC_1, fullName: 'Sous Chef Yuki', department: 'boh' as const, hourlyRate: 26, isActive: true },
    { id: 'st_17', locationId: LOC_1, fullName: 'Line Cook Dan', department: 'boh' as const, hourlyRate: 20, isActive: true },
    { id: 'st_18', locationId: LOC_1, fullName: 'Line Cook Bea', department: 'boh' as const, hourlyRate: 20, isActive: true },
    { id: 'st_19', locationId: LOC_1, fullName: 'Prep Cook Sam', department: 'boh' as const, hourlyRate: 17, isActive: true },
    { id: 'st_20', locationId: LOC_1, fullName: 'Prep Cook Ali', department: 'boh' as const, hourlyRate: 17, isActive: true },
    { id: 'st_21', locationId: LOC_1, fullName: 'Dishwasher Pat', department: 'boh' as const, hourlyRate: 15, isActive: true },
    { id: 'st_22', locationId: LOC_1, fullName: 'Pastry Chef Rae', department: 'boh' as const, hourlyRate: 24, isActive: true },
    { id: 'st_23', locationId: LOC_1, fullName: 'Ghassan Khalil', department: 'management' as const, hourlyRate: 40, isActive: true },
    { id: 'st_24', locationId: LOC_1, fullName: 'Diana Foster', department: 'management' as const, hourlyRate: 35, isActive: true },
  ]

  const shifts: Shift[] = staff.map((s, idx) => ({
    id: `sh_${s.id}`,
    locationId: LOC_1,
    staffId: s.id,
    startsAt: iso(today, idx % 3 === 0 ? '10:00:00' : '16:00:00'),
    endsAt: iso(today, idx % 3 === 0 ? '18:00:00' : '23:00:00'),
    status: 'clocked_in',
  }))

  // Yesterday shifts (2 fewer FOH)
  staff.slice(0, 22).forEach((s) => {
    shifts.push({
      id: `sh_y_${s.id}`,
      locationId: LOC_1,
      staffId: s.id,
      startsAt: iso(yesterday, '16:00:00'),
      endsAt: iso(yesterday, '23:00:00'),
      status: 'completed',
    })
  })

  return {
    organization: { id: ORG, name: 'RestoStack Demo Group' },
    locations: [
      {
        id: LOC_1,
        organizationId: ORG,
        name: 'Italian Bistro',
        city: 'New York',
        neighborhood: 'Downtown',
      },
      {
        id: LOC_2,
        organizationId: ORG,
        name: 'Italian Bistro',
        city: 'New York',
        neighborhood: 'Brooklyn',
      },
    ],
    currentUser: {
      id: 'user_1',
      name: 'Ghassan Khalil',
      role: 'super_admin',
    },
    customers,
    tables,
    bookings,
    menuItems,
    orders,
    orderItems,
    staff,
    shifts,
    campaigns: [
      {
        id: 'camp_1',
        locationId: LOC_1,
        name: 'Weekend Special',
        description: '20% off pastas — sent to 2,483',
        type: 'email',
        sentAt: iso(daysAgo(3), '10:00:00'),
        recipientsCount: 2483,
        openRate: 42,
      },
      {
        id: 'camp_2',
        locationId: LOC_1,
        name: 'Win Back June',
        description: 'Free dessert for lapsed guests — sent to 1,120',
        type: 'email',
        sentAt: iso(daysAgo(8), '09:00:00'),
        recipientsCount: 1120,
        openRate: 36,
      },
      {
        id: 'camp_3',
        locationId: LOC_1,
        name: 'Summer Patio SMS',
        description: 'Patio happy hour — sent to 890',
        type: 'sms',
        sentAt: iso(daysAgo(12), '11:00:00'),
        recipientsCount: 890,
        openRate: 58,
      },
      {
        id: 'camp_4',
        locationId: LOC_1,
        name: 'VIP Truffle Night',
        description: 'Exclusive tasting invite — sent to 210',
        type: 'email',
        sentAt: iso(daysAgo(18), '14:00:00'),
        recipientsCount: 210,
        openRate: 71,
      },
    ],
  }
}
