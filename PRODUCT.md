# RestoStack SaaS — product map

Owned source: this GitHub repository.  
Optional live trial (while still published): https://restostacks.lovable.app  

## Positioning

Multi-location restaurant operating system. Operators manage reservations, guests, floor, orders, marketing, loyalty, and staff from one green-accent shadcn dashboard. Restaurants can self-serve: create an account, configure the venue, and share a public booking link.

## Who tries it

| Role | Entry | Home |
|------|--------|------|
| Owner / Super Admin | `/admin-login` or `/login` Admin tab | `/dashboard` |
| New restaurant owner | `/signup` → `/onboarding` | `/dashboard` |
| Host | Staff PIN on `/login` | `/host-stand` |
| Server | Staff PIN on `/login` | `/server-app` |
| Guest | `/book/{slug}` | Public booking page |

## Product surface

### Core ops
- **Dashboard** (`/dashboard`)
- **Host Stand** (`/host-stand`)
- **Server Pad** (`/server-app`)
- **Bookings** (`/bookings`) — use date filters / All upcoming for future reservations
- **Calendar**, **Orders**, **Customers**, **Menu**
- **Floorplan** (`/floorplan`) — table layout designer

### Growth
- Product Analytics, Marketing, Loyalty

### Back office
- Reports, Staff, Leaderboard, Payroll, Integrations, Settings

### Public / entry
- Marketing site `/`
- Guest book `/book/{slug}` (demo `/book` may redirect to a sample restaurant)
- Logins `/login`, `/admin-login`, `/signup`, `/onboarding`

## Data model (Supabase)

Tenant key: `restaurant_id` on all `v2_*` tables. Schema lives in `supabase/migrations/`.

| Table | Purpose |
|-------|---------|
| `v2_restaurants` | Tenant / location (+ hours, brand colors, booking copy) |
| `v2_users` | Staff linked to Auth |
| `v2_customers` | Guest CRM |
| `v2_bookings` | Reservations |
| `v2_tables` | Floor plan positions / capacity |
| `v2_menu_categories` / `v2_menu_items` | Menu |
| `v2_orders` / `v2_order_items` | POS tickets |
| `v2_shifts` | Labour |
| `v2_loyalty_transactions` | Points ledger |

## Design lock

Keep the existing Restostacks visual system: green success accent, sidebar nav, card density for admin surfaces, Bella Vista–style public booking page themed per restaurant brand.
