import { z } from "zod";

export const roomVersionSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  snapshot: z.array(z.unknown()),
  created_by: z.string().uuid().nullable(),
  created_at: z.string()
});
export type RoomVersion = z.infer<typeof roomVersionSchema>;
