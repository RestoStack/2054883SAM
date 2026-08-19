# GO_LIVE.md — Production checklist

Locks: [`DECISIONS.md`](./DECISIONS.md) — separate orgs (DHG / Industria); Host Stand required; fake paywall; Google/email only; `restostacks.com`.

---

## Pre-flight

- [ ] Staging smoke: invite → auth → fake pay → onboarding → `/book/{slug}` → `/app/host` seat/unseat/walk-in
- [ ] Isolation suite green on staging
- [ ] PITR + daily backups enabled on **prod**
- [ ] Auth autoconfirm off; Resend SMTP; redirect URLs locked to `app.restostacks.com`
- [ ] Vercel prod domain `app.restostacks.com`; root `restostacks.com` = invite-only page
- [ ] Sentry + uptime alerts to owner email
- [ ] `docs/ENVIRONMENTS.md` project refs filled
- [ ] Fake billing still default (`billing_provider=fake`) unless Stripe cutover approved

## Deploy

- [x] Phase 6 **§2** pipelines enabled — `deploy-staging.yml` on push to `main`; `deploy-prod.yml` on tag `v*` (GitHub Environment approval still required for prod)
- [ ] Tag `v*` → prod migrate + Edge deploy after Environment approval
- [ ] Edge Functions: `send-reservation-confirmation`, billing (fake/stripe), reports export
- [ ] GitHub Environments `staging` / `production` secrets filled (`SUPABASE_*`, Resend, project refs)

## Tenant readiness

- [ ] DHG org created (empty — no seed on prod)
- [ ] Industria org created as **separate** organization
- [ ] Host Stand + public book verified per org on staging clone of config

## Final step — §8 DHG owner invite

**Script ready:** `scripts/create-owner-invite.ts`

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
OWNER_EMAIL=dhg-owner@example.com \
ORG_NAME="DHG" \
PUBLIC_APP_URL=https://app.restostacks.com \
npx tsx scripts/create-owner-invite.ts
```

- [ ] **§8 Run script with the real DHG owner email** and deliver the printed URL out-of-band

> Provide `OWNER_EMAIL` to execute §8 against staging/prod. Token is printed once — never committed.
