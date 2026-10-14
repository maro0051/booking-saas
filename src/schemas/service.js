import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  duration_minutes: z.coerce.number().int().min(5, "Min 5 minutes").max(1440),
  buffer_before_minutes: z.coerce.number().int().min(0).max(240).default(0),
  buffer_after_minutes: z.coerce.number().int().min(0).max(240).default(0),
  price_cents: z.coerce.number().int().min(0).max(10_000_00),
  deposit_cents: z.coerce.number().int().min(0).max(10_000_00).default(0),
  online_booking_enabled: z.boolean().default(true),
  is_active: z.boolean().default(true),
});