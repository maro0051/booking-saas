import { z } from "zod";

export const businessBasicsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  description: z.string().max(2000).optional().or(z.literal("")),
  contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
  contact_phone: z.string().max(50).optional().or(z.literal("")),
  timezone: z.string().min(1),
  currency: z.string().length(3),
  locale: z.string().min(2).max(10),
});

export const businessHoursSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  is_open: z.boolean(),
  open_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  close_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
}).refine(
  (v) => !v.is_open || (v.open_time && v.close_time && v.open_time < v.close_time),
  { message: "Close time must be after open time" }
);