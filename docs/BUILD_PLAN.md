# BUILD_PLAN.md — Phased plan to production

**Objective:** Live multi-tenant app at `restostacks.com` with proven isolation. Every phase judged by “does this get us to a safe production deploy faster.”  
**Estimates:** engineering-days for one strong full-stack engineer familiar with the repo (calendar time will be longer).  
**Rule:** Prefer **delete** over refactor for OUT-OF-SCOPE modules (`docs/AUDIT.md`).  
**Locks:** [`docs/DECISIONS.md`](./DECISIONS.md) — separate orgs for DHG/Industria; Host Stand required; fake paywall; Google/email only; single domain.

---

## Phase 0 — Cleanup & foundation

**Goal:** Safe trunk, org/location model, RLS baseline, invites, CI. No new product features beyond plumbing.

### Tasks
1. Protect `main`; adopt trunk-based flow (PR required, CI green).
2. Delete or quarantine OUT-OF-SCOPE routes/libs (POS, Server Pad, orders, loyalty, payroll, marketing*, integrations, pitchdeck, launch, structured menu, Upgrade to Pro).
3. Introduce schema: `organizations`, `locations`, `organization_memberships`, `users`, `invitations`, `subscriptions`, `platform_settings.signup_mode` (see `DATA_MODEL.md`).
4. Backfill from `v2_restaurants` / `v2_users` (1:1 org↔location).
5. Replace `v2_current_restaurant_id()` with membership-aware helpers; role-aware RLS.
6. Storage: private bucket + `org/{organization_id}/...` policies; signed URLs.
7. Invite system: hashed single-use tokens, Edge Function `invite-create`, route `/invite/{token}`.
8. **Remove all staff PIN login** — Google SSO + email/password only (`docs/DECISIONS.md`). Delete PIN tiles / `pin-{pin}` bootstrap paths.
9. Strip hardcoded demo credentials from client for non-demo builds.
10. CI: typecheck, lint, migration dry-run against ephemeral DB, **cross-tenant isolation suite** (two orgs; tables/RPCs/storage).
11. Update generated Supabase types; Zod at boundaries for new RPCs.
12. Update `AGENTS.md` / `.cursor/rules` (this PR starts that).

### Files touched
- Delete: `src/routes/{orders,server-*,payroll,leaderboard,loyalty,product-analytics,marketing*,integrations,pitchdeck,launch,menu}.tsx`, `src/lib/pos*`, `src/lib/server-auth*`, related hooks/components.
- Refactor: `Sidebar`, `auth.tsx`, `v2-data.ts` → `src/lib/data/*`, `__root.tsx` AuthGate.
- Migrations: new files only under `supabase/migrations/`.
- Add: `supabase/functions/invite-create`, `tests/isolation/*`, `.github/workflows/ci.yml`.

### Migrations
- `YYYYMMDD_phase0_orgs_locations.sql` — create tables + backfill.
- `YYYYMMDD_phase0_rls_roles.sql` — helpers + policies.
- `YYYYMMDD_phase0_invites_signup_mode.sql`
- `YYYYMMDD_phase0_drop_out_of_scope.sql` — drop unused `v2_orders*` etc. (after code removal).
- `YYYYMMDD_phase0_storage_policies.sql`

### Done when
- [x] OUT-OF-SCOPE routes 404 / removed from nav. *(Phase 0 PR)*
- [x] Two-org isolation contract tests in CI. *(full DB suite still against staging)*
- [ ] Owner invite token flow creates membership (manual test after migration apply).
- [x] Storage policies for `org/{organization_id}/...` on private `org-media` bucket.
- [ ] `signup_mode=invite_only` blocks open signup (enforce in signup UI after migration).
- [ ] Typecheck + lint green on `main` PRs.

### Rollback
- Feature flag `use_org_model=false` not preferred; instead revert migration deploy on staging via Supabase PITR / restore. Do not ship Phase 0 to prod until isolation tests green. Keep DB backup before drop migrations.

### Estimate
**8–12 eng-days**

---

## Phase 1 — Onboarding + Settings core

**Goal:** Invite → auth → **fake payment wall** → onboard → land in `/app`. Settings: profile, hours, locations, team.  
(Stripe real charges deferred — schema stays ready; see `docs/DECISIONS.md`.)

