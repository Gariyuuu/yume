"use server";

import type { GameType } from "@yume/game-sdk";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string };

export async function createGameAction(
  roomId: string,
  gameType: GameType
): Promise<{ sessionId?: string; error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: session, error } = await supabase
    .from("game_sessions")
    .insert({ room_id: roomId, game_type: gameType, created_by: profile.id })
    .select("*")
    .single();

  if (error || !session) return { error: error?.message ?? "Could not create game." };

  await supabase.from("game_players").insert({ session_id: session.id, profile_id: profile.id });
  revalidatePath(`/room/${roomId}`);
  return { sessionId: session.id };
}

export async function joinGameAction(sessionId: string, asSpectator: boolean): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("game_players")
    .select("id")
    .eq("session_id", sessionId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (existing) return {};

  const { error } = await supabase
    .from("game_players")
    .insert({ session_id: sessionId, profile_id: profile.id, is_spectator: asSpectator });

  return error ? { error: error.message } : {};
}

export async function readyUpAction(sessionId: string, ready: boolean): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("game_players")
    .update({ is_ready: ready })
    .eq("session_id", sessionId)
    .eq("profile_id", profile.id);
  return error ? { error: error.message } : {};
}

export async function leaveGameAction(sessionId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("game_players").delete().eq("session_id", sessionId).eq("profile_id", profile.id);
  return {};
}

export async function deleteGameAction(sessionId: string, roomId: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  await supabase.from("game_sessions").delete().eq("id", sessionId);
  revalidatePath(`/room/${roomId}`);
  return {};
}
