import { z } from "zod";
import { presenceStatusSchema } from "./enums";

/**
 * Payload tracked on the `room:{roomId}:presence` Supabase Realtime
 * channel — see docs/phase-1/05-sync-protocol.md §2. Ephemeral only: this
 * never gets written to Postgres, it just describes who's currently in
 * the room and where their bubble is.
 */
export const roomPresenceSchema = z.object({
  profileId: z.string().uuid(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
  status: presenceStatusSchema,
  bubble: z.object({ x: z.number(), y: z.number() }),
  livekitConnected: z.boolean(),
  muted: z.boolean(),
  cameraOn: z.boolean(),
  speaking: z.boolean(),
  doNotDisturb: z.boolean()
});
export type RoomPresence = z.infer<typeof roomPresenceSchema>;
