"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { restoreRoomVersionAction } from "@/app/room/[roomId]/version-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

type Version = { id: string; created_at: string; created_by: string | null };

/** Owner/moderator only — restoring can delete other members' objects,
 *  same boundary as the underlying restore_room_version RPC (see
 *  supabase/migrations/0007_restore_version_rpc.sql). */
export function RoomHistoryDialog({ roomId }: { roomId: string }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    void supabase
      .from("room_versions")
      .select("id, created_at, created_by")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setVersions(data ?? []));
  }, [open, roomId]);

  function handleRestore(versionId: string) {
    startTransition(async () => {
      const result = await restoreRoomVersionAction(roomId, versionId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Room restored.");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>History</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Room history</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved versions yet — the room autosaves a version a little while after each
              change.
            </p>
          ) : (
            versions.map((version) => (
              <div key={version.id} className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">{new Date(version.created_at).toLocaleString()}</span>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => handleRestore(version.id)}>
                  Restore
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
