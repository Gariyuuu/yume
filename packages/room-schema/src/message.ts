import { z } from "zod";

export const roomMessageSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  author_id: z.string().uuid().nullable(),
  body: z.string().nullable(),
  image_url: z.string().nullable(),
  reply_to_id: z.string().uuid().nullable(),
  mentions: z.array(z.string().uuid()),
  deleted_at: z.string().nullable(),
  deleted_by: z.string().uuid().nullable(),
  created_at: z.string()
});
export type RoomMessage = z.infer<typeof roomMessageSchema>;

export const messageReactionSchema = z.object({
  id: z.string().uuid(),
  message_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  emoji: z.string(),
  created_at: z.string()
});
export type MessageReaction = z.infer<typeof messageReactionSchema>;
