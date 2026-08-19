import { z } from "zod";

export const hostTableStatusSchema = z.enum([
  "available",
  "occupied",
  "reserved",
  "cleaning",
  "blocked",
]);

export const hostReservationStatusSchema = z.enum([
  "pending",
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
]);

export const hostSeatSchema = z.object({
  organization_id: z.string().uuid(),
  reservation_id: z.string().uuid(),
  table_id: z.string().uuid(),
});

export const hostUnseatSchema = z.object({
  organization_id: z.string().uuid(),
  reservation_id: z.string().uuid(),
  complete: z.boolean().optional().default(false),
});

export const hostSetTableStatusSchema = z.object({
  organization_id: z.string().uuid(),
  table_id: z.string().uuid(),
  status: z.enum(["available", "cleaning", "blocked"]),
});

export const hostWalkInSchema = z.object({
  organization_id: z.string().uuid(),
  location_id: z.string().uuid(),
  guest_name: z.string().trim().min(1).max(120),
  party_size: z.number().int().min(1).max(50),
  table_id: z.string().uuid().optional().nullable(),
  table_number: z.string().trim().max(32).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  restaurant_id: z.string().uuid().optional().nullable(),
});

export type HostSeatInput = z.infer<typeof hostSeatSchema>;
export type HostUnseatInput = z.infer<typeof hostUnseatSchema>;
export type HostSetTableStatusInput = z.infer<typeof hostSetTableStatusSchema>;
export type HostWalkInInput = z.infer<typeof hostWalkInSchema>;
