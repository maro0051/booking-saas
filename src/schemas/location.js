import { z } from "zod";

export const locationSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  phone: z.string().max(50).optional().or(z.literal("")),
  address_line1: z.string().max(200).optional().or(z.literal("")),
  address_line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  region: z.string().max(100).optional().or(z.literal("")),
  postal_code: z.string().max(20).optional().or(z.literal("")),
  country: z.string().max(60).optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});