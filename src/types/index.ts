export type Role = 'super_admin' | 'org_admin' | 'manager' | 'staff' | 'host' | 'server'
export type BookingStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'
export type BookingSource = 'phone' | 'web' | 'walk-in' | 'instagram' | 'opentable' | 'google'
export type Department = 'foh' | 'boh' | 'management'
export type TableShape = 'circle' | 'rect'
export type TableArea = 'indoor' | 'patio' | 'bar' | 'private'

export interface Organization {
  id: string
  name: string
}

export interface Location {
  id: string
  organizationId: string
  name: string
  city: string
  neighborhood: string
}

export interface UserProfile {
  id: string
  name: string
  role: Role
  avatarUrl?: string
}

export interface Customer {
  id: string
  organizationId: string
  locationId: string
  fullName: string
  email: string
  phone: string
  avatarUrl?: string
  birthday?: string
  source: BookingSource | 'referral' | 'instagram'
  customerType: 'vip' | 'regular' | 'new'
  marketingConsent: boolean
  acceptsDelivery: boolean
  notes: string
  dietaryNotes: string
  preferredSeating: string
  preferredArea: string
  timePreference: string
  otherPreferences: string
  pointsEarned: number
  pointsBalance: number
  pageVisits: number
  memberSince: string
  tags: string[]
}

export interface RestaurantTable {
  id: string
  locationId: string
  label: string
  capacity: number
  shape: TableShape
  area: TableArea
  posX: number
  posY: number
  width: number
  height: number
}

export interface Booking {
  id: string
  organizationId: string
  locationId: string
  customerId: string
  guestName: string
  bookingAt: string
  partySize: number
  source: BookingSource
  status: BookingStatus
  tableId?: string
  notes?: string
}

export interface MenuItem {
  id: string
  locationId: string
  name: string
  category: string
  price: number
  imageEmoji: string
}

export interface Order {
  id: string
  organizationId: string
  locationId: string
  customerId?: string
  bookingId?: string
  tableId?: string
  serverName: string
  orderedAt: string
  total: number
  status: 'open' | 'paid' | 'void'
}

export interface OrderItem {
  id: string
  orderId: string
  menuItemId: string
  itemName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface StaffMember {
  id: string
  locationId: string
  fullName: string
  department: Department
  hourlyRate: number
  isActive: boolean
}

export interface Shift {
  id: string
  locationId: string
  staffId: string
  startsAt: string
  endsAt: string
  status: 'scheduled' | 'clocked_in' | 'completed'
}

export interface Campaign {
  id: string
  locationId: string
  name: string
  description: string
  type: 'email' | 'sms'
  sentAt: string
  recipientsCount: number
  openRate: number
}

export interface AppData {
  organization: Organization
  locations: Location[]
  currentUser: UserProfile
  customers: Customer[]
  tables: RestaurantTable[]
  bookings: Booking[]
  menuItems: MenuItem[]
  orders: Order[]
  orderItems: OrderItem[]
  staff: StaffMember[]
  shifts: Shift[]
  campaigns: Campaign[]
}
