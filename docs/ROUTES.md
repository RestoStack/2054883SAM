# ROUTES.md — MVP route map

Roles: **anon** · **authenticated (no membership)** · **owner** · **manager** · **host** · **platform**.  
Subscription: unless noted, `/app/*` requires org `subscription.status ∈ {trialing, active}` else redirect `/billing/locked`.  
**v1 billing:** fake payment wall (`billing_provider=fake`) — see `docs/DECISIONS.md`.  
**Auth:** Google or email+password only — **no PIN routes**.  
**Domain:** all paths on `restostacks.com`.

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
| `/login` | Email/password + Google (**no PIN**) | anon |
| `/auth/callback` | OAuth PKCE callback | anon |
| `/` | Redirect → `/login` or `/app` | anon |

**Not in MVP:** `/pitchdeck`, `/launch`, `/demo`, marketing pages, Server Pad, staff PIN login.

---

## Auth / funnel

| Path | Purpose | Access |
|------|---------|--------|
| `/invite/{token}` | Step A entry — validate token | anon |
| `/invite/{token}/auth` | Google or email+password | token valid |
| `/billing/checkout` | Step B — **fake payment wall** (Stripe later) | auth + owner invite (unpaid) |
| `/onboarding` | Step C — org + location wizard | auth + active/trialing sub + no completed onboarding |
| `/billing/locked` | Inactive subscription | auth + membership |

Team invites: `/invite/{token}` → auth → **skip payment** → `/app`.

---

## App shell (`/app`)

Base layout: org/location switcher, MVP nav only.

| Path | Purpose | owner | manager | host |
|------|---------|-------|---------|------|
| `/app` | Redirect → Dashboard | ✓ | ✓ | ✓ |
| `/app/dashboard` | Reservation metrics (read-only) | ✓ | ✓ | ✓ (read) |
| `/app/reports` | Tabular reports, CSV, presets | ✓ | ✓ | ✗ |
| `/app/bookings` | Reservation management (+ calendar views) | ✓ | ✓ | ✓ |
| `/app/host-stand` | Floor plan ops (**required for go-live**) | ✓ | ✓ | ✓ |
| `/app/guests` | Guest CRM list | ✓ | ✓ | ✓ (limited) |
| `/app/guests/{id}` | Guest detail | ✓ | ✓ | ✓ (limited) |
| `/app/settings` | Settings hub | ✓ | ✓ | ✗ |
| `/app/settings/profile` | Org/location profile | ✓ | ✓ | ✗ |
| `/app/settings/hours` | Hours | ✓ | ✓ | ✗ |
| `/app/settings/locations` | Locations CRUD | ✓ | ✓* | ✗ |
| `/app/settings/tables` | Tables & floor plan editor | ✓ | ✓ | ✗ |
| `/app/settings/booking` | Booking rules | ✓ | ✓ | ✗ |
| `/app/settings/team` | Members & invites (Google/email) | ✓ | ✓ | ✗ |
| `/app/settings/menu` | Menu PDF/image assets | ✓ | ✓ | ✗ |
| `/app/settings/billing` | Plan status (fake wall / later Stripe Portal) | ✓ | ✗ | ✗ |

\*Managers may edit locations they can access; owners create/archive.

---

## Platform (internal)

| Path | Purpose | Access |
|------|---------|--------|
| `/platform` | Ops overview | platform admin |
| `/platform/organizations` | List orgs / create **separate** owner invites (e.g. DHG, Industria) | platform |
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
| `/server-login`, `/server-app`, PIN flows | **404** removed |
| `/orders`, `/payroll`, `/loyalty`, `/marketing*`, … | **410/404** removed |

---

## Nav (production)

1. Dashboard  
2. Bookings  
3. Host Stand  
4. Guests  
5. Reports (owner/manager)  
6. Settings  

**Removed from nav:** Orders, Server Pad, Payroll, Leaderboard, Loyalty, Marketing, Analytics, Integrations, Upgrade to Pro, Pitch deck, Staff PIN login.
