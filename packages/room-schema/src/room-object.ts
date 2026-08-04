import { z } from "zod";
import { permissionLevelSchema, roomObjectTypeSchema } from "./enums";

export const interactionPermissionsSchema = z.object({
  move: permissionLevelSchema,
  edit: permissionLevelSchema,
  delete: permissionLevelSchema
});
export type InteractionPermissions = z.infer<typeof interactionPermissionsSchema>;

export const defaultInteractionPermissions: InteractionPermissions = {
  move: "member",
  edit: "owner",
  delete: "owner"
};

export const roomObjectSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  type: roomObjectTypeSchema,
  asset_url: z.string().url().nullable(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  z_index: z.number().int(),
  locked: z.boolean(),
  owner_id: z.string().uuid().nullable(),
  interaction_permissions: interactionPermissionsSchema,
  data: z.record(z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  updated_by: z.string().uuid().nullable()
});
export type RoomObject = z.infer<typeof roomObjectSchema>;

/** Fields a client provides when placing a new object; the rest are server/DB defaults. */
export const createRoomObjectInputSchema = z.object({
  room_id: z.string().uuid(),
  type: roomObjectTypeSchema,
  asset_url: z.string().url().nullable().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive().default(100),
  height: z.number().positive().default(100),
  rotation: z.number().default(0),
  z_index: z.number().int().default(0),
  interaction_permissions: interactionPermissionsSchema
    .partial()
    .optional(),
  data: z.record(z.unknown()).nullable().optional()
});
export type CreateRoomObjectInput = z.infer<typeof createRoomObjectInputSchema>;

/** Tier-2 persisted transform update (drag-end / resize-end / rotate-end). */
export const updateRoomObjectTransformSchema = z.object({
  id: z.string().uuid(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  rotation: z.number().optional(),
  z_index: z.number().int().optional(),
  locked: z.boolean().optional()
});
export type UpdateRoomObjectTransform = z.infer<
  typeof updateRoomObjectTransformSchema
>;
