# RestoStack SaaS — product map (from Lovable Restostacks)

Source prototype: **Restostacks** on Lovable  
Live trial URL: https://restostacks.lovable.app  
Editor: https://lovable.dev/projects/282aa365-2256-4d7f-ac7b-f277286d2960

## Positioning
Multi-location restaurant operating system for restaurant groups. Operators manage reservations, guests, floor, orders, marketing, loyalty, and staff from one green-accent shadcn dashboard.

## Who tries it
| Role | Entry | Home |
|------|--------|------|
| Owner / Super Admin | `/admin-login` or `/login` Admin tab | `/dashboard` |
| Host | Staff PIN on `/login` | `/host-stand` |
| Server | Staff PIN on `/login` | `/server-app` |

## Product surface (same tabs as prototype)

### Core ops
- **Dashboard** (`/dashboard`) — KPIs, revenue chart, staff working, labour, top items, insights
- **Host Stand** (`/host-stand`) — floor / seating workflow
- **Server Pad** (`/server-app`) — table ordering
- **Bookings** (`/bookings`) — KPI strip, status tabs, table, detail drawer, floor plan, New Booking
- **Calendar** (`/calendar`) — reservation calendar
- **Orders** (`/orders`) — order list / tickets
- **Customers** (`/customers`, `/customers/$id`) — CRM list + Emma-style profile tabs
- **Menu** (`/menu`) — categories & items

### Growth
- **Product Analytics** (`/product-analytics`)
- **Marketing** (`/marketing` + email/sms/catch-back/creators/promotions/landing/reviews/referral)
- **Loyalty** (`/loyalty`)

### Back office
- **Reports**, **Staff**, **Leaderboard**, **Payroll**, **Integrations**, **Settings**

### Public / entry
- Marketing site `/`
- Guest book `/book`
- Logins `/login`, `/admin-login`

## Data model (already in Supabase)
Tenant key: `restaurant_id` on all `v2_*` tables.

| Table | Purpose |
|-------|---------|
| `v2_restaurants` | Tenant / location |
| `v2_users` | Staff linked to Auth (`admin` / `hostess` / `server`) |
| `v2_customers` | Guest CRM |
| `v2_bookings` | Reservations + status/source enums |
| `v2_tables` | Floor plan positions / capacity |
| `v2_menu_categories` / `v2_menu_items` | Menu |
| `v2_orders` / `v2_order_items` | POS tickets |
| `v2_shifts` | Labour / clock in-out |
| `v2_loyalty_transactions` | Points ledger |

## Trial experience (target)
1. Land on marketing site → **Try Italian Bistro demo**
2. Enter app as Super Admin with demo credentials (no install)
3. Click through Dashboard → Bookings → Customers → Marketing with **live** seeded data
4. Create a booking, change status, assign table — all persist
5. Optional: sign up a new restaurant (empty tenant) for a real trial

## Design lock
Keep existing Restostacks visual system: green success accent, sidebar nav labels, card density, Bookings detail panel + floor plan, customer profile tabs. No redesign.
