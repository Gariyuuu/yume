import { z } from "zod";

export const mediaProviderSchema = z.enum(["youtube", "spotify"]);
export type MediaProvider = z.infer<typeof mediaProviderSchema>;

export const mediaControlModeSchema = z.enum(["host_only", "collaborative"]);
export type MediaControlMode = z.infer<typeof mediaControlModeSchema>;

export const mediaSessionSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  provider: mediaProviderSchema,
  control_mode: mediaControlModeSchema,
  current_item_id: z.string().uuid().nullable(),
  playback_state: z.enum(["playing", "paused"]),
  position_ms: z.number(),
  updated_at: z.string(),
  updated_by: z.string().uuid().nullable()
});
export type MediaSession = z.infer<typeof mediaSessionSchema>;

export const mediaQueueItemSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  provider: mediaProviderSchema,
  external_id: z.string(),
  title: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  duration_ms: z.number().nullable(),
  added_by: z.string().uuid().nullable(),
  position: z.number(),
  created_at: z.string()
});
export type MediaQueueItem = z.infer<typeof mediaQueueItemSchema>;
