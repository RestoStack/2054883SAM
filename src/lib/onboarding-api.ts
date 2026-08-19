/**
 * Client helpers for onboarding RPCs (Zod-validated payloads).
 */
import { supabase } from "@/integrations/supabase/client";
import {
  bookingStepSchema,
  locationStepSchema,
  organizationStepSchema,
  tablesStepSchema,
  teamStepSchema,
  welcomeStepSchema,
  type BookingStepInput,
  type LocationStepInput,
  type OnboardingStepId,
  type OrganizationStepInput,
  type TablesStepInput,
  type TeamStepInput,
  type WelcomeStepInput,
} from "@/lib/schemas/onboarding";

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await (supabase as any).rpc(name, args);
  if (error) return { ok: false as const, error: error.message };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "Request failed" };
  return data as { ok: true; [k: string]: unknown };
}

export async function onboardingGet(organizationId: string) {
  return rpc("app_onboarding_get", { _organization_id: organizationId });
}

export async function onboardingWelcome(organizationId: string, input: WelcomeStepInput) {
  const parsed = welcomeStepSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_onboarding_step_welcome", {
    _organization_id: organizationId,
    _full_name: parsed.data.full_name,
  });
}

export async function onboardingOrganization(
  organizationId: string,
  input: OrganizationStepInput,
) {
  const parsed = organizationStepSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_onboarding_step_organization", {
    _organization_id: organizationId,
    _organization_name: parsed.data.organization_name,
    _brand_color: parsed.data.brand_color,
    _logo_url: parsed.data.logo_path ?? null,
  });
}

export async function onboardingLocation(organizationId: string, input: LocationStepInput) {
  const parsed = locationStepSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_onboarding_step_location", {
    _organization_id: organizationId,
    _payload: parsed.data,
  });
}

export async function onboardingTables(
  organizationId: string,
  locationId: string,
  input: TablesStepInput,
) {
  const parsed = tablesStepSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_onboarding_step_tables", {
    _organization_id: organizationId,
    _location_id: locationId,
    _groups: parsed.data.groups,
  });
}

export async function onboardingBooking(
  organizationId: string,
  locationId: string,
  input: BookingStepInput,
) {
  const parsed = bookingStepSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  return rpc("app_onboarding_step_booking", {
    _organization_id: organizationId,
    _location_id: locationId,
    _slot_interval_minutes: parsed.data.slot_interval_minutes,
    _max_party_size: parsed.data.max_party_size,
    _lead_time_hours: parsed.data.lead_time_hours,
  });
}

export async function onboardingTeam(organizationId: string, input: TeamStepInput) {
  const parsed = teamStepSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Invalid" };
  const invites = parsed.data.invites.filter((i) => i.email.trim());
  return rpc("app_onboarding_step_team", {
    _organization_id: organizationId,
    _invites: invites,
  });
}

export async function onboardingDone(organizationId: string) {
  return rpc("app_onboarding_step_done", { _organization_id: organizationId });
}

export async function billingVerify(organizationId: string) {
  return rpc("app_billing_verify_subscription", { _organization_id: organizationId });
}

export type ProgressState = {
  current_step: OnboardingStepId;
  location_id: string | null;
  public_slug: string | null;
  draft: Record<string, unknown>;
};
