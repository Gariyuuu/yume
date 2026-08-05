import { z } from "zod";

export const roomInviteSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  token: z.string(),
  created_by: z.string().uuid(),
  requires_owner_approval: z.boolean(),
  max_uses: z.number().int().positive().nullable(),
  use_count: z.number().int(),
  expires_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  created_at: z.string(),
  has_password: z.boolean()
});
export type RoomInvite = z.infer<typeof roomInviteSchema>;

export const createInviteInputSchema = z.object({
  room_id: z.string().uuid(),
  password: z.string().min(4).max(128).optional(),
  requires_owner_approval: z.boolean().default(false),
  max_uses: z.number().int().positive().optional(),
  expires_in_hours: z.number().int().positive().max(24 * 30).optional()
});
export type CreateInviteInput = z.infer<typeof createInviteInputSchema>;

/** Body sent to the join-room Edge Function. */
export const joinRoomRequestSchema = z.object({
  token: z.string().min(1),
  password: z.string().optional(),
  guest_display_name: z.string().min(1).max(60).optional(),
  guest_avatar_url: z.string().url().optional()
});
export type JoinRoomRequest = z.infer<typeof joinRoomRequestSchema>;

export const joinRoomResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("joined"), room_id: z.string().uuid() }),
  z.object({ status: z.literal("pending_approval"), room_id: z.string().uuid() }),
  z.object({
    status: z.literal("error"),
    reason: z.enum([
      "invalid_token",
      "expired",
      "revoked",
      "wrong_password",
      "room_full",
      "banned",
      "room_locked",
      "rate_limited",
      "join_failed"
    ])
  })
]);
export type JoinRoomResponse = z.infer<typeof joinRoomResponseSchema>;
