import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Personal data export (brief requirement: "personal data export"). Runs
 * under the caller's own RLS-scoped session — no service role needed,
 * since every table here already allows a user to read their own rows.
 *
 * Only covers tables @yume/supabase-types knows about so far (Phase 2
 * scope). Extend this once room_messages/room_notes/etc. are added to
 * the generated types in a later phase — see
 * packages/supabase-types/src/database.ts's header comment.
 */
export async function GET() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: memberships }, { data: ownedObjects }] = await Promise.all([
    supabase.from("room_memberships").select("*").eq("profile_id", profile.id),
    supabase.from("room_objects").select("*").eq("owner_id", profile.id)
  ]);

  const exportPayload = {
    exported_at: new Date().toISOString(),
    profile,
    room_memberships: memberships ?? [],
    owned_room_objects: ownedObjects ?? []
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="yume-data-export.json"`
    }
  });
}
