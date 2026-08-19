# AUDIT.md — Current repo vs MVP

**Date:** 2026-08-19  
**Branch audited:** `cursor/saas-independence-3a05` (full-app tip)  
**Goal of this audit:** map every major module to **keep / refactor / delete** against the strict MVP, and list security / multi-tenancy issues that block a safe production deploy at `restostacks.com`.

**MVP pillars (only):** Invite→auth→**payment wall (fake now; Stripe later)**→onboard · Online booking · Dashboard (reservation metrics) · Reports · Guest CRM · Host Stand · Menu asset upload · Settings.

**Explicitly OUT:** POS, Server Pad, orders, revenue/ticket, inventory, payroll/leaderboard, marketing, loyalty, integrations stubs, AI, public marketing site, structured menu items, Upgrade to Pro, waitlist SMS, deposits, reviews, **staff PIN login**.

**Stakeholder locks:** see [`docs/DECISIONS.md`](./DECISIONS.md) (separate orgs for DHG/Industria; Host Stand required day-1; `restostacks.com` only; fake paywall; Google/email auth).

---

## 1. Executive findings

| Severity | Finding |
|----------|---------|
| **P0** | Tenancy is flat `restaurant_id` only — no `organizations` / `locations` / memberships. One auth user → one restaurant (`v2_current_restaurant_id` LIMIT 1). No org switcher. |
| **P0** | RLS is **not role-aware** — any authenticated staff with a session can CRUD all tenant tables. |
| **P0** | **No real Stripe yet (by design for v1)** — use **fake payment wall** that sets subscription active; keep schema Stripe-ready. Current `/start` is not wired to org gate. |
| **P0** | Invites are a **shared env/DB code**, not single-use tokens with expiry. Client can see `VITE_INVITE_CODE`. |
| **P0** | Storage `restaurant-media`: public read + any authenticated write (no path tenancy). |
| **P0** | Large OUT-OF-SCOPE surface still in nav and schema (`v2_orders`, loyalty, payroll, marketing, Server Pad). |
| **P1** | Dashboard/Reports include **revenue / avg ticket / orders** — must strip for MVP. |
| **P1** | Plaintext staff PINs still in schema/UI — **MVP removes PIN auth** (Google/email only). |
| **P1** | Public booking RPCs have **no rate limits**. |
| **P1** | `main` is nearly empty; production trunk discipline not established. |
| **P2** | Generated types drift (`types.ts` missing newer tables). |
| **P2** | Hardcoded trial Supabase anon defaults in client config. |

---

## 2. Route / module inventory

