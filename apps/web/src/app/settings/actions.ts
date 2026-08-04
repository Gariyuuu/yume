"use server";

import { profileInputSchema } from "@yume/room-schema";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireUser } from "@/lib/auth/session";
import { supabaseUrl } from "@/lib/supabase/env";

export type SettingsActionState = {
  error?: string;
  message?: string;
};

export async function updateProfileAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const profile = await requireProfile();

  const parsed = profileInputSchema.safeParse({
    display_name: formData.get("displayName"),
    avatar_url: formData.get("avatarUrl") || undefined
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      avatar_url: parsed.data.avatar_url ?? null
    })
    .eq("id", profile.id);

  if (error) {
    return { error: error.message };
  }

  return { message: "Profile updated." };
}

/** Signs out every session except the one making this request. */
export async function signOutOtherSessionsAction(): Promise<SettingsActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });

  if (error) {
    return { error: error.message };
  }

  return { message: "Signed out of all other sessions." };
}

/**
 * Calls the delete-account Edge Function with the caller's own access
 * token — the function re-verifies that token server-side and only ever
 * deletes the user it identifies, never a client-supplied id. Deleting an
 * auth.users row requires the service role, which is why this can't just
 * be a direct RLS-guarded table write like the rest of this file.
 */
export async function deleteAccountAction(): Promise<SettingsActionState> {
  await requireUser();
  const supabase = await createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return { error: "Not signed in." };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Could not delete account." };
  }

  await supabase.auth.signOut();
  redirect("/sign-in");
}
