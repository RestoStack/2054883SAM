# Supabase — project, schema, demo data

## Project

| Field | Value |
|-------|--------|
| Ref / ID | `taenbelgzntolqzzjsee` |
| URL | `https://taenbelgzntolqzzjsee.supabase.co` |
| Anon defaults | `src/integrations/supabase/config.ts` |
| Migrations | `supabase/migrations/` |

Client code should use publishable/anon key only. Service role: local `.env` never committed.

## Multi-tenancy

- Tenant key: `restaurant_id` on `v2_*` tables  
- Staff: `v2_users` linked via `auth_user_id` to Supabase Auth  
- Platform admins: `v2_platform_admin_allowlist` + `v2_claim_platform_admin()`  

## Core tables

| Table | Purpose |
|-------|---------|
| `v2_restaurants` | Tenant / location, hours, brand, booking copy |
| `v2_users` | Staff |
| `v2_customers` | Guest CRM |
| `v2_bookings` | Reservations |
| `v2_tables` | Floor plan |
| `v2_menu_categories` / `v2_menu_items` | Menu |
| `v2_orders` / `v2_order_items` | POS tickets / lines |
| `v2_shifts` | Labour / payroll source |
| `v2_loyalty_transactions` | Points ledger |
| `waitlist_signups` | Demo request leads from marketing |

Prefer application access via `src/lib/v2-data.ts`.

## Demo tenant snapshot (Italian Bistro)

Approximate live state when last audited (numbers drift):

| Entity | Approx |
|--------|--------|
| Restaurants | 1 (`italian-bistro`) |
| Staff | 4 (admin + Sophie / Alex / Marco) — Auth linked |
| Customers | ~20+ |
| Bookings | dozens (refresh dates for demos) |
| Orders | some headers; **line items often empty** |
| Menu | categories + items present |
| Tables | floor set present |
| Loyalty txns | often 0 until exercised |
| Open shifts | may be stale |

**Naming drift:** seed migrations may reference **Jukebox** / `jukebox`; live demo brand/slug is **Italian Bistro** / `italian-bistro`. Login email still `admin@jukebox.com`.

## Known data gaps

1. `v2_order_items` empty → order detail/analytics thin  
2. Loyalty transactions empty until earn/redeem used  
3. Waitlist may contain junk test names  
4. Stale open `v2_shifts` skew payroll demos  
5. `waitlist_signups` may need elevated grants for ops dashboards  

## Migrations

Apply with your usual Supabase workflow (CLI linked to the project, or Lovable Cloud DB tools). Do not invent destructive production migrations without review.

## Querying safely

- Prefer RLS-respecting anon/authenticated client during app work  
- Service role only for admin scripts / migrations, never shipped to browser  
- Always filter by `restaurant_id` in app logic even when RLS exists  
