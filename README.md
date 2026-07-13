# RestoStack — showcase prototype

Interactive demo of a multi-location restaurant management SaaS (Dashboard, Bookings, Customers, Marketing).

## How to open the demo

1. Install dependencies: `npm install`
2. Start the app: `npm run dev`
3. Open the URL shown in the terminal (usually http://localhost:5173)

No login needed. The app loads with realistic demo data for **Italian Bistro · Downtown, New York**.

## What you can click through

- **Dashboard** — KPIs, revenue chart, staff working, labour %, top items, auto insights (all calculated from demo data)
- **Bookings** — filter tabs, row click opens detail panel, floor-plan table assignment, status changes, New Booking
- **Customers** — guest list → **Emma Johnson** (and others) full CRM profile with tags, favourites, visit chart
- **Marketing** — campaign overview and action cards
- **Location switcher** (bottom-left) — switch between Downtown and Brooklyn

## Notes for stakeholders

- Numbers are **computed live** from seeded bookings, orders, staff shifts, etc. (not hardcoded on the screen).
- A production Supabase schema (tables + RLS) lives in `supabase/schema.sql` for when you connect a real backend.
- Other sidebar links are stubbed so the navigation matches the full product vision.
