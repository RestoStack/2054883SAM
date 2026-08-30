# RestoStack SaaS — product map

Owned source: this GitHub repository.  
Live: https://restostacks.lovable.app · https://restostacks.com  

For developer access from any Cursor machine, start with [AGENTS.md](AGENTS.md) and [docs/ACCESS.md](docs/ACCESS.md).

## Positioning

Multi-location restaurant operating system. Operators manage reservations, guests, floor, orders, marketing, loyalty, and staff from one green-accent shadcn dashboard. **Public marketing is gated** (request a demo); sample access is via `/demo`, not open self-serve trial CTAs.

## Who tries it

| Role | Entry | Home |
|------|--------|------|
| Prospect (lead) | `/` → Request a demo | Follow-up from `waitlist_signups` |
| Owner / Super Admin (sample) | `/demo` or `/admin-login` | `/dashboard` |
| Owner (internal signup) | `/signup` → `/onboarding` (not marketed) | `/dashboard` |
| Host | Staff PIN on `/login` | `/host-stand` |
| Server | Staff PIN on `/login` | `/server-app` |
| Mobile staff / owner | After login → `/app` | PWA role shell |
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
- Product Analytics, Marketing (catch-back, email/SMS drafts, campaigns pages), Loyalty

### Back office
- Reports, Staff, Leaderboard, Payroll, Integrations, Settings

### Public / entry
- Marketing site `/` (demo request CTAs only)
- Guest book `/book/{slug}` (demo: `/book/italian-bistro`)
- Sample `/demo`
- Logins `/login`, `/admin-login`
- Mobile PWA `/app`
- Pitch `/pitchdeck`

## Data model (Supabase)

Tenant key: `restaurant_id` on all `v2_*` tables. Schema lives in `supabase/migrations/`. Details: [docs/SUPABASE.md](docs/SUPABASE.md).

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
| `waitlist_signups` | Demo request leads |

## Design lock

Keep the existing Restostacks visual system: green success accent, sidebar nav, card density for admin surfaces, Bella Vista–style public booking page themed per restaurant brand.
