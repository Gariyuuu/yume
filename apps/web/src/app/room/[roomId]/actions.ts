"use server";

import { createInviteInputSchema } from "@yume/room-schema";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hashInvitePassword } from "@/lib/invite-password";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

export type CreateInviteState = {
  error?: string;
  inviteUrl?: string;
};

export async function createInviteAction(
  _prevState: CreateInviteState,
  formData: FormData
): Promise<CreateInviteState> {
  await requireUser();

  const password = formData.get("password");

  const parsed = createInviteInputSchema.safeParse({
    room_id: formData.get("roomId"),
    password: password ? String(password) : undefined,
    requires_owner_approval: formData.get("requiresApproval") === "on",
    max_uses: formData.get("maxUses") ? Number(formData.get("maxUses")) : undefined,
    expires_in_hours: formData.get("expiresInHours")
      ? Number(formData.get("expiresInHours"))
      : undefined
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const token = randomBytes(24).toString("base64url");
  const expiresAt = parsed.data.expires_in_hours
    ? new Date(Date.now() + parsed.data.expires_in_hours * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from("room_invites").insert({
    room_id: parsed.data.room_id,
    token,
    created_by: user.id,
    password_hash: parsed.data.password ? hashInvitePassword(parsed.data.password) : null,
    requires_owner_approval: parsed.data.requires_owner_approval,
    max_uses: parsed.data.max_uses ?? null,
    expires_at: expiresAt
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/room/${parsed.data.room_id}`);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return { inviteUrl: `${siteUrl}/invite/${token}` };
}

export async function revokeInviteAction(inviteId: string, roomId: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase
    .from("room_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId);

  revalidatePath(`/room/${roomId}`);
}

export async function updateRoomAudioModeAction(
  roomId: string,
  audioMode: "spatial" | "room_wide"
): Promise<{ error?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("rooms").update({ audio_mode: audioMode }).eq("id", roomId);

  if (error) return { error: error.message };

  revalidatePath(`/room/${roomId}`);
  return {};
}

export async function updateOwnStatusAction(
  status: "online" | "away" | "busy" | "studying" | "offline"
): Promise<{ error?: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", user.id);

  if (error) return { error: error.message };
  return {};
}
