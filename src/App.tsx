import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppStoreProvider } from '@/data/store'
import { AppShell, ComingSoon } from '@/components/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { BookingsPage } from '@/pages/BookingsPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { CustomerDetailPage } from '@/pages/CustomerDetailPage'
import { MarketingPage } from '@/pages/MarketingPage'

export default function App() {
  return (
    <AppStoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:customerId" element={<CustomerDetailPage />} />
            <Route path="marketing" element={<MarketingPage />} />
            <Route path="host" element={<ComingSoon title="Host Stand" />} />
            <Route path="server" element={<ComingSoon title="Server Pad" />} />
            <Route path="calendar" element={<ComingSoon title="Calendar" />} />
            <Route path="orders" element={<ComingSoon title="Orders" />} />
            <Route path="menu" element={<ComingSoon title="Menu" />} />
            <Route path="analytics" element={<ComingSoon title="Product Analytics" />} />
            <Route path="loyalty" element={<ComingSoon title="Loyalty" />} />
            <Route path="reports" element={<ComingSoon title="Reports" />} />
            <Route path="staff" element={<ComingSoon title="Staff" />} />
            <Route path="leaderboard" element={<ComingSoon title="Leaderboard" />} />
            <Route path="payroll" element={<ComingSoon title="Payroll" />} />
            <Route path="integrations" element={<ComingSoon title="Integrations" />} />
            <Route path="settings" element={<ComingSoon title="Settings" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppStoreProvider>
  )
}
