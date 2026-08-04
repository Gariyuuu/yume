import "server-only";

import type { Profile } from "@yume/room-schema";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Redirects to sign-in if there's no session; otherwise returns the user. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

/** Same as requireUser(), but also loads the profiles row (creating it on first login if missing). */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const user = await requireUser();

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return existing as Profile;
  }

  const displayName =
    (user.user_metadata?.["display_name"] as string | undefined) ??
    user.email?.split("@")[0] ??
    "Friend";

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      display_name: displayName,
      is_guest: user.is_anonymous ?? false
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create profile for user ${user.id}: ${error?.message}`);
  }

  return created as Profile;
}
