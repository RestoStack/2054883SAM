# RestoStack — Cursor agent guide (MVP)

This file is the always-on brief for any Cursor agent. **MVP only — no feature creep.**

## Product goal

Production multi-tenant restaurant SaaS at **restostacks.com**: unrelated restaurants each run their own account with **zero data leakage**. Every decision is judged against: *does this get us to a safe production deploy faster?*

**Stack (fixed):** React + TypeScript + Vite + TanStack Router + Tailwind + shadcn/ui · Supabase (Postgres, Auth, RLS, Storage, Edge Functions) · GitHub trunk-based · migrations in `supabase/migrations/` (one file per change; never edit applied migrations).

## Stakeholder locks

See [`docs/DECISIONS.md`](docs/DECISIONS.md):

1. First customers (DHG, Industria) = **separate organizations**
2. **Host Stand required** for day-1 go-live
3. Single domain **`restostacks.com`**
4. **Fake payment wall** now (Stripe later; schema ready)
5. Auth = **Google + email/password only** (no PINs)

## MVP scope (ONLY)

1. Invite → auth → payment wall → onboard → `/app`
2. Online booking `/book/{slug}` + staff reservation management
3. Dashboard — reservation metrics only (no revenue/orders/staff KPIs)
4. Reports — same metrics, groupable, CSV, presets (owner/manager)
5. Guest CRM — org-level guests, tags, notes, CASL/Loi 25 opt-in
6. Host Stand — floor plan, seat/unseat, walk-ins, live list
7. Menu upload — PDF/image assets only (no item parsing)
8. Settings — profile, hours, locations, tables, booking rules, team, Billing

## Explicitly OUT (delete / do not extend)

POS, Server Pad, orders, guest payments/deposits, revenue/ticket metrics, inventory, payroll/leaderboard, product analytics, marketing, loyalty, integrations, Upgrade to Pro, waitlist SMS, reviews, AI, public marketing site, structured menu items, **staff PIN login**. Merge Calendar into Bookings; Floor Plan under Settings → Tables.

## Non-negotiable rules

1. **Isolation (ADR-001):** shared Postgres; logical isolation via `organization_id` (+ `location_id`) + RLS. Documented in `docs/DATA_MODEL.md`.
2. **Tenancy is architecture:** `organizations` → `locations` → everything else. Active org/location from **memberships**, verified by RLS — never localStorage as SoT.
3. **Isolation tests gate PRs.**
4. **Per-tenant config in DB** — not env/code.
5. **Security in Postgres:** role-aware RLS (`owner` / `manager` / `host`). Public booking = SECURITY DEFINER RPCs + rate limits.
6. **No secrets / PINs / invite codes in the client bundle.** Invites = single-use hashed tokens.
7. **Storage private by default;** menu via signed URLs or scoped paths per org.
8. **Defaults:** CAD, `America/Toronto`, `en-CA` (fr-CA keys ready).
9. **TypeScript strict**, generated Supabase types, no `any`; Zod at boundaries.
10. **Billing:** `subscriptions` gate (`trialing`\|`active`). v1 uses **fake checkout** (`billing_provider=fake`). Stripe Edge webhooks later — keys never in `VITE_*`.

## Authoritative docs

| Doc | Purpose |
|-----|---------|
| [docs/DECISIONS.md](docs/DECISIONS.md) | Stakeholder locks |
| [docs/AUDIT.md](docs/AUDIT.md) | keep / refactor / delete map |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | ADR-001 + target schema |
| [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) | Phases 0–6 |
| [docs/ROUTES.md](docs/ROUTES.md) | Route + role map |

## Working rules for agents

1. **Do not start OUT-OF-SCOPE features** (including real Stripe until `billing_provider` flip is requested).
2. Prefer **deleting** out-of-scope modules over refactoring them.
3. New schema = **new migration file** only.
4. Never commit service role or Stripe secret keys.
5. Design: keep existing green-accent admin shell; no drive-by redesigns.
6. Deploy via GitHub → Vercel on `restostacks.com` (Phase 6). Lovable not required.

## Critical path

**Phase 0 → 1 → 2 → 3 (Host Stand) → 6** for first production invites.
