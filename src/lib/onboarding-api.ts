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

export async function onboardingCheckSlug(slug: string, organizationId?: string) {
  const clean = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)) {
    return { ok: false as const, available: false, error: "Invalid slug" };
  }
  let q = (supabase as any).from("locations").select("id, organization_id").eq("public_slug", clean);
  const { data, error } = await q.maybeSingle();
  if (error && error.code !== "PGRST116") {
    return { ok: false as const, available: false, error: error.message };
  }
  if (!data) return { ok: true as const, available: true };
  if (organizationId && data.organization_id === organizationId) {
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