### Tasks
1. `platform_settings.billing_provider = fake` (default) with Stripe-shaped `/billing/setup` funnel.
2. `/billing/setup` plan picker → Checkout (Stripe when enabled) → return verifies `subscriptions` row via `app_billing_verify_subscription` (never client claim). Fake RPC writes the same row when provider=fake.
3. Gate all `/app/*` on `trialing|active`; `/billing/locked` for inactive.
4. Settings → Billing: plan + status + Stripe Customer Portal (when provider=stripe) + invoices list.
5. Onboarding wizard (7 steps) with transaction-safe RPCs + resume via `onboarding_progress`.
6. Settings: Profile, Hours (special hours), Locations CRUD, Team (invite/role/remove), Billing.
7. Org/location switcher in shell (membership-driven).
8. Stripe Edge Functions scaffolded (`billing-checkout`, `stripe-webhook`, `billing-portal`).

### Files touched
- Add: `src/routes/invite.$token.tsx`, `billing.checkout.tsx`, `billing.locked.tsx`.
- Refactor: `onboarding.tsx`, `settings.tsx`, `signup.tsx`, `login.tsx` (no PIN UI).
- RPC: `app_activate_fake_subscription`.

### Migrations
- `subscriptions` + `activated_via`; `platform_settings.billing_provider`.
- Settings fields on `organizations` / `locations` / `location_hours`.

### Done when
- [x] New owner cannot reach `/app` without completing fake payment wall. *(AuthGate + /billing/checkout)*
- [x] Team invite skips payment. *(team memberships are not incomplete-owner)*
- [x] Canceling/locking subscription (platform grant revoke or status flip) → `/billing/locked`.
- [x] Multi-org switcher updates active context. *(locations CRUD polish remains)*
- [x] No Stripe secret keys required in env for this phase.

### Rollback
- Platform grant `subscriptions.status=active` for stuck owners; feature-flag wall.

### Estimate
**5–7 eng-days** (shorter without Stripe integration)

---

## Phase 2 — Tables, booking rules, public booking, reservation management

**Goal:** Guests book `/book/{slug}`; staff manage reservations.

### Tasks
1. Settings → Tables: floor plan editor (move from `/floorplan`).
2. Booking rules + hours → availability RPC.
3. Public page: availability + create reservation RPC (rate-limited).
4. Bookings UI: list/filters/status; merge Calendar into Bookings.
5. Slug change + redirects.
6. Walk-ins as `source=walk_in` reservations (no SMS waitlist).

### Files touched
- `book_.$slug.tsx`, `bookings.tsx`, delete `calendar.tsx` as top-level.
- `settings/tables`, `booking_rules` forms.
- RPCs: `public_*`, staff booking mutations.

### Migrations
- `tables`, `booking_rules`, `location_hours`, `slug_redirects`, `reservations` cutover from `v2_bookings`.

### Done when
- [x] Unrelated orgs cannot see each other’s reservations (RLS + isolation contract).
- [x] Public book creates guest + reservation (`public_create_reservation`, dual-write to v2).
- [x] Rate limit blocks burst creates (5 / 10 min).
- [x] Calendar views live under Bookings only (`/calendar` → `/bookings?view=calendar`).

### Rollback
- Feature flag public booking off per location `is_active=false`.

### Estimate
**8–11 eng-days**

---

## Phase 3 — Host Stand

**Goal:** Live floor + seat/unseat + walk-ins + today’s list.

### Tasks
1. Port Host Stand to org/location + `reservations` / `tables`.
2. Seat/unseat RPCs; table status.
3. Service-period filters; no OUT-OF-SCOPE panels (no POS, no SMS).

### Files touched
- `host-stand.tsx`, `FloorPlan.tsx`, staff RPCs.

### Migrations
- Table status enum alignment if needed.

### Done when
- [ ] Host can seat/unseat only within org/location.
- [ ] Walk-in appears on floor + bookings.
- [ ] Isolation test covers host stand RPCs.

### Rollback
- Hide Host Stand nav flag; bookings UI remains.

### Estimate
**5–7 eng-days**

---

## Phase 4 — Guest CRM

**Goal:** Org-level guests, per-location stats, notes, tags, marketing opt-in (CASL / Loi 25).

### Tasks
1. Guests list/detail under `/app/guests`.
2. Stats rollups; notes; tags.
3. Opt-in/out fields + audit timestamps/source.
4. Link from reservation → guest.

### Files touched
- Rename/refactor `customers*` → `guests*`.
- CRM components; no marketing send.

### Migrations
- `guests`, `guest_notes`, `guest_location_stats`; backfill from `v2_customers`.

