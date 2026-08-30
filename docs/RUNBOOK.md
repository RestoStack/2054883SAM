# RUNBOOK.md — RestoStack operations

**Domain:** `app.restostacks.com` (app) · `restostacks.com` (invite-only landing)  
**Billing default:** `billing_provider=fake` until Stripe cutover (`docs/STRIPE_CUTOVER.md`).

---

## Invite a tenant

1. Platform admin: `/platform/organizations` → create owner invite (`kind=owner_onboarding`).
2. Copy invite link `https://app.restostacks.com/invite/{token}` (token shown once).
3. Owner: Google or email/password → `/billing/setup` (fake wall) → onboarding wizard → Host Stand smoke.
4. Team invites skip payment; land on `/app`.

DHG and Industria are **separate organizations** (`docs/DECISIONS.md`).

---

## Rotate keys

| Secret | Where | Notes |
|--------|-------|-------|
| Supabase anon | Vercel `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Client-only; rotate via Supabase dashboard → redeploy Vercel |
| Service role | GitHub Environments + Edge secrets | **Never** in repo or `VITE_*` |
| Resend | Edge `RESEND_API_KEY` | Staging + prod Environments |
| Stripe (later) | Edge only when `billing_provider=stripe` | |

After rotating service role: update GitHub Environment secrets and redeploy Edge Functions.

---

## Roll back a migration

1. Prefer **forward fix** migration over down-migration.
2. If required: restore Postgres from PITR / daily backup to a point before the bad migration (prod only with approval).
3. Re-deploy matching frontend git tag.
4. Document the incident in the PR that introduced the fix.

Local: do not edit applied migration files; add a new `supabase/migrations/YYYYMMDDHHMMSS_*.sql`.

---

## Restore from backup

1. Supabase Dashboard → Database → Backups / PITR.
2. Restore to a **new** project or point-in-time; verify isolation tests against restored DB.
3. Update Vercel + Edge env to the restored project only after smoke:
   - `/health`
   - `/book/{demo-slug}`
   - invite → fake pay → Host Stand seat
4. Notify owners if downtime > 5 minutes.

---

## Staging vs prod

| | Staging | Prod |
|--|---------|------|
| Supabase | staging project ref (see `docs/ENVIRONMENTS.md`) | prod project ref |
| Deploy | `deploy-staging.yml` on merge to `main` | `deploy-prod.yml` on tag `v*` + approval |
| Seed | `scripts/seed-demo.ts` allowed | **blocked** unless `SEED_ALLOW_PROD=1` |

---

## Observability

- Sentry: frontend DSN + Edge DSN (Environment secrets).
- Uptime: monitor `https://app.restostacks.com/book/{demo-slug}` and `/health`.
- Alerts → owner email configured in Sentry / uptime provider.
