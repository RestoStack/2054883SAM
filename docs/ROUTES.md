# ROUTES.md — MVP route map

Roles: **anon** · **authenticated (no membership)** · **owner** · **manager** · **host** · **platform**.  
Subscription: unless noted, `/app/*` requires org `subscription.status ∈ {trialing, active}` else redirect `/billing/locked`.

Legacy flat paths (`/dashboard`, `/bookings`, …) are **redirected** to `/app/...` during Phase 0–1.

---

## Public (anon)

| Path | Purpose | Access |
|------|---------|--------|
| `/book/{slug}` | Public booking for a location | anon + auth |
| `/book/{slug}/confirm` | Confirmation (optional) | anon |
| `/health` | Liveness | anon |
| `/terms` | Terms | anon |
| `/privacy` | Privacy | anon |
| `/invite/{token}` | Accept invite (lands on auth if needed) | anon |
| `/login` | Email/password + Google | anon |
| `/auth/callback` | OAuth PKCE callback | anon |
| `/billing/return` | Stripe Checkout return | auth |
| `/` | Redirect → `/login` or `/app` (no marketing site in MVP) | anon |

**Not in MVP:** `/pitchdeck`, `/launch`, `/demo`, marketing pages, Server Pad.

---

## Auth / funnel

| Path | Purpose | Access |
|------|---------|--------|
| `/invite/{token}` | Step A entry — validate token | anon |
| `/invite/{token}/auth` | Google or email+password | token valid |
| `/billing/checkout` | Step B — Stripe Checkout / Elements | auth + owner invite (unpaid) |
| `/onboarding` | Step C — org + location wizard | auth + active/trialing sub + no completed onboarding |
| `/billing/locked` | Past due / canceled | auth + membership |
| `/billing/portal` | Redirect to Stripe Customer Portal | owner |

Team invites: `/invite/{token}` → auth → **skip billing** → `/app`.

---

## App shell (`/app`)

Base layout: org/location switcher, MVP nav only.

| Path | Purpose | owner | manager | host |
|------|---------|-------|---------|------|
| `/app` | Redirect → Dashboard | ✓ | ✓ | ✓ |
| `/app/dashboard` | Reservation metrics (read-only) | ✓ | ✓ | ✓ (read) |
| `/app/reports` | Tabular reports, CSV, presets | ✓ | ✓ | ✗ |
| `/app/bookings` | Reservation management (+ calendar views) | ✓ | ✓ | ✓ |
| `/app/host-stand` | Floor plan ops | ✓ | ✓ | ✓ |
| `/app/guests` | Guest CRM list | ✓ | ✓ | ✓ (limited) |
| `/app/guests/{id}` | Guest detail | ✓ | ✓ | ✓ (limited) |
| `/app/settings` | Settings hub | ✓ | ✓ | ✗ |
| `/app/settings/profile` | Org/location profile | ✓ | ✓ | ✗ |
| `/app/settings/hours` | Hours | ✓ | ✓ | ✗ |
| `/app/settings/locations` | Locations CRUD | ✓ | ✓* | ✗ |
| `/app/settings/tables` | Tables & floor plan editor | ✓ | ✓ | ✗ |
| `/app/settings/booking` | Booking rules | ✓ | ✓ | ✗ |
| `/app/settings/team` | Members & invites | ✓ | ✓ (invite host/manager) | ✗ |
| `/app/settings/menu` | Menu PDF/image assets | ✓ | ✓ | ✗ |
| `/app/settings/billing` | Plan, invoices, portal | ✓ | ✗ | ✗ |

\*Managers may edit locations they can access; owners create/archive.

---

## Platform (internal)

| Path | Purpose | Access |
|------|---------|--------|
| `/platform` | Ops overview | platform admin |
| `/platform/organizations` | List orgs / trigger owner invites | platform |
| `/platform/login` | Platform login (or reuse `/login` + claim) | anon |

---

## Redirect map (legacy → MVP)

| Legacy | Target |
|--------|--------|
| `/dashboard` | `/app/dashboard` |
| `/bookings` | `/app/bookings` |
| `/calendar` | `/app/bookings?view=calendar` |
| `/host-stand` | `/app/host-stand` |
| `/customers` | `/app/guests` |
| `/customers/{id}` | `/app/guests/{id}` |
| `/reports` | `/app/reports` |
| `/settings` | `/app/settings` |
| `/floorplan` | `/app/settings/tables` |
| `/staff` | `/app/settings/team` |
| `/menu` | `/app/settings/menu` |
| `/orders`, `/server-*`, `/payroll`, `/loyalty`, `/marketing*`, … | **410/404** removed |

---

## Nav (production)

1. Dashboard  
2. Bookings  
3. Host Stand  
4. Guests  
5. Reports (owner/manager)  
6. Settings  

**Removed from nav:** Orders, Server Pad, Payroll, Leaderboard, Loyalty, Marketing, Analytics, Integrations, Upgrade to Pro, Pitch deck.