| File / module | Verdict | Reason (MVP map) |
|---------------|---------|------------------|
| `src/routes/__root.tsx` | **refactor** | Keep shell; harden AuthGate; remove marketing PUBLIC_PATHS leaks. |
| `src/routes/login.tsx` | **refactor** | Keep email/password + Google; remove demo prefills in prod; staff join via invite only. |
| `src/routes/admin-login.tsx` | **delete** (prod) / quarantine | Demo one-click — not production. Seed demo tenant via script instead. |
| `src/routes/demo.tsx` | **delete** (prod) / quarantine | Demo mode entry — sales URL only, not MVP product. |
| `src/routes/signup.tsx` | **refactor** | Become post-invite auth step; drop shared invite code UX. |
| `src/routes/start.tsx` | **refactor → delete UI** | Replace with `/invite/{token}` → auth → `/billing/checkout` (**fake wall** now). |
| `src/routes/onboarding.tsx` | **refactor** | Keep wizard; create **organization + location + owner membership**; after payment wall. |
| `src/routes/auth.callback.tsx` | **keep** | Native Supabase OAuth callback. |
| `src/routes/invite.$token.tsx` | **add** | Missing — required for owner/team invites. |
| `src/routes/billing.*` | **add** | Checkout, portal return, `/billing/locked`. |
| `src/routes/dashboard.tsx` | **refactor** | Keep as `/app` home; **delete** revenue/ticket/order/staff metrics; reservation KPIs only. |
| `src/routes/bookings.tsx` | **keep / refactor** | Reservation management; merge Calendar into this. |
| `src/routes/calendar.tsx` | **delete** (as top-nav) | Merge into Bookings per MVP. |
| `src/routes/host-stand.tsx` | **keep / refactor** | Pillar #6; drop server-assign-via-notes hacks if replaced by proper assignment later; no SMS. |
| `src/routes/book_.$slug.tsx` | **keep / refactor** | Public booking; enforce SECURITY DEFINER + rate limits; asset menu only. |
| `src/routes/book.tsx` | **refactor** | Stop hardcoding `italian-bistro`. |
| `src/routes/customers.tsx` | **keep / refactor** | Guest CRM list — org-level guests, location stats, tags, opt-in. |
| `src/routes/customers_.$id.tsx` | **keep / refactor** | Guest detail — CASL / Loi 25 fields. |
| `src/routes/reports.tsx` | **refactor** | Reservation metrics only; groupable; CSV; presets; owner/manager. |
| `src/routes/settings.tsx` | **refactor** | Profile, hours, locations, tables, booking rules, team, Billing (fake status now; Stripe Portal later). Drop fake toggles / PIN management. |
| `src/routes/floorplan.tsx` | **refactor** | Move under Settings → Tables (route `/app/settings/tables`). |
| `src/routes/staff.tsx` | **refactor** | Become Settings → Team (roles, invites); remove payroll/clock as primary. |
| `src/routes/menu.tsx` | **delete** | Structured menu items OUT — replace with Settings → Menu assets. |
| `src/routes/orders.tsx` | **delete** | POS / orders OUT. |
| `src/routes/server-app.tsx` | **delete** | Server Pad OUT. |
| `src/routes/server-login.tsx` | **delete** | Server Pad OUT. |
| `src/routes/payroll.tsx` | **delete** | OUT. |
| `src/routes/leaderboard.tsx` | **delete** | OUT. |
| `src/routes/loyalty.tsx` | **delete** | OUT. |
| `src/routes/product-analytics.tsx` | **delete** | OUT. |
| `src/routes/marketing.tsx` + `marketing.*.tsx` | **delete** | OUT (all). |
| `src/routes/integrations.tsx` | **delete** | Stub connectors OUT. |
| `src/routes/index.tsx` | **delete** (product) | Public marketing site OUT of product MVP — replace with login/invite redirect or minimal status page. |
| `src/routes/launch.tsx` | **delete** | Marketing preview OUT. |
| `src/routes/pitchdeck.tsx` | **delete** | OUT. |
| `src/routes/platform.index.tsx` | **keep / refactor** | Platform ops for invites (internal); not tenant UI. |
| `src/routes/platform.restaurants.tsx` | **refactor** | Become org list for platform admins. |
| `src/routes/super-admin-login.tsx` | **keep** | Platform operator entry. |
| `src/routes/app.tsx` | **refactor** | Mobile shell — trim to MVP nav only. |
| `src/routes/health.tsx` | **keep** | Deploy health. |
| `src/routes/terms.tsx` / `privacy.tsx` | **keep** | Legal. |
| `src/components/layout/Sidebar.tsx` | **refactor** | MVP nav only; **delete** Upgrade to Pro. |
| `src/components/FloorPlan.tsx` / `FloorplanDesigner.tsx` | **keep** | Host Stand + Settings tables. |
| `src/components/LaunchLanding.tsx` / demo request | **delete** | Marketing OUT. |
| `src/lib/v2-data.ts` | **refactor** | Keep bookings/customers/tables/staff; strip orders/loyalty/shifts revenue; rename toward org/location. |
| `src/lib/pos.functions.ts` | **delete** | POS OUT. |
| `src/lib/server-auth*.ts` | **delete** | Server Pad OUT. |
| `src/lib/ship-mode.ts` | **refactor** | Replace with DB `signup_mode` + subscription gate; remove Server Pad flags. |
| `src/lib/plans.ts` | **refactor** | Plan labels for fake wall; later map to Stripe Price IDs. No Upgrade to Pro upsell. |
| `src/lib/oauth.ts` | **keep** | Native Supabase Google. |
| `src/lib/auth.tsx` | **refactor** | Memberships + active org/location from server, not localStorage SoT. |
| `src/lib/auth-bootstrap.functions.ts` | **delete** (prod) | Demo credential bootstrap. |
| `src/hooks/use-waitlist.ts` | **delete** | localStorage waitlist obsolete; SMS waitlist OUT. |
| `src/hooks/use-menu.ts` | **delete** | Structured menu OUT. |
| `supabase/migrations/*` (v2 core) | **refactor** | Evolve to org/location; do not edit applied files — new migrations only. |
| v1 tables (`servers`, `orders`, …) | **delete** | Legacy POS. |
| `v2_orders`, `v2_order_items`, `v2_loyalty_*`, `v2_shifts`, `v2_menu_*` | **delete** (schema drop in Phase 0) | OUT of MVP. |
| `v2_waitlist` | **delete** or quarantine | Walk-ins can be bookings with `source=walk_in`; SMS waitlist OUT. Prefer delete. |
| `waitlist_signups` | **delete** | Marketing leads OUT of product. |
| `INDEPENDENCE.md` / `docs/SAAS.md` | **refactor** | Align to Vercel + org model (Phase 6). |
| Lovable / `@lovable.dev/vite-tanstack-config` | **keep soft** | Build helper only; not runtime. Optional later replace. |

