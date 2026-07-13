# RestoStack

Interactive frontend showcase prototype of a multi-location restaurant management SaaS. See `README.md` for the product tour and `PRODUCT.md` for the full product map.

## Cursor Cloud specific instructions

- This is a **frontend-only** Vite + React + TypeScript SPA. There is no backend to run: all data is seeded/computed in-memory (`src/data/`). `supabase/schema.sql` is reference-only for a future real backend — do not attempt to start Supabase to run the app.
- Standard commands live in `package.json`: `npm run dev` (dev server, http://localhost:5173), `npm run lint` (oxlint), `npm run build` (`tsc -b && vite build`), `npm run preview`.
- No login is required; the app opens directly on the Dashboard with demo data. State (e.g. new bookings) is in-memory only and resets on reload.
- `npm run lint` emits one known non-blocking warning in `src/data/store.tsx` (react fast-refresh only-export-components); this is pre-existing and does not fail lint.
- Vite is configured with `allowedHosts: true` (`vite.config.ts`), so the dev/preview server is reachable through tunneled/preview hostnames without extra config.
