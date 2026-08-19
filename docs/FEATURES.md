# Features — built vs missing

Status relative to the full-app feature branches (not empty `main`). Update this when shipping major capability.

## Built (usable in demo)

### Public / growth
- Marketing landing with **Request a demo** (name, email, phone, restaurant, best time) → `waitlist_signups`
- Guest booking `/book/{slug}` (demo: `/book/italian-bistro`)
- Pitch deck route
- One-click sample `/demo` (**demo ship mode only**)
- Ready-for-launch homepage (`LaunchLanding`) + `/launch` preview
- Terms `/terms` + Privacy `/privacy` + Health `/health`
- Invite-only signup gate (`src/lib/ship-mode.ts`; optional invite code)
- Server-side signup kill-switch (`v2_platform_settings`)

### Auth & roles
- Admin email/password login (`/admin-login`, `/login`)
- Staff PIN login → Host Stand / Server Pad
- Optional admin passcode on admin-login
- Auth bootstrap / restaurant context
- Mobile login path → `/app`

### Core ops
- Dashboard with date-aware summaries
- Host Stand (floor / wait / message dialog; waitlist poll ~15s)
- Server Pad (note: still partly tied to global v1 POS patterns — see readiness)
- Bookings + calendar
- Customers list + detail; add/edit
- Menu categories/items; edit + 86
- Floorplan designer
- Orders list

### Growth / back office
- Loyalty earn/redeem UI + ledger hooks
- Marketing hub: catch-back, email/SMS draft/export, creators/promotions/referral/reviews landing pages
- Product analytics
- Reports + date ranges
- Staff add + clock in/out
- Payroll from `v2_shifts`
- Leaderboard
- Settings (plan/team/locale)
- Integrations JSON store
- Mobile PWA shell `/app` (role tiles, bottom nav, install banner)

## Partial / thin

| Area | Reality |
|------|---------|
| Order line items | UI/orders exist; live demo `v2_order_items` often empty |
| Loyalty ledger | UI works; demo may have 0 transactions until exercised |
| Email / SMS | Draft + export — not a live ESP/SMS provider |
| Stripe / billing | Plan shown in settings; no real Stripe checkout |
| Server Pad POS | Not fully tenant-isolated modern POS |
| Realtime | Waitlist polling; not full realtime subscriptions everywhere |
| Public self-serve signup | Routes exist; marketing CTAs intentionally gated |

## Not built (intentional backlog)

- Hardened multi-tenant RLS for mass public
- Isolated demo vs production databases
- Real payment processing
- Production email/SMS delivery
- Custom domain per restaurant (beyond product domain)
- Full GDPR export/delete tooling
- Staging environment + monitoring/alerting pack
- Native iOS/Android stores (PWA only today)

See `docs/READINESS.md` for launch priority (P0–P2).
