/**
 * Onboarding wizard v1 client API.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  bookingStepSchema,
  hoursStepSchema,
  menuStepSchema,
  restaurantStepSchema,
  teamStepSchema,
  turnTimesToJson,
  type BookingStepInput,
  type HoursStepInput,
  type MenuStepInput,
  type RestaurantStepInput,
  type TeamStepInput,
} from "@/lib/schemas/onboarding";

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await (supabase as any).rpc(name, args);
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Request failed" };
  return data as { ok: true; [k: string]: unknown };
}

export async function onboardingBootstrapOwner(fullName?: string, organizationName?: string) {
  return rpc("app_bootstrap_owner_org", {
    _full_name: fullName ?? null,
    _organization_name: organizationName ?? null,
  });
}

export async function onboardingGetV1(organizationId: string) {
  return rpc("app_onboarding_get_v1", { _organization_id: organizationId });
}

export async function onboardingSetStep(
  organizationId: string,
  step: number,
  draft?: Record<string, unknown>,
) {
  return rpc("app_onboarding_set_step", {
    _organization_id: organizationId,
    _step: step,
    _draft: draft ?? null,
  });
}

export async function onboardingSaveRestaurant(
  organizationId: string,
  input: RestaurantStepInput,
) {
  const parsed = restaurantStepSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  const p = parsed.data;
  return rpc("app_onboarding_v1_restaurant", {
    _organization_id: organizationId,
    _name: p.name,
    _location_name: p.location_name,
    _address: p.address,
    _city: p.city,
    _phone: p.phone,
    _website: p.website,
    _cuisine: p.cuisine,
    _timezone: p.timezone,
    _google_place_id: p.google_place_id ?? null,
    _logo_url: p.logo_url ?? null,
    _slug: p.slug ?? null,
  });
}

export async function onboardingSaveHours(
  organizationId: string,
  locationId: string,
  input: HoursStepInput,
) {
  const parsed = hoursStepSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_onboarding_v1_hours", {
    _organization_id: organizationId,
    _location_id: locationId,
    _ranges: parsed.data.ranges,
    _closed_days: parsed.data.closed_days,
  });
}

export async function onboardingSaveBooking(
  organizationId: string,
  locationId: string,
  input: BookingStepInput,
) {
  const parsed = bookingStepSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  const p = parsed.data;
  const bookingHours = p.use_opening_hours
    ? null
    : { ranges: p.booking_ranges ?? [] };
  return rpc("app_onboarding_v1_booking", {
    _organization_id: organizationId,
    _location_id: locationId,
    _slot_interval: p.slot_interval_minutes,
    _max_covers_per_slot: p.max_covers_per_slot,
    _turn_times: turnTimesToJson(p.turn_times),
    _booking_hours: bookingHours,
    _min_party: p.min_party_size,
    _max_party: p.max_party_size,
    _advance_days: p.advance_days,
    _lead_time_hours: p.lead_time_hours,
  });
}

export async function onboardingSaveTablesQuick(
  organizationId: string,
  locationId: string,
  count: number,
  seats: number,
  section: string,
  bookableOnline: boolean,
) {
  const groups = [{ count, capacity: seats, section }];
  const { data, error } = await (supabase as any).rpc("app_onboarding_step_tables", {
    _organization_id: organizationId,
    _location_id: locationId,
    _groups: groups,
  });
  if (!error && data?.ok) {
    if (!bookableOnline) {
      await (supabase as any)
        .from("tables")
        .update({ bookable_online: false })
        .eq("location_id", locationId);
    } else {
      await (supabase as any)
        .from("tables")
        .update({ bookable_online: true })
        .eq("location_id", locationId);
    }
    await onboardingSetStep(organizationId, 5, { tables_mode: "quick", count, seats });
    return { ok: true as const, step: 5 };
  }

  const rows = Array.from({ length: count }, (_, i) => ({
    organization_id: organizationId,
    location_id: locationId,
    table_number: String(i + 1),
    label: `T${i + 1}`,
    section,
    capacity: seats,
    capacity_min: 1,
    capacity_max: seats,
    bookable_online: bookableOnline,
    sort_order: i + 1,
    status: "available",
  }));
  const ins = await (supabase as any).from("tables").upsert(rows, {
    onConflict: "location_id,table_number",
  });
  if (ins.error) return { ok: false as const, error: ins.error.message };
  await onboardingSetStep(organizationId, 5, { tables_mode: "quick", count, seats });
  return { ok: true as const, step: 5 };
}

export async function onboardingSaveMenu(
  organizationId: string,
  locationId: string,
  input: MenuStepInput,
) {
  const parsed = menuStepSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  const p = parsed.data;

  // Persist draft on progress; menu tables may not exist yet on all envs.
  await onboardingSetStep(organizationId, 6, {
    menu: {
      mode: p.mode,
      link: p.link,
      notes: p.notes,
      items: p.items,
      location_id: locationId,
    },
  });

  // Best-effort write into menus if table exists
  if (p.items.length > 0) {
    try {
      const { data: menu } = await (supabase as any)
        .from("menus")
        .upsert(
          {
            organization_id: organizationId,
            location_id: locationId,
            name: "Main menu",
            is_active: true,
          },
          { onConflict: "location_id" },
        )
        .select("id")
        .maybeSingle();

      if (menu?.id) {
        for (const item of p.items) {
          if (!item.name.trim()) continue;
          await (supabase as any).from("menu_items").insert({
            organization_id: organizationId,
            menu_id: menu.id,
            name: item.name,
            description: item.description ?? "",
            price_cents: item.price_cents,
            category: item.category,
          });
        }
      }
    } catch {
      /* optional schema */
    }
  }

  return { ok: true as const, step: 6 };
}

