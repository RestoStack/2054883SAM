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

- [ ] Phase 6 §2 pipelines enabled (**requires explicit approval** — workflows currently `workflow_dispatch` only)
- [ ] Tag `v*` → prod migrate + Edge deploy after Environment approval
- [ ] Edge Functions: `send-reservation-confirmation`, billing (fake/stripe), reports export

## Tenant readiness

- [ ] DHG org created (empty — no seed on prod)
- [ ] Industria org created as **separate** organization
- [ ] Host Stand + public book verified per org on staging clone of config

## Final step — **STOPPED for approval**

- [ ] **§8 Generate first real invitation for the DHG owner account**

> Do **not** create or send the DHG owner invite until this box is explicitly approved in chat / issue comment.

When approved:

1. Platform admin creates `owner_onboarding` invite for DHG owner email.
2. Deliver link out-of-band (email/Slack) — never commit the raw token.
3. Owner completes funnel; Host Stand smoke on prod.
4. Repeat for Industria as a **second** organization.
