import { z } from "zod";

export const drawToolSchema = z.enum(["pen", "highlighter", "eraser"]);
export type DrawTool = z.infer<typeof drawToolSchema>;

export const strokeSchema = z.object({
  id: z.string(),
  tool: drawToolSchema,
  color: z.string(),
  width: z.number(),
  points: z.array(z.tuple([z.number(), z.number()])),
  authorId: z.string().uuid()
});
export type Stroke = z.infer<typeof strokeSchema>;

export const roomDrawingSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  layer_locked: z.boolean(),
  strokes: z.array(strokeSchema),
  created_at: z.string(),
  updated_at: z.string()
});
export type RoomDrawing = z.infer<typeof roomDrawingSchema>;
