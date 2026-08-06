import { z } from "zod";
import { presenceStatusSchema } from "./enums";

export const profileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().min(1).max(60),
  avatar_url: z.string().url().nullable(),
  custom_avatar: z.record(z.unknown()).nullable(),
  status: presenceStatusSchema,
  is_guest: z.boolean(),
  background_url: z.string().url().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});
export type Profile = z.infer<typeof profileSchema>;

/** Fields a client is allowed to set when creating/updating their own profile. */
export const profileInputSchema = z.object({
  display_name: z.string().min(1).max(60),
  avatar_url: z.string().url().nullable().optional()
});
export type ProfileInput = z.infer<typeof profileInputSchema>;
