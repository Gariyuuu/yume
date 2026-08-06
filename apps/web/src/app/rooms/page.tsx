import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateRoomForm } from "./create-room-form";

export default async function RoomsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: memberships }, { data: templates }] = await Promise.all([
    supabase
      .from("room_memberships")
      .select("role, rooms(id, name, updated_at)")
      .eq("profile_id", profile.id)
      .order("joined_at", { ascending: false }),
    supabase
      .from("room_templates")
      .select("id, name")
      .eq("is_system_template", true)
      .order("name")
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav current="rooms" />
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your rooms</h1>
          <CreateRoomForm templates={templates ?? []} />
        </div>

      {memberships && memberships.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {memberships.map((membership) => {
            const room = membership.rooms;
            if (!room) return null;
            return (
              <Link key={room.id} href={`/room/${room.id}`}>
                <Card className="rounded-card transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    <Badge variant="secondary" className="capitalize">
                      {membership.role}
                    </Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Updated {new Date(room.updated_at).toLocaleDateString()}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        ) : (
          <p className="text-muted-foreground">
            No rooms yet — create one to invite your friends.
          </p>
        )}
      </div>
    </div>
  );
}
