import { z } from "zod";

export const noteTypeSchema = z.enum(["sticky", "checklist", "text"]);
export type NoteType = z.infer<typeof noteTypeSchema>;

export const noteEditModeSchema = z.enum(["owner", "everyone"]);
export type NoteEditMode = z.infer<typeof noteEditModeSchema>;

export const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean()
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

/** `content` shape depends on `type`: sticky/text use { text }, checklist uses { items }. */
export const noteContentSchema = z.union([
  z.object({ text: z.string() }),
  z.object({ items: z.array(checklistItemSchema) })
]);
export type NoteContent = z.infer<typeof noteContentSchema>;

export const roomNoteSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  type: noteTypeSchema,
  content: z.record(z.unknown()),
  color: z.string().nullable(),
  pinned: z.boolean(),
  locked: z.boolean(),
  edit_mode: noteEditModeSchema,
  owner_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});
export type RoomNote = z.infer<typeof roomNoteSchema>;

export const NOTE_COLORS = ["#fde68a", "#fecaca", "#bfdbfe", "#bbf7d0", "#e9d5ff"] as const;