export async function onboardingSkipTo(organizationId: string, step: number) {
  return onboardingSetStep(organizationId, step, { skipped_to: step });
}

export async function onboardingSaveTeam(organizationId: string, input: TeamStepInput) {
  const parsed = teamStepSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };

  const invites = parsed.data.invites
    .filter((i) => i.email.trim())
    .map((i) => ({
      email: i.email,
      // Map server→host if DB enum lacks server yet
      role: i.role === "server" ? "host" : i.role,
    }));

  if (invites.length === 0) {
    await onboardingSetStep(organizationId, 7, { team_invites: 0 });
    return { ok: true as const, step: 7 };
  }

  const res = await rpc("app_onboarding_step_team", {
    _organization_id: organizationId,
    _invites: invites,
  });
  if (res.ok) {
    await onboardingSetStep(organizationId, 7, { team_invites: invites.length });
  }
  return res;
}

export async function onboardingCheckSlug(slug: string, organizationOrRestaurantId?: string) {
  const clean = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)) {
    return { ok: false as const, available: false, error: "Invalid slug" };
  }
  // Org locations table (when migrated)
  const { data, error } = await (supabase as any)
    .from("locations")
    .select("id, organization_id")
    .eq("public_slug", clean)
    .maybeSingle();
  if (!error && data) {
    if (organizationOrRestaurantId && data.organization_id === organizationOrRestaurantId) {
      return { ok: true as const, available: true };
    }
    return { ok: true as const, available: false };
  }
  // Legacy v2 restaurants
  const { data: rest, error: rErr } = await supabase
    .from("v2_restaurants")
    .select("id")
    .eq("slug", clean)
    .maybeSingle();
  if (rErr && rErr.code !== "PGRST116") {
    return { ok: false as const, available: false, error: rErr.message };
  }
  if (!rest) return { ok: true as const, available: true };
  if (organizationOrRestaurantId && rest.id === organizationOrRestaurantId) {
    return { ok: true as const, available: true };
  }
  return { ok: true as const, available: false };
}

