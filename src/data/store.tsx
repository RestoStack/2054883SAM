import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createSeedData, DEMO_TODAY } from '@/data/seed'
import type { AppData, Booking, BookingStatus, Customer } from '@/types'

interface AppStoreValue {
  data: AppData
  locationId: string
  setLocationId: (id: string) => void
  selectedDay: string
  setSelectedDay: (day: string) => void
  location: AppData['locations'][number]
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void
  assignTable: (bookingId: string, tableId: string) => void
  addBooking: (booking: Omit<Booking, 'id' | 'organizationId'>) => void
  updateCustomer: (customerId: string, patch: Partial<Customer>) => void
  addCustomerTag: (customerId: string, tag: string) => void
  removeCustomerTag: (customerId: string, tag: string) => void
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => createSeedData())
  const [locationId, setLocationId] = useState(data.locations[0].id)
  const [selectedDay, setSelectedDay] = useState(DEMO_TODAY)

  const location = useMemo(
    () => data.locations.find((l) => l.id === locationId) ?? data.locations[0],
    [data.locations, locationId],
  )

  const updateBookingStatus = useCallback((bookingId: string, status: BookingStatus) => {
    setData((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) => (b.id === bookingId ? { ...b, status } : b)),
    }))
  }, [])

  const assignTable = useCallback((bookingId: string, tableId: string) => {
    setData((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) => (b.id === bookingId ? { ...b, tableId } : b)),
    }))
  }, [])

  const addBooking = useCallback((booking: Omit<Booking, 'id' | 'organizationId'>) => {
    setData((prev) => ({
      ...prev,
      bookings: [
        {
          ...booking,
          id: `bk_${crypto.randomUUID().slice(0, 8)}`,
          organizationId: prev.organization.id,
        },
        ...prev.bookings,
      ],
    }))
  }, [])

  const updateCustomer = useCallback((customerId: string, patch: Partial<Customer>) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => (c.id === customerId ? { ...c, ...patch } : c)),
    }))
  }, [])

  const addCustomerTag = useCallback((customerId: string, tag: string) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === customerId && !c.tags.includes(tag) ? { ...c, tags: [...c.tags, tag] } : c,
      ),
    }))
  }, [])

  const removeCustomerTag = useCallback((customerId: string, tag: string) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === customerId ? { ...c, tags: c.tags.filter((t) => t !== tag) } : c,
      ),
    }))
  }, [])

  const value = useMemo(
    () => ({
      data,
      locationId,
      setLocationId,
      selectedDay,
      setSelectedDay,
      location,
      updateBookingStatus,
      assignTable,
      addBooking,
      updateCustomer,
      addCustomerTag,
      removeCustomerTag,
    }),
    [
      data,
      locationId,
      selectedDay,
      location,
      updateBookingStatus,
      assignTable,
      addBooking,
      updateCustomer,
      addCustomerTag,
      removeCustomerTag,
    ],
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