---

## 3. Data layer snapshot (as-is)

| Concept | Current |
|---------|---------|
| Tenant key | `restaurant_id` on `v2_*` |
| Org / location | **Missing** — restaurant is both |
| Memberships | Single `v2_users` row; signup blocks second restaurant |
| Roles | `admin \| hostess \| server` enum — **not enforced in RLS** |
| Billing | `v2_restaurants.plan` text + `trial_started_at` — no Stripe IDs |
| Invites | Shared `v2_platform_settings.signup_invite_code` |
| Public booking | `v2_public_get_restaurant`, `v2_public_get_menu`, `v2_public_create_booking` |
| RLS helper | `v2_current_restaurant_id()` from `v2_users` LIMIT 1 |

---

## 4. Security & multi-tenancy issue register

| ID | Issue | Impact | MVP fix phase |
|----|-------|--------|---------------|
| S1 | RLS not role-aware | Host can mutate settings/billing data | Phase 0 |
| S2 | No org/location isolation model | Cannot sell multi-location / multi-brand safely | Phase 0 |
| S3 | Storage not path-scoped | Cross-tenant overwrite / data leak | Phase 0 |
| S4 | Anon key + public RPCs without rate limits | Booking spam / abuse | Phase 2 |
| S5 | `v2_get_staff_tiles` exposes staff names to anon | Enumeration | Phase 0 |
| S6 | Plaintext PINs + `pin-{pin}` passwords | Credential stuffing | Phase 0–1 |
| S7 | Demo secrets in client | Production compromise if shipped | Phase 0 |
| S8 | Client AuthGate only | Soft gate; marketing routes public | Phase 0 |
| S9 | No subscription enforcement | Unpaid access | Phase 0–1 |
| S10 | Invite code in `VITE_*` | Not secret | Phase 0 |
| S11 | Hardcoded Supabase defaults | Wrong project / key leakage habit | Phase 0 / 6 |
| S12 | Cross-tenant tests absent | Isolation assumed not proven | Phase 0 |
| S13 | Realtime channels (if any) not audited | Leak risk | Phase 0 |

---

## 5. What to quarantine vs delete in Phase 0

**Prefer delete** (OUT of MVP, prefer deleting over refactoring):

- Routes: `orders`, `server-*`, `payroll`, `leaderboard`, `loyalty`, `product-analytics`, `marketing*`, `integrations`, `pitchdeck`, `launch`, structured `menu`
- Lib: `pos.functions`, `server-auth*`, `use-waitlist`, `use-menu`
- Schema: drop or stop using `v2_orders*`, `v2_loyalty*`, `v2_shifts`, `v2_menu_*`, v1 POS tables, `waitlist_signups`

**Quarantine** (move under `src/_quarantine/` if needed for short-term reference, delete within 1 sprint):

- Demo login / bootstrap
- Launch landing / DemoRequestDialog
- Calendar route (until Bookings absorbs views)

---

## 6. Gap vs target architecture

| Target | Current gap |
|--------|-------------|
| `organizations` → `locations` | Flat restaurants |
| `organization_id` + `location_id` on all tenant tables | Only `restaurant_id` |
| Memberships + switcher | Single restaurant per user |
| Subscription gate + fake paywall (Stripe later) | No org subscription enforcement |
| `/invite/{token}` single-use | Shared code |
| Role-aware RLS (owner/manager/host) | Flat authenticated policies |
| Google/email only (no PINs) | PIN tiles + plaintext pins remain |
| Cross-tenant automated tests | None |
| Dashboard reservation-only metrics | Revenue/orders mixed in |
| Menu = PDF/image assets | Structured `v2_menu_items` |
| Frontend Vercel + `restostacks.com` + separate Supabase envs | Ad-hoc / Lovable history |
| First tenants = **separate orgs** (DHG, Industria) | Demo single restaurant |

---

## 7. Recommendation

**Stop feature work.** Execute Phase 0, then Phase 1 (fake paywall), 2 (booking), **3 (Host Stand — required for go-live)**, then Phase 6. See [`docs/DECISIONS.md`](./DECISIONS.md).

See: `docs/DATA_MODEL.md`, `docs/BUILD_PLAN.md`, `docs/ROUTES.md`.
