import { z } from "zod";
import { audioModeSchema, roomRoleSchema } from "./enums";

export const roomSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  template_id: z.string().uuid().nullable(),
  background_url: z.string().url().nullable(),
  is_locked: z.boolean(),
  capacity: z.number().int().min(2).max(12),
  audio_mode: audioModeSchema,
  created_at: z.string(),
  updated_at: z.string()
});
export type Room = z.infer<typeof roomSchema>;

export const createRoomInputSchema = z.object({
  name: z.string().min(1).max(80),
  template_id: z.string().uuid().nullable().optional()
});
export type CreateRoomInput = z.infer<typeof createRoomInputSchema>;

export const roomMembershipSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  role: roomRoleSchema,
  joined_at: z.string(),
  last_seen_at: z.string()
});
export type RoomMembership = z.infer<typeof roomMembershipSchema>;

export const roomTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  is_system_template: z.boolean(),
  created_by: z.string().uuid().nullable(),
  objects: z.array(z.unknown()),
  created_at: z.string()
});
export type RoomTemplate = z.infer<typeof roomTemplateSchema>;
