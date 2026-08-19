# ENVIRONMENTS.md — Supabase / Vercel / GitHub (Phase 6 §1)

**Status:** Document project refs here after projects are created. Secrets live in GitHub Environments and Vercel — **never in the repo**.

---

## Supabase projects

| Env | Project name | Project ref | Region | Notes |
|-----|--------------|-------------|--------|-------|
| Staging | `restostack-staging` | `_FILL_ME_` | `ca-central-1` (preferred) | PITR optional |
| Production | `restostack-prod` | `_FILL_ME_` | `ca-central-1` | **Enable PITR + daily backups** |

### Link per env

```bash
# Staging
supabase link --project-ref <STAGING_REF>
supabase db push   # only after approval to enable deploy pipeline (Phase 6 §2)

# Production (tag deploy only)
supabase link --project-ref <PROD_REF>
```

### Auth (both envs)

- [ ] Disable email autoconfirm
- [ ] SMTP → Resend (auth emails)
- [ ] Redirect URLs allowlist: `https://app.restostacks.com/**`, `https://*.vercel.app/**` (staging previews)
- [ ] Site URL: `https://app.restostacks.com` (prod) / staging Vercel URL

### Secrets (Edge Functions / GitHub Environments)

| Name | Staging | Prod |
|------|---------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ |
| `RESEND_API_KEY` | ✓ | ✓ |
| `RESEND_FROM` | ✓ | ✓ |
| `PUBLIC_APP_URL` | staging URL | `https://app.restostacks.com` |
| `SENTRY_DSN` | ✓ | ✓ |
| Stripe keys | only when `billing_provider=stripe` | same |

---

## Vercel

| | Preview (PR) | Production |
|--|--------------|------------|
| Target | Staging Supabase | Prod Supabase |
| Domain | `*.vercel.app` | `app.restostacks.com` |
| Client env | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only | same keys for prod project |

`restostacks.com` root: minimal invite-only landing (contact / request access) — not the app shell.

---

## Observability (Phase 6 §5)

- Sentry project: frontend + Edge
- Supabase log drains → preferred sink
- Uptime monitor: `GET /health` and `GET /book/demo-downtown` (after seed)
- Alert email: owner inbox

---

## Approval gates

- **Phase 6 §2** (auto migrate pipelines): **enabled** — staging on push to `main`; prod on tag `v*` with Environment approval
- **Phase 6 §8** (first real DHG owner invite): run `scripts/create-owner-invite.ts` with `OWNER_EMAIL` — see `docs/GO_LIVE.md`
