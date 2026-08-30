import { z } from "zod";

/** Onboarding wizard v1 — 7 steps at /onboarding/$step */

export const planIdSchema = z.enum(["starter", "growth", "group"]);
export type PlanIdSchema = z.infer<typeof planIdSchema>;

export const orgRoleSchema = z.enum(["owner", "manager", "host", "server"]);

export const WIZARD_STEPS = [
  { n: 1, id: "restaurant", title: "Restaurant", required: true },
  { n: 2, id: "hours", title: "Opening hours", required: true },
  { n: 3, id: "booking", title: "Booking rules", required: false },
  { n: 4, id: "tables", title: "Tables", required: false },
  { n: 5, id: "menu", title: "Menu", required: false },
  { n: 6, id: "team", title: "Team", required: false },
  { n: 7, id: "done", title: "Go live", required: false },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

export function stepFromParam(param: string): number {
  const n = Number(param);
  if (Number.isFinite(n) && n >= 1 && n <= 7) return Math.trunc(n);
  const byId = WIZARD_STEPS.find((s) => s.id === param);
  return byId?.n ?? 1;
}

export function stepMeta(n: number) {
  return WIZARD_STEPS.find((s) => s.n === n) ?? WIZARD_STEPS[0]!;
}

export function canSkipStep(n: number) {
  return n >= 3 && n <= 6;
}

export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const hourRangeSchema = z.object({
  day: z.number().int().min(0).max(6),
  open: timeSchema,
  close: timeSchema,
  sort: z.number().int().optional(),
});

export const restaurantStepSchema = z.object({
  name: z.string().trim().min(1, "Restaurant name is required").max(160),
  location_name: z.string().trim().min(1).max(120).default("Main"),
  address: z.string().trim().max(300).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  website: z.string().trim().max(300).optional().default(""),
  cuisine: z.string().trim().max(120).optional().default(""),
  timezone: z.string().min(1).default("America/Toronto"),
  google_place_id: z.string().max(200).optional().nullable(),
  logo_url: z.string().max(500).optional().nullable(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(2)
    .max(64)
    .optional(),
});

export const hoursStepSchema = z.object({
  ranges: z.array(hourRangeSchema).max(40),
  closed_days: z.array(z.number().int().min(0).max(6)).default([]),
});

export const bookingHoursRangeSchema = z.object({
  day: z.number().int().min(0).max(6),
  open: timeSchema,
  close: timeSchema,
});

export const bookingStepSchema = z.object({
  slot_interval_minutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).default(30),
  max_covers_per_slot: z.number().int().min(1).max(500).default(20),
  turn_times: z
    .object({
      party_1_2: z.number().int().min(30).max(300).default(75),
      party_3_4: z.number().int().min(30).max(300).default(90),
      party_5_plus: z.number().int().min(30).max(300).default(120),
    })
    .default({ party_1_2: 75, party_3_4: 90, party_5_plus: 120 }),
  min_party_size: z.number().int().min(1).max(50).default(1),
  max_party_size: z.number().int().min(1).max(50).default(12),
  advance_days: z.number().int().min(1).max(365).default(60),
  lead_time_hours: z.number().int().min(0).max(168).default(2),
  use_opening_hours: z.boolean().default(true),
  booking_ranges: z.array(bookingHoursRangeSchema).max(40).default([]),
});

export const tableQuickSchema = z.object({
  mode: z.literal("quick").default("quick"),
  count: z.number().int().min(1).max(200),
  seats: z.number().int().min(1).max(24),
  section: z.string().trim().min(1).max(80).default("Main Floor"),
  bookable_online: z.boolean().default(true),
});

/** Tables step — quick generate (primary) or group list (legacy-compatible). */
export const tablesStepSchema = z.object({
  mode: z.enum(["quick", "editor"]).default("quick"),
  count: z.number().int().min(1).max(200).default(8),
  seats: z.number().int().min(1).max(24).default(4),
  section: z.string().trim().min(1).max(80).default("Main Floor"),
  bookable_online: z.boolean().default(true),
  groups: z
    .array(
      z.object({
        count: z.number().int().min(1).max(200),
        capacity: z.number().int().min(1).max(24),
        section: z.string().trim().min(1).max(80).default("Main Floor"),
      }),
    )
    .max(20)
    .optional(),
});

export const menuItemDraftSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(500).optional().default(""),
  price_cents: z.number().int().min(0).default(0),
  category: z.string().trim().min(1).max(80).default("Mains"),
});

