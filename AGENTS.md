# RestoStack — Cursor agent guide (MVP)

This file is the always-on brief for any Cursor agent. **MVP only — no feature creep.**

## Product goal

Production multi-tenant restaurant SaaS at **restostacks.com**: unrelated restaurants each run their own account with **zero data leakage**. Every decision is judged against: *does this get us to a safe production deploy faster?*

**Stack (fixed):** React + TypeScript + Vite + TanStack Router + Tailwind + shadcn/ui · Supabase (Postgres, Auth, RLS, Storage, Edge Functions) · GitHub trunk-based · migrations in `supabase/migrations/` (one file per change; never edit applied migrations).

## MVP scope (ONLY)

1. Invite → auth (Google or email/password) → Stripe pay → onboard → `/app`
2. Online booking `/book/{slug}` + staff reservation management
3. Dashboard — reservation metrics only (no revenue/orders/staff KPIs)
4. Reports — same metrics, groupable, CSV, presets (owner/manager)
5. Guest CRM — org-level guests, tags, notes, CASL/Loi 25 opt-in
6. Host Stand — floor plan, seat/unseat, walk-ins, live list
7. Menu upload — PDF/image assets only (no item parsing)
8. Settings — profile, hours, locations, tables, booking rules, team, Billing (Stripe Portal)

## Explicitly OUT (delete / do not extend)

POS, Server Pad, orders, guest payments/deposits, revenue/ticket metrics, inventory, payroll/leaderboard, product analytics, marketing, loyalty, integrations, Upgrade to Pro, waitlist SMS, reviews, AI, public marketing site, structured menu items. Merge Calendar into Bookings; Floor Plan under Settings → Tables.

## Non-negotiable rules

1. **Isolation (ADR-001):** shared Postgres; logical isolation via `organization_id` (+ `location_id`) + RLS. Documented in `docs/DATA_MODEL.md`. Dedicated-instance tier can fork later.
2. **Tenancy is architecture:** `organizations` → `locations` → everything else. Every tenant table has `organization_id` NOT NULL (and `location_id` where relevant), FK, indexed. No tenant data in global tables. Active org/location from **memberships**, verified by RLS — never localStorage as SoT. Users may belong to multiple orgs (switcher).
3. **Isolation tests gate PRs:** two orgs; assert tables, RPCs, storage paths, realtime channels are invisible cross-tenant.
4. **Per-tenant config in DB** (branding, slug, timezone, currency, locale, booking rules) — not env/code.
5. **Security in Postgres:** role-aware RLS (`owner` / `manager` / `host`). Public booking = SECURITY DEFINER RPCs + rate limits; anon never touches tenant tables directly.
6. **No secrets in client:** no plaintext PINs/invite codes in the bundle. Invites = single-use hashed tokens with expiry, server-generated.
7. **Storage private by default;** menu via signed URLs or scoped paths per org.
8. **Defaults:** CAD, `America/Toronto`, `en-CA` (fr-CA keys ready).
9. **TypeScript strict**, generated Supabase types, no `any`; Zod at boundaries.
10. **Billing:** Stripe is SoT. `organizations.stripe_customer_id` + `subscriptions` mirrored by Edge `stripe-webhook` (signature-verified, idempotent). App routes require `subscription_status ∈ {trialing, active}` else `/billing/locked`. Stripe keys only in Edge secrets.

## Authoritative docs

| Doc | Purpose |
|-----|---------|
| [docs/AUDIT.md](docs/AUDIT.md) | keep / refactor / delete map |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | ADR-001 + target schema |
| [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) | Phases 0–6 |
| [docs/ROUTES.md](docs/ROUTES.md) | Route + role map |
| [INDEPENDENCE.md](INDEPENDENCE.md) | Own hosting (no Lovable required) |

## Working rules for agents

1. **Do not start OUT-OF-SCOPE features.** If asked, refuse and point to MVP list.
2. Prefer **deleting** out-of-scope modules over refactoring them.
3. New schema = **new migration file** only.
4. `main` is protected trunk after Phase 0; until then work on feature branches `cursor/<name>-3a05` and open PRs.
5. Never commit service role or Stripe secret keys.
6. Design: keep existing green-accent admin shell; no drive-by redesigns.
7. Lovable publish is **not** required — deploy via GitHub → Vercel / configured host (`docs/BUILD_PLAN.md` Phase 6).

## Current code reality (pre–Phase 0)

- Tenancy today is flat `restaurant_id` on `v2_*` — **must migrate** to org/location (Phase 0).
- Large OUT-OF-SCOPE surface still present — see `docs/AUDIT.md`.
- Stripe not implemented yet — Phase 1.

## Quick paths

- Routes: `src/routes/`
- Data: `src/lib/v2-data.ts` (to be split/replaced in Phase 0–2)
- Auth: `src/lib/auth.tsx`, `src/lib/oauth.ts`
- Migrations: `supabase/migrations/`
