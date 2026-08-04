import type { RoomObject } from "@yume/room-schema";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoomCanvasLoader } from "@/components/room-canvas/room-canvas-loader";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InviteDialog } from "./invite-dialog";

export default async function RoomPage({ params }: PageProps<"/room/[roomId]">) {
  const { roomId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: room }, { data: membership }, { data: objects }] = await Promise.all([
    supabase.from("rooms").select("*").eq("id", roomId).maybeSingle(),
    supabase
      .from("room_memberships")
      .select("role")
      .eq("room_id", roomId)
      .eq("profile_id", profile.id)
      .maybeSingle(),
    supabase.from("room_objects").select("*").eq("room_id", roomId)
  ]);

  if (!room) notFound();
  if (!membership) redirect("/rooms");

  const canManageAll = membership.role === "owner" || membership.role === "moderator";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/rooms" className="text-sm text-muted-foreground underline underline-offset-4">
            ← Rooms
          </Link>
          <h1 className="text-xl font-semibold">{room.name}</h1>
          <Badge variant="secondary" className="capitalize">
            {membership.role}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {canManageAll ? <InviteDialog roomId={room.id} /> : null}
          <Link href="/settings">
            <Button variant="ghost">Settings</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6">
        <RoomCanvasLoader
          roomId={room.id}
          initialObjects={(objects ?? []) as RoomObject[]}
          currentProfileId={profile.id}
          canManageAll={canManageAll}
        />
      </main>
    </div>
  );
}
