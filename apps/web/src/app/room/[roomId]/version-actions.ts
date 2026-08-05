"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

export type ActionState = { error?: string };

/** Debounced-on-the-client autosave snapshot — see
 *  docs/phase-1/05-sync-protocol.md §4. Any member can trigger one
 *  (matches the room_versions insert RLS policy in
 *  supabase/migrations/0006_phase4_rls.sql). */
export async function createRoomVersionAction(roomId: string): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: objects, error: objectsError } = await supabase
    .from("room_objects")
    .select("*")
    .eq("room_id", roomId);

  if (objectsError) return { error: objectsError.message };
  if (!objects || objects.length === 0) return {};

  const { error } = await supabase.from("room_versions").insert({
    room_id: roomId,
    snapshot: objects,
    created_by: user.id
  });

  if (error) return { error: error.message };
  return {};
}

export async function restoreRoomVersionAction(
  roomId: string,
  versionId: string
): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("restore_room_version", {
    p_room_id: roomId,
    p_version_id: versionId
  });

  if (error) return { error: error.message };

  revalidatePath(`/room/${roomId}`);
  return {};
}