export const menuStepSchema = z.object({
  mode: z.enum(["upload", "link", "manual", "skip"]).default("skip"),
  link: z.string().optional().default(""),
  notes: z.string().max(500).optional(),
  items: z.array(menuItemDraftSchema).max(200).default([]),
});

export const teamInviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["manager", "host", "server"]).default("host"),
});

export const teamStepSchema = z.object({
  invites: z.array(teamInviteSchema).max(20).default([]),
});

export const doneStepSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, hyphens")
    .min(2)
    .max(64),
});

export const signupSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(20).optional(),
  password: z.string().min(8).max(128),
});

export type RestaurantStepInput = z.infer<typeof restaurantStepSchema>;
export type HoursStepInput = z.infer<typeof hoursStepSchema>;
export type BookingStepInput = z.infer<typeof bookingStepSchema>;
export type TablesStepInput = z.infer<typeof tablesStepSchema>;
export type MenuStepInput = z.infer<typeof menuStepSchema>;
export type TeamStepInput = z.infer<typeof teamStepSchema>;
export type DoneStepInput = z.infer<typeof doneStepSchema>;

/** Legacy aliases used by older wizard files / billing during cutover */
export const STEP_ORDER = WIZARD_STEPS.map((s) => s.id);
export type OnboardingStepId = WizardStepId;

export const onboardingStepSchema = z.enum([
  "restaurant",
  "hours",
  "booking",
  "tables",
  "menu",
  "team",
  "done",
  "welcome",
  "organization",
  "location",
]);

export function stepIndex(id: string): number {
  const found = WIZARD_STEPS.find((s) => s.id === id);
  return found ? found.n - 1 : -1;
}

export function nextStep(id: WizardStepId): WizardStepId | null {
  const i = stepIndex(id);
  if (i < 0 || i >= WIZARD_STEPS.length - 1) return null;
  return WIZARD_STEPS[i + 1]!.id;
}

export const dayHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean(),
});
export const weekHoursSchema = z.record(z.string(), dayHoursSchema);

export const welcomeStepSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
});
export const organizationStepSchema = z.object({
  organization_name: z.string().trim().min(1, "Restaurant name is required").max(160),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex colour like #059669")
    .optional()
    .default("#059669"),
  logo_path: z.string().max(500).nullable().optional(),
});
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

export type WelcomeStepInput = z.infer<typeof welcomeStepSchema>;
export type OrganizationStepInput = z.infer<typeof organizationStepSchema>;
export type LocationStepInput = z.infer<typeof locationStepSchema>;

export const DEFAULT_BOOKING: BookingStepInput = {
  slot_interval_minutes: 30,
  max_covers_per_slot: 20,
  turn_times: { party_1_2: 75, party_3_4: 90, party_5_plus: 120 },
  min_party_size: 1,
  max_party_size: 12,
  advance_days: 60,
  lead_time_hours: 2,
  use_opening_hours: true,
  booking_ranges: [],
};

export const DEFAULT_HOURS_RANGES: HoursStepInput = {
  ranges: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open: "11:00",
    close: "22:00",
    sort: 0,
  })),
  closed_days: [],
};

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function turnTimesToJson(t: BookingStepInput["turn_times"]) {
  return {
    "1": t.party_1_2,
    "2": t.party_1_2,
    "3": t.party_3_4,
    "4": t.party_3_4,
    "5": t.party_5_plus,
  };
}
