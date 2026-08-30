/**
 * Seed a demo organization on STAGING only.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-demo.ts
 * Refuses to run if SEED_ALLOW_PROD is not set and URL looks like production.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (/prod|restostacks\.com/i.test(url) && process.env.SEED_ALLOW_PROD !== "1") {
  console.error("Refusing to seed production. Set SEED_ALLOW_PROD=1 to override (dangerous).");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

async function main() {
  const orgName = "RestoStack Demo";
  const { data: org, error: orgErr } = await sb
    .from("organizations")
    .insert({
      name: orgName,
      timezone: "America/Toronto",
      currency: "CAD",
      locale: "en-CA",
    })
    .select("id")
    .single();
  if (orgErr) throw orgErr;

  await sb.from("subscriptions").insert({
    organization_id: org.id,
    status: "active",
    plan_id: "pro",
    activated_via: "platform_grant",
  });

  const locations: { id: string; slug: string }[] = [];
  for (const [name, slug] of [
    ["Downtown", "demo-downtown"],
    ["Plateau", "demo-plateau"],
  ] as const) {
    const { data: loc, error } = await sb
      .from("locations")
      .insert({
        organization_id: org.id,
        name,
        public_slug: slug,
        timezone: "America/Toronto",
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    locations.push({ id: loc.id, slug });

    await sb.from("floor_plans").insert({
      organization_id: org.id,
      location_id: loc.id,
      name: "Main",
    });

    await sb.from("booking_rules").upsert({
      location_id: loc.id,
      organization_id: org.id,
      slot_interval_minutes: 15,
      max_party_size: 10,
      lead_time_hours: 1,
      per_slot_cover_cap: 40,
      default_duration_minutes: 90,
    });

    for (let d = 0; d < 7; d++) {
      await sb.from("location_hours").upsert({
        location_id: loc.id,
        organization_id: org.id,
        day_of_week: d,
        open_time: "11:00",
        close_time: "22:00",
        is_closed: false,
      });
    }

    for (let i = 1; i <= 12; i++) {
      await sb.from("tables").insert({
        organization_id: org.id,
        location_id: loc.id,
        table_number: String(i),
        label: String(i),
        section: i <= 6 ? "Main Floor" : "Patio",
        capacity: 2 + (i % 4),
        capacity_min: 1,
        capacity_max: 2 + (i % 4) + 1,
        shape: i % 3 === 0 ? "round" : "square",
        position_x: 80 + ((i - 1) % 4) * 120,
        position_y: 80 + Math.floor((i - 1) / 4) * 120,
        status: "available",
        sort_order: i,
      });
    }
  }

  const guests: string[] = [];
  const first = ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley", "Morgan", "Avery"];
  const last = ["Tremblay", "Nguyen", "Patel", "Martin", "Chen", "Roy", "Singh", "Garcia"];
  for (let i = 0; i < 80; i++) {
    const full = `${rand(first)} ${rand(last)}`;
    const email = `guest${i}@example.com`;
    const phone = `+1514555${pad(i)}`;
    const { data: g, error } = await sb
      .from("guests")
      .insert({
        organization_id: org.id,
        full_name: full,
        email,
        phone,
        phone_e164: phone,
        email_normalized: email,
        marketing_opt_in: i % 3 === 0,
        marketing_opt_in_at: i % 3 === 0 ? new Date().toISOString() : null,
        marketing_opt_in_source: i % 3 === 0 ? "seed" : null,
      })
      .select("id")
      .single();
    if (error) throw error;
    guests.push(g.id);
  }

  const statuses = ["confirmed", "confirmed", "seated", "completed", "cancelled", "no_show"] as const;
  const sources = ["public", "manual", "walk_in", "online"] as const;
  for (let i = 0; i < 200; i++) {
    const loc = rand(locations);
    const dayOffset = Math.floor(Math.random() * 30) - 10;
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const hour = 11 + Math.floor(Math.random() * 10);
    const minute = rand([0, 15, 30, 45]);
    const gid = rand(guests);
    await sb.from("reservations").insert({
      organization_id: org.id,
      location_id: loc.id,
      guest_id: gid,
      guest_name: `Guest ${i}`,
      guest_email: `guest${i % 80}@example.com`,
      party_size: 1 + (i % 6),
      reserved_date: date,
      reserved_time: `${pad(hour)}:${pad(minute)}:00`,
      status: rand([...statuses]),
      source: rand([...sources]),
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        organization_id: org.id,
        locations: locations.map((l) => ({ id: l.id, book: `/book/${l.slug}` })),
        guests: guests.length,
        reservations: 200,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
