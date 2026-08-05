"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireUser } from "@/lib/auth/session";

export type ActionState = { error?: string };

/** Bulk-inserts a template's starting objects into the room. Any member
 *  can do this (same RLS as adding a single decoration) — not gated to
 *  owner/moderator, since decorating together is meant to be collaborative
 *  (see docs/phase-1/01-prd.md). */
export async function applyTemplateAction(roomId: string, templateId: string): Promise<ActionState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from("room_templates")
    .select("objects")
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return { error: "Could not load that template." };
  }

  const objects = (template.objects as Array<Record<string, unknown>>) ?? [];
  if (objects.length === 0) {
    revalidatePath(`/room/${roomId}`);
    return {};
  }

  const rows = objects.map((object, index) => ({
    room_id: roomId,
    type: object["type"],
    asset_url: object["asset_url"] ?? null,
    x: object["x"] ?? 0,
    y: object["y"] ?? 0,
    width: object["width"] ?? 100,
    height: object["height"] ?? 100,
    rotation: object["rotation"] ?? 0,
    z_index: object["z_index"] ?? index,
    owner_id: profile.id,
    data: object["data"] ?? null
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- template.objects is untyped jsonb; validated loosely at the DB layer by room_object_type
  const { error } = await supabase.from("room_objects").insert(rows as any);
  if (error) return { error: error.message };

  revalidatePath(`/room/${roomId}`);
  return {};
}

export async function saveRoomAsTemplateAction(
  roomId: string,
  name: string
): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: objects, error: objectsError } = await supabase
    .from("room_objects")
    .select("type, asset_url, x, y, width, height, rotation, z_index, data")
    .eq("room_id", roomId);

  if (objectsError) return { error: objectsError.message };

  const { error } = await supabase.from("room_templates").insert({
    name,
    is_system_template: false,
    created_by: user.id,
    objects: objects ?? []
  });

  if (error) return { error: error.message };
  return {};
}
