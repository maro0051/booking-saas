import { z } from "zod";

export const staffSchema = z.object({
  display_name: z.string().min(1, "Name is required").max(120),
  title: z.string().max(120).optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
  is_active: z.boolean().default(true),
  service_ids: z.array(z.string().uuid()).default([]),
  location_ids: z.array(z.string().uuid()).default([]),
});