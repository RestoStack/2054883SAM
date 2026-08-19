# Status — 2026-08-19

## Where we are

MVP code for Phases **0–6** is on branch `cursor/mvp-phases-2-6-3a05` → draft **PR #24**.

Nothing from this stack is merged to `main` yet. Deploy pipelines will only fire after merge.

## Just completed

| Item | Status |
|------|--------|
| Phase 6 **§2** auto migrate pipelines | **Enabled** — staging on push to `main`; prod on tag `v*` (+ GitHub Environment approval) |
| Phase 6 **§8** DHG invite | **Script ready** (`npm run invite:owner`) — needs real `OWNER_EMAIL` to run |

## PR stack (draft, merge bottom → top)

1. #18 plan → #19 Phase 0 → #20/#21 Phase 1 → #22 Phase 2 → #23 Phase 3 → **#24 Phases 2–6**

## App surfaces (code)

| Route | Purpose |
|-------|---------|
| `/book/{slug}` | Public booking |
| `/app/host` | Host Stand |
| `/app/reservations` | Staff day list |
| `/app/guests` | Guest CRM |
| `/app/dashboard` | KPIs |
| `/app/reports` | Reports + CSV |
| `/settings` | Includes Menu upload |

## Blocked on you

1. **Merge** the draft PR stack (or squash) to `main` so staging deploy can run  
2. Fill GitHub Environment secrets + Supabase project refs in `docs/ENVIRONMENTS.md`  
3. Give **`OWNER_EMAIL`** for DHG to run §8 invite generation  
4. Apply migrations to the linked Supabase project if not using the new pipeline yet  

## Commands

```bash
# Local
npm run dev

# Staging seed (service role)
npm run seed:demo

# DHG owner invite (once email known)
OWNER_EMAIL=... ORG_NAME=DHG npm run invite:owner
```