export async function onboardingComplete(organizationId: string, slug?: string) {
  if (slug) {
    const { data: loc } = await (supabase as any)
      .from("locations")
      .select("id")
      .eq("organization_id", organizationId)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (loc?.id) {
      const check = await onboardingCheckSlug(slug, organizationId);
      if (!check.available) {
        return { ok: false as const, error: "Slug is not available" };
      }
      await (supabase as any).from("locations").update({ public_slug: slug }).eq("id", loc.id);
    }
  }
  const res = await onboardingSetStep(organizationId, 7, { completed: true });
  await (supabase as any).rpc("app_onboarding_step_done", { _organization_id: organizationId });
  return res;
}

const LEGACY_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function hoursRangesToWeekHours(input: HoursStepInput): Record<string, { open: string; close: string; closed: boolean }> {
  const week: Record<string, { open: string; close: string; closed: boolean }> = {};
  for (let i = 0; i < 7; i++) {
    const key = LEGACY_DAY_KEYS[i]!;
    const closed = input.closed_days.includes(i);
    const range = input.ranges.find((r) => r.day === i);
    week[key] = {
      open: range?.open ?? "11:00",
      close: range?.close ?? "22:00",
      closed,
    };
  }
  return week;
}

/** Load existing restaurant into the wizard when org schema isn't available. */
export async function legacyOnboardingLoadRestaurant(restaurantId: string) {
  const { data, error } = await supabase
    .from("v2_restaurants")
    .select("id, name, slug, address, city, phone, website, cuisine, timezone, logo_url, hours")
    .eq("id", restaurantId)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Restaurant not found" };
  return {
    ok: true as const,
    restaurant: {
      name: data.name ?? "",
      location_name: "Main",
      address: data.address ?? "",
      city: data.city ?? "",
      phone: data.phone ?? "",
      website: data.website ?? "",
      cuisine: data.cuisine ?? "",
      timezone: data.timezone || "America/Toronto",
      google_place_id: null as string | null,
      logo_url: data.logo_url,
      slug: data.slug || undefined,
    },
    slug: data.slug ?? "",
    location_id: data.id,
    hours: data.hours,
  };
}

/** Persist restaurant profile + primary location fields on v2_restaurants. */
export async function legacyOnboardingSaveRestaurant(
  restaurantId: string,
  input: RestaurantStepInput,
) {
  const parsed = restaurantStepSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  const p = parsed.data;
  const slug = (p.slug?.trim() || slugifyFromName(p.name)).slice(0, 64);
  const { data: current } = await supabase
    .from("v2_restaurants")
    .select("integrations")
    .eq("id", restaurantId)
    .maybeSingle();
  const patch: Record<string, unknown> = {
    name: p.name.trim(),
    slug,
    address: p.address?.trim() || null,
    city: p.city?.trim() || null,
    phone: p.phone?.trim() || null,
    website: p.website?.trim() || null,
    cuisine: p.cuisine?.trim() || null,
    timezone: p.timezone || "America/Toronto",
    logo_url: p.logo_url || null,
  };
  // Normalize bad array integrations so Settings → Locations can store extras.
  if (Array.isArray(current?.integrations)) {
    patch.integrations = {};
  }
  const { error } = await supabase
    .from("v2_restaurants")
    .update(patch as never)
    .eq("id", restaurantId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, location_id: restaurantId, public_slug: slug };
}

