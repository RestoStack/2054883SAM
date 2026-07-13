# RestoStack

Interactive front-end-only prototype of a multi-location restaurant management SaaS (Dashboard, Bookings, Customers, Marketing). Vite + React 19 + TypeScript + Tailwind v4. See `README.md` and `PRODUCT.md` for the product tour.

## Cursor Cloud specific instructions

- Single service: a client-side Vite dev server. There is no backend to run. All data is seeded in-memory (`src/data/`); the app loads straight to the Dashboard with no login. State (e.g. new bookings) lives in React state and resets on reload.
- `supabase/schema.sql` is a reference production schema only — it is NOT wired up and nothing needs Supabase to run or test the app.
- Standard commands are in `package.json` scripts: `npm run dev` (dev server on port 5173), `npm run build` (`tsc -b && vite build`), `npm run lint` (oxlint), `npm run preview`.
- Lint currently emits one non-blocking `react(only-export-components)` warning in `src/data/store.tsx`; `npm run lint` still exits 0.
- `vite.config.ts` sets `server.allowedHosts: true`, so the dev server is reachable via proxied/preview hostnames without extra config.
