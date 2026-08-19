import { z } from "zod";

/** Shared Zod schemas — client + Edge Functions (Phase 1 onboarding). */

export const planIdSchema = z.enum(["starter", "growth", "group"]);
export type PlanIdSchema = z.infer<typeof planIdSchema>;

export const orgRoleSchema = z.enum(["owner", "manager", "host"]);

export const dayHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean(),
});

export const weekHoursSchema = z.record(z.string(), dayHoursSchema);

export const onboardingStepSchema = z.enum([
  "welcome",
  "organization",
  "location",
  "tables",
  "booking",
  "team",
  "done",
]);
export type OnboardingStepId = z.infer<typeof onboardingStepSchema>;

export const STEP_ORDER: OnboardingStepId[] = [
  "welcome",
  "organization",
  "location",
  "tables",
  "booking",
  "team",
  "done",
];

export function stepIndex(id: OnboardingStepId): number {
  return STEP_ORDER.indexOf(id);
}

export function nextStep(id: OnboardingStepId): OnboardingStepId | null {
  const i = stepIndex(id);
  if (i < 0 || i >= STEP_ORDER.length - 1) return null;
  return STEP_ORDER[i + 1]!;
}

/** Step 1 — welcome + your name */
export const welcomeStepSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
});

/** Step 2 — org name, brand colour, logo */
export const organizationStepSchema = z.object({
  organization_name: z.string().trim().min(1, "Restaurant name is required").max(160),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex colour like #059669")
    .optional()
    .default("#059669"),
  logo_path: z.string().max(500).nullable().optional(),
});

/** Step 3 — first location */
export const locationStepSchema = z.object({
  location_name: z.string().trim().min(1).max(120).default("Main"),
  address: z.string().trim().max(300).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  timezone: z.string().min(1).default("America/Toronto"),
  public_slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, hyphens")
    .min(2)
    .max(64)
    .optional(),
  hours: weekHoursSchema,
});

/** Step 4 — tables quick-setup */
export const tableDraftSchema = z.object({
  count: z.number().int().min(1).max(200),
  capacity: z.number().int().min(1).max(24),
  section: z.string().trim().min(1).max(80).default("Main Floor"),
});
export const tablesStepSchema = z.object({
  groups: z.array(tableDraftSchema).min(1, "Add at least one table group").max(20),
});

/** Step 5 — booking basics */
export const bookingStepSchema = z.object({
  slot_interval_minutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).default(30),
  max_party_size: z.number().int().min(1).max(50).default(12),
  lead_time_hours: z.number().int().min(0).max(168).default(2),
});

/** Step 6 — invite team */
export const teamInviteSchema = z.object({
  email: z.string().trim().email(),
  role: orgRoleSchema.exclude(["owner"]).default("host"),
});
export const teamStepSchema = z.object({
  invites: z.array(teamInviteSchema).max(20).default([]),
});

/** Billing setup */
export const billingSetupSchema = z.object({
  plan_id: planIdSchema,
  organization_id: z.string().uuid(),
});

export const subscriptionStatusSchema = z.enum([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "unpaid",
]);

/** RPC envelopes */
export const rpcOkSchema = z.object({
  ok: z.literal(true),
  step: onboardingStepSchema.optional(),
  next_step: onboardingStepSchema.nullable().optional(),
  organization_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  public_slug: z.string().optional(),
  booking_url: z.string().optional(),
});

export const rpcErrSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

export type WelcomeStepInput = z.infer<typeof welcomeStepSchema>;
export type OrganizationStepInput = z.infer<typeof organizationStepSchema>;
export type LocationStepInput = z.infer<typeof locationStepSchema>;
export type TablesStepInput = z.infer<typeof tablesStepSchema>;
export type BookingStepInput = z.infer<typeof bookingStepSchema>;
export type TeamStepInput = z.infer<typeof teamStepSchema>;