### Done when
- [ ] Guest invisible cross-org.
- [ ] Opt-in defaults false; changes recorded.
- [ ] Location stats correct for multi-location org.

### Rollback
- Read-only CRM flag.

### Estimate
**4–6 eng-days**

---

## Phase 5 — Dashboard + Reports + Menu assets + polish

**Goal:** Four pillars complete; production-ready UX.

### Tasks
1. Dashboard: reservation KPIs only (counts, covers, avg party, no-shows/rate, cancellations, occupancy next service, walk-ins vs booked, source mix, peak hour, 7/30-day trends). Filters: location, date range. **No revenue/orders.**
2. Reports: same metrics, group by day/week/month/location/source/daypart, period compare, CSV, saved presets; owner/manager only.
3. Menu upload: PDF/images → `menu_assets`; show on public book page.
4. Empty states, errors, Sentry hooks, en-CA copy; fr-CA key scaffolding.
5. Remove remaining dead code / quarantine folder.

### Files touched
- `dashboard.tsx`, `reports.tsx`, settings menu assets, i18n scaffold.

### Migrations
- `menu_assets`, `report_presets`.

### Done when
- [ ] Dashboard matches metric list (acceptance checklist signed).
- [ ] CSV export matches on-screen aggregates.
- [ ] Menu PDF visible on `/book/{slug}` via signed URL.
- [ ] Manager can reports; host cannot.

### Rollback
- Revert frontend; presets table unused if needed.

### Estimate
**7–10 eng-days**

---

## Phase 6 — Production deployment

**Goal:** Real tenants on `restostacks.com` with zero cross-tenant leakage.

### Tasks
1. Separate Supabase projects: **dev / staging / prod**.
2. Env management (Vercel + Supabase secrets); no secrets in client except anon key for prod project.
3. GitHub Actions:  
   - PR → typecheck, lint, isolation tests, Vercel preview.  
   - Merge `main` → migrate **staging** + deploy staging.  
   - Tag `v*` → migrate **prod** + deploy prod.
4. Frontend on **Vercel**; primary domain **`restostacks.com`** (serves `/app`, `/book/{slug}`, auth). No separate `app.` subdomain required for v1 (`docs/DECISIONS.md`).
5. Sentry (FE + Edge), uptime check on `/health`.
6. Prod backups + PITR enabled.
7. Seed script: demo tenant (isolated).
8. Invite **two separate orgs** — DHG and Industria — each via own owner invite link.
9. Run full isolation suite against staging; smoke **Host Stand** + public book + billing locked/fake wall.
10. Optional later: flip `billing_provider=stripe` (not required for first go-live).

### Files touched
- `.github/workflows/*`, `scripts/seed-demo.ts`, env examples, DNS docs.
- Vercel project config.

### Migrations
- Apply full chain to staging then prod (no edits to old files).

### Done when
- [ ] Two orgs on staging cannot see each other (automated + manual) — mirrors DHG vs Industria.
- [ ] Fake paywall path works end-to-end on prod; no Stripe keys required.
- [ ] DHG owner and Industria owner each complete invite→auth→fake pay→onboard→**Host Stand** smoke.
- [ ] Uptime green; Sentry receiving events.
- [ ] Lovable not required for deploy.
- [ ] `restostacks.com` live.

### Rollback
- DNS back to previous; Supabase PITR; Vercel instant rollback.

### Estimate
**5–8 eng-days** (plus calendar for DNS/access)

---

## Total

| Phase | Eng-days |
|-------|----------|
| 0 | 8–12 |
| 1 | 5–7 |
| 2 | 8–11 |
| 3 | 5–7 |
| 4 | 4–6 |
| 5 | 7–10 |
| 6 | 5–8 |
| **Sum** | **~42–61** |

**Critical path to first production tenants (locked):**  
**Phase 0 → 1 → 2 → 3 (Host Stand required) → 6**, with Phases 4–5 (CRM, Dashboard/Reports polish, menu assets) completed before or immediately after invite — prefer finishing 4–5 before Phase 6 if calendar allows.

First customers: **DHG** and **Industria** as **separate organizations**.

---

## Definition of “production ready”

1. Isolation tests gate merge.  
2. Subscription gate enforced (`fake` or later `stripe`).  
3. No OUT-OF-SCOPE modules in prod build; **no PIN login**.  
4. Separate prod Supabase; no demo passwords.  
5. `restostacks.com` serving Vercel prod; invites working; **Host Stand** smoke-tested.  
6. Backups/PITR/Sentry/uptime on.
