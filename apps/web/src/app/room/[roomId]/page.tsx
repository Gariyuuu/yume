import type { RoomAsset, RoomObject } from "@yume/room-schema";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { RoomHistoryDialog } from "@/components/decoration/room-history-dialog";
import { RoomTemplatesDialog } from "@/components/decoration/room-templates-dialog";
import { NotesDialog } from "@/components/notes/notes-dialog";
import { RoomStage } from "@/components/room-stage";
import { TimersDialog } from "@/components/timers/timers-dialog";
import { YouTubeDialog } from "@/components/youtube/youtube-dialog";
import { SpotifyDialog } from "@/components/spotify/spotify-dialog";
import { GamesDialog } from "@/components/games/games-dialog";
import { SafetyDialog } from "@/components/moderation/safety-dialog";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InviteDialog } from "./invite-dialog";

export default async function RoomPage({ params }: PageProps<"/room/[roomId]">) {
  const { roomId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: room }, { data: membership }, { data: objects }, { data: assets }, { data: templates }] =
    await Promise.all([
      supabase.from("rooms").select("*").eq("id", roomId).maybeSingle(),
      supabase
        .from("room_memberships")
        .select("role")
        .eq("room_id", roomId)
        .eq("profile_id", profile.id)
        .maybeSingle(),
      supabase.from("room_objects").select("*").eq("room_id", roomId),
      supabase.from("room_assets").select("*").eq("is_active", true).order("category"),
      supabase.from("room_templates").select("id, name, description").order("name")
    ]);

  if (!room) notFound();
  if (!membership) redirect("/rooms");

  const canManageAll = membership.role === "owner" || membership.role === "moderator";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-6 py-4">
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
          <NotesDialog roomId={room.id} currentProfileId={profile.id} canManageAll={canManageAll} />
          <TimersDialog roomId={room.id} currentProfileId={profile.id} canManageAll={canManageAll} />
          <YouTubeDialog roomId={room.id} canManageAll={canManageAll} />
          <SpotifyDialog roomId={room.id} />
          <GamesDialog roomId={room.id} currentProfileId={profile.id} canManageAll={canManageAll} />
          <RoomTemplatesDialog roomId={room.id} templates={templates ?? []} />
          {canManageAll ? <RoomHistoryDialog roomId={room.id} /> : null}
          {canManageAll ? <InviteDialog roomId={room.id} /> : null}
          {canManageAll ? <SafetyDialog roomId={room.id} isLocked={room.is_locked} /> : null}
          <Link href="/settings">
            <Button variant="ghost">Settings</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6">
        <RoomStage
          roomId={room.id}
          initialObjects={(objects ?? []) as RoomObject[]}
          assets={(assets ?? []) as RoomAsset[]}
          profile={{
            id: profile.id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url
          }}
          canManageAll={canManageAll}
          audioMode={room.audio_mode}
        />
      </main>

      <ChatPanel roomId={room.id} currentProfileId={profile.id} canManageAll={canManageAll} />
    </div>
  );
}
