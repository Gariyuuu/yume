import { z } from "zod";

export const roomRoleSchema = z.enum(["owner", "moderator", "member", "guest"]);
export type RoomRole = z.infer<typeof roomRoleSchema>;

export const presenceStatusSchema = z.enum([
  "online",
  "away",
  "busy",
  "studying",
  "offline"
]);
export type PresenceStatus = z.infer<typeof presenceStatusSchema>;

export const roomObjectTypeSchema = z.enum([
  "furniture",
  "rug",
  "plant",
  "lamp",
  "poster",
  "frame",
  "window",
  "background",
  "gif",
  "sticker",
  "image",
  "text",
  "sticky_note",
  "embed",
  "drawing",
  "decorative"
]);
export type RoomObjectType = z.infer<typeof roomObjectTypeSchema>;

export const audioModeSchema = z.enum(["spatial", "room_wide"]);
export type AudioMode = z.infer<typeof audioModeSchema>;

/** Matches room_objects.interaction_permissions.{move,edit,delete} values. */
export const permissionLevelSchema = z.enum(["owner", "moderator", "member"]);
export type PermissionLevel = z.infer<typeof permissionLevelSchema>;
