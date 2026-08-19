import { z } from "zod";

export const availabilityQuerySchema = z.object({
  slug: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const createReservationSchema = z.object({
  slug: z.string().min(1).max(64),
  guest_name: z.string().trim().min(1).max(120),
  guest_phone: z.string().trim().max(40).optional().default(""),
  guest_email: z.string().trim().email().optional().or(z.literal("")).default(""),
  party_size: z.number().int().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  section: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  client_key: z.string().max(120).optional().nullable(),
});

export const bookingRulesSchema = z.object({
  organization_id: z.string().uuid(),
  location_id: z.string().uuid(),
  slot_interval_minutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  max_party_size: z.number().int().min(1).max(50),
  lead_time_hours: z.number().int().min(0).max(168),
});

export const walkInSchema = z.object({
  organization_id: z.string().uuid(),
  location_id: z.string().uuid(),
  guest_name: z.string().trim().min(1).max(120),
  party_size: z.number().int().min(1).max(50),
  table_number: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type BookingRulesInput = z.infer<typeof bookingRulesSchema>;