export async function legacyOnboardingSaveHours(restaurantId: string, input: HoursStepInput) {
  const parsed = hoursStepSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  const hours = hoursRangesToWeekHours(parsed.data);
  const { error } = await supabase
    .from("v2_restaurants")
    .update({ hours: hours as never })
    .eq("id", restaurantId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function legacyOnboardingSaveBookingRules(
  restaurantId: string,
  input: BookingStepInput,
) {
  const parsed = bookingStepSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  const p = parsed.data;
  const { data: current } = await supabase
    .from("v2_restaurants")
    .select("integrations")
    .eq("id", restaurantId)
    .maybeSingle();
  const integrations =
    current?.integrations && typeof current.integrations === "object" && !Array.isArray(current.integrations)
      ? { ...(current.integrations as Record<string, unknown>) }
      : {};
  integrations.booking_rules = {
    slot_interval_minutes: p.slot_interval_minutes,
    max_covers_per_slot: p.max_covers_per_slot,
    turn_times: turnTimesToJson(p.turn_times),
    min_party_size: p.min_party_size,
    max_party_size: p.max_party_size,
    advance_days: p.advance_days,
    lead_time_hours: p.lead_time_hours,
    use_opening_hours: p.use_opening_hours,
    booking_ranges: p.booking_ranges ?? [],
  };
  const { error } = await supabase
    .from("v2_restaurants")
    .update({ integrations: integrations as never })
    .eq("id", restaurantId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function legacyOnboardingSaveTables(
  restaurantId: string,
  count: number,
  seats: number,
  section: string,
) {
  const safeCount = Math.max(0, Math.min(60, Math.trunc(count)));
  if (safeCount === 0) return { ok: true as const, seeded: 0 };

  const { count: existing } = await supabase
    .from("v2_tables")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  if ((existing ?? 0) > 0) {
    // Already seeded — don't duplicate on wizard re-entry.
    return { ok: true as const, seeded: 0 };
  }

  const rows = Array.from({ length: safeCount }, (_, i) => ({
    restaurant_id: restaurantId,
    table_number: String(i + 1),
    section: section || "Main Floor",
    capacity: Math.max(1, seats),
    status: "available" as const,
    shape: "rectangle" as const,
  }));
  const { error } = await supabase.from("v2_tables").insert(rows);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, seeded: rows.length };
}

export async function legacyOnboardingComplete(restaurantId: string, slug?: string) {
  const patch: Record<string, unknown> = {
    onboarding_completed_at: new Date().toISOString(),
  };
  if (slug?.trim()) {
    const clean = slug.trim().toLowerCase();
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)) {
      // Ensure slug uniqueness among restaurants
      const { data: clash } = await supabase
        .from("v2_restaurants")
        .select("id")
        .eq("slug", clean)
        .neq("id", restaurantId)
        .maybeSingle();
      if (clash) return { ok: false as const, error: "Slug is not available" };
      patch.slug = clean;
    }
  }
  const { error } = await supabase.from("v2_restaurants").update(patch as never).eq("id", restaurantId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

function slugifyFromName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || `restaurant-${Date.now()}`
  );
}

/** Legacy exports kept for older imports */
export async function onboardingGet(organizationId: string) {
  return onboardingGetV1(organizationId);
}
export async function onboardingWelcome(organizationId: string, input: { full_name: string }) {
  return onboardingBootstrapOwner(input.full_name);
}
export async function billingVerify(organizationId: string) {
  return rpc("app_billing_verify_subscription", { _organization_id: organizationId });
}
export async function onboardingOrganization(
  organizationId: string,
  input: { organization_name: string },
) {
  return onboardingSaveRestaurant(organizationId, {
    name: input.organization_name,
    location_name: "Main",
    address: "",
    city: "",
    phone: "",
    website: "",
    cuisine: "",
    timezone: "America/Toronto",
  });
}
export async function onboardingLocation() {
  return { ok: false as const, error: "Use v1 wizard" };
}
export async function onboardingTables() {
  return { ok: false as const, error: "Use v1 wizard" };
}
export async function onboardingBooking() {
  return { ok: false as const, error: "Use v1 wizard" };
}
export async function onboardingTeam(organizationId: string, input: TeamStepInput) {
  return onboardingSaveTeam(organizationId, input);
}
export async function onboardingDone(organizationId: string) {
  return onboardingComplete(organizationId);
}
