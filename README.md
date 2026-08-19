# RestoStack

Multi-tenant restaurant ops SaaS: invite → auth → payment wall → onboarding → public booking, Host Stand, Guest CRM, dashboard & reports.

**Domain:** `app.restostacks.com` (app) · `restostacks.com` (invite-only landing)  
**Source of truth:** this GitHub repo (`AGENTS.md`, `docs/*`).

---

## Quick start

```bash
git clone git@github.com:RestoStack/2054883SAM.git
cd 2054883SAM
npm install
cp .env.example .env   # see env vars below
npm run dev
```

Apply migrations against your Supabase project:

```bash
npx supabase link --project-ref <YOUR_REF>
npx supabase db push
npx supabase functions deploy send-reservation-confirmation
npx supabase functions deploy export-report-csv
```

Staging seed (never prod unless `SEED_ALLOW_PROD=1`):

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-demo.ts
```

---

## Environment variables

### Client (Vercel / `.env`) — anon only

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Anon/public key |

Never put the service role key in `VITE_*`.

### Edge Function secrets (Supabase dashboard / GitHub Environments)

| Secret | Purpose |
|--------|---------|
| `RESEND_API_KEY` | Reservation confirmation + auth SMTP |
| `RESEND_FROM` | e.g. `RestoStack <bookings@restostacks.com>` |
| `PUBLIC_APP_URL` | `https://app.restostacks.com` |
| `SENTRY_DSN` | Optional error reporting |
| Stripe keys | Only when `billing_provider=stripe` |

See `docs/ENVIRONMENTS.md`, `docs/RUNBOOK.md`, `docs/GO_LIVE.md`.

---

## Migrations

SQL lives in `supabase/migrations/` (ordered by timestamp). **Do not edit applied files** — add new ones.

| Prefix | Phase |
|--------|-------|
| `2026081902*` | Phase 0 — orgs, locations, invites, storage |
| `2026081903*` | Phase 1 — onboarding + settings RPCs |
| `2026081904*` | Phase 2 — reservations + availability (initial) |
| `2026081905*` | Phase 3 — Host Stand seat/unseat |
| `2026081910*` | Phase 2 complete — floor_plans, rules, `get_availability`, `create_public_reservation` |
| `2026081911*` | Phase 3 realtime + staff_* aliases |
| `2026081912*` | Phase 4 — Guest CRM |
| `2026081913*` | Phase 5 — dashboard rollup, menus |

CI: `.github/workflows/ci.yml` (tsc, build, isolation tests).  
Deploy pipelines: `deploy-staging.yml` / `deploy-prod.yml` — **manual dispatch only until Phase 6 §2 approval**.

---

## App routes (MVP)

| Path | Purpose |
|------|---------|
| `/book/{slug}` | Public booking |
| `/app/host` | Host Stand (touch) |
| `/app/reservations` | Staff day list |
| `/app/guests` | Guest CRM |
| `/app/dashboard` | KPIs + charts |
| `/app/reports` | Rollups + CSV |
| `/settings` | Profile, hours, locations, tables, menu, team, billing |

---

## Docs

| Doc | Topic |
|-----|--------|
| `docs/DECISIONS.md` | Stakeholder locks |
| `docs/DATA_MODEL.md` | Target schema |
| `docs/BUILD_PLAN.md` | Phased build |
| `docs/ENVIRONMENTS.md` | Staging/prod refs |
| `docs/RUNBOOK.md` | Invite, rotate, rollback, restore |
| `docs/GO_LIVE.md` | Production checklist (**§8 invite gated**) |
| `docs/STRIPE_CUTOVER.md` | Fake → Stripe |

---

## Scripts

```bash
npm run dev
npm run build
npm run test:isolation
npm run lint
```

## Stack

React · Vite · TanStack Router/Query · Supabase · Vercel (target) · shadcn/ui · Tailwind · PWA
