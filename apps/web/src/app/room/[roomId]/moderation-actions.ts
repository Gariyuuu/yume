"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string };

/** Plain RLS-scoped inserts (see supabase/migrations/0016_moderation_rls.sql)
 *  — no service role needed, this is a single-table Postgres write, not a
 *  cross-system action like kick/ban (livekit-actions.ts). */
export async function reportAction(
  roomId: string,
  targetProfileId: string | null,
  messageId: string | null,
  reason: string,
  details?: string
): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("reports").insert({
    room_id: roomId,
    reported_by: profile.id,
    reported_profile_id: targetProfileId,
    message_id: messageId,
    reason,
    details: details || null
  });

  if (error?.message.includes("rate_limited")) return { error: "Too many reports — try again later." };
  return error ? { error: error.message } : {};
}

export async function resolveReportAction(
  reportId: string,
  roomId: string,
  status: "resolved" | "dismissed"
): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: profile.id })
    .eq("id", reportId);

  revalidatePath(`/room/${roomId}`);
  return error ? { error: error.message } : {};
}

export async function toggleRoomLockAction(roomId: string, locked: boolean): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("rooms").update({ is_locked: locked }).eq("id", roomId);
  revalidatePath(`/room/${roomId}`);
  return error ? { error: error.message } : {};
}

export async function blockUserAction(blockedId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("user_blocks").insert({ blocker_id: profile.id, blocked_id: blockedId });
  if (error && error.code !== "23505") return { error: error.message };
  return {};
}

export async function unblockUserAction(blockedId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("user_blocks").delete().eq("blocker_id", profile.id).eq("blocked_id", blockedId);
  revalidatePath("/settings");
  return {};
}
