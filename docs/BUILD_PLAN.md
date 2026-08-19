# BUILD_PLAN.md — Phased plan to production

**Objective:** Live multi-tenant app at `restostacks.com` with proven isolation. Every phase judged by “does this get us to a safe production deploy faster.”  
**Estimates:** engineering-days for one strong full-stack engineer familiar with the repo (calendar time will be longer).  
**Rule:** Prefer **delete** over refactor for OUT-OF-SCOPE modules (`docs/AUDIT.md`).

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
8. Remove plaintext PIN auth path for production; owners use Google/email; team via invite.
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
- [ ] OUT-OF-SCOPE routes 404 / removed from nav.
- [ ] Two-org isolation tests pass in CI.
- [ ] Owner invite token flow creates membership (manual test).
- [ ] Storage write outside own org path fails.
- [ ] `signup_mode=invite_only` blocks open signup.
- [ ] Typecheck + lint green on `main` PRs.

### Rollback
- Feature flag `use_org_model=false` not preferred; instead revert migration deploy on staging via Supabase PITR / restore. Do not ship Phase 0 to prod until isolation tests green. Keep DB backup before drop migrations.

### Estimate
**8–12 eng-days**

---

## Phase 1 — Onboarding + Settings core

**Goal:** Invite → auth → Stripe pay → onboard → land in `/app`. Settings: profile, hours, locations, team.

### Tasks
1. Stripe Checkout / Setup Intent + Customer; Edge `stripe-checkout`, `stripe-webhook` (idempotent).
2. Mirror `subscriptions`; gate all `/app/*` on `trialing|active`.
3. `/billing/locked` + Customer Portal link in Settings → Billing.
4. Onboarding wizard: org + first location + owner membership (post-payment).
5. Settings: profile, hours, locations CRUD, team invites (no payment step for team).
6. Org/location switcher in shell (membership-driven).

### Files touched
- Add: `src/routes/invite.$token.tsx`, `billing.checkout.tsx`, `billing.locked.tsx`, `billing.return.tsx`.
- Refactor: `onboarding.tsx`, `settings.tsx`, `signup.tsx`, `login.tsx`.
- Edge: `supabase/functions/stripe-*`.

### Migrations
- `subscriptions` finalize + webhook idempotency table `stripe_events`.
- Settings fields on `organizations` / `locations` / `location_hours`.

### Done when
- [ ] New owner cannot reach `/app` without Stripe confirmation.
- [ ] Team invite skips payment.
- [ ] Portal opens; cancel → locked.
- [ ] Multi-location create works; switcher changes RLS context.

### Rollback
- Disable Checkout via `platform_settings`; keep webhook consumer. Revert frontend routes.

### Estimate
**7–10 eng-days**

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
- [ ] Unrelated orgs cannot see each other’s reservations (test).
- [ ] Public book creates guest + reservation.
- [ ] Rate limit blocks burst creates.
- [ ] Calendar views live under Bookings only.

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
4. Frontend on **Vercel**; domains `restostacks.com`, `app.restostacks.com` (public book can be apex or `book.` — confirm).
5. Sentry (FE + Edge), uptime check on `/health`.
6. Prod backups + PITR enabled.
7. Seed script: demo tenant (isolated, not shared prod passwords in docs for customers).
8. Invite first real tenant (DHG / Industria) via owner invite link.
9. Run full isolation suite against staging; smoke Host Stand + public book + billing locked.

### Files touched
- `.github/workflows/*`, `scripts/seed-demo.ts`, env examples, DNS docs.
- Vercel project config.

### Migrations
- Apply full chain to staging then prod (no edits to old files).

### Done when
- [ ] Two real-looking orgs on staging cannot see each other (automated + manual).
- [ ] Stripe test→live keys cutover checklist complete.
- [ ] DHG/Industria owner completes invite→pay→onboard on prod.
- [ ] Uptime green; Sentry receiving events.
- [ ] Lovable not required for deploy.

### Rollback
- DNS back to previous; Supabase PITR; Vercel instant rollback.

### Estimate
**5–8 eng-days** (plus calendar for Stripe/DNS/access)

---

## Total

| Phase | Eng-days |
|-------|----------|
| 0 | 8–12 |
| 1 | 7–10 |
| 2 | 8–11 |
| 3 | 5–7 |
| 4 | 4–6 |
| 5 | 7–10 |
| 6 | 5–8 |
| **Sum** | **~44–64** |

Critical path to first paid tenant: **Phase 0 → 1 → 2 (minimal book) → 6**, with Host Stand/CRM/Dashboard following if needed for DHG go-live — confirm with stakeholder whether Host Stand is required on day one (recommended yes for restaurant ops).

---

## Definition of “production ready”

1. Isolation tests gate merge.  
2. Stripe subscription gate enforced server-side.  
3. No OUT-OF-SCOPE modules in prod build.  
4. Separate prod Supabase; no demo passwords.  
5. `restostacks.com` serving Vercel prod; invites working.  
6. Backups/PITR/Sentry/uptime on.
