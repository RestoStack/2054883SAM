import { z } from "zod";
import {
  dayHoursSchema,
  orgRoleSchema,
  planIdSchema,
  weekHoursSchema,
} from "./onboarding";

/** Settings Zod schemas — shared client + Edge Functions. */

export const profileUpdateSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  logo_url: z.string().max(2000).nullable().optional(),
  timezone: z.string().min(1).max(80).optional(),
  currency: z.string().min(3).max(3).optional(),
  locale: z.string().min(2).max(16).optional(),
});

export const locationUpsertSchema = z.object({
  organization_id: z.string().uuid(),
  location_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(120),
  public_slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(2)
    .max(64)
    .optional(),
  address: z.string().trim().max(300).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  timezone: z.string().min(1).max(80).optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const hoursUpdateSchema = z.object({
  organization_id: z.string().uuid(),
  location_id: z.string().uuid(),
  hours: weekHoursSchema,
});

export const specialHoursSchema = z.object({
  organization_id: z.string().uuid(),
  location_id: z.string().uuid(),
  on_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  open: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  close: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  is_closed: z.boolean().default(false),
  label: z.string().trim().max(80).optional().nullable(),
});

export const teamInviteCreateSchema = z.object({
  organization_id: z.string().uuid(),
  email: z.string().trim().email(),
  role: orgRoleSchema.exclude(["owner"]).default("host"),
});

export const teamRoleUpdateSchema = z.object({
  organization_id: z.string().uuid(),
  membership_id: z.string().uuid(),
  role: orgRoleSchema.exclude(["owner"]),
});

export const teamRemoveSchema = z.object({
  organization_id: z.string().uuid(),
  membership_id: z.string().uuid(),
});

export const billingPortalSchema = z.object({
  organization_id: z.string().uuid(),
  return_url: z.string().url(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type LocationUpsertInput = z.infer<typeof locationUpsertSchema>;
export type HoursUpdateInput = z.infer<typeof hoursUpdateSchema>;
export type SpecialHoursInput = z.infer<typeof specialHoursSchema>;
export type TeamInviteCreateInput = z.infer<typeof teamInviteCreateSchema>;
export type TeamRoleUpdateInput = z.infer<typeof teamRoleUpdateSchema>;
export type TeamRemoveInput = z.infer<typeof teamRemoveSchema>;

export { dayHoursSchema, weekHoursSchema, planIdSchema, orgRoleSchema };
