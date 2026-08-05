import { z } from "zod";

export const roomAssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  asset_url: z.string(),
  thumbnail_url: z.string().nullable(),
  license_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
  created_at: z.string()
});
export type RoomAsset = z.infer<typeof roomAssetSchema>;
