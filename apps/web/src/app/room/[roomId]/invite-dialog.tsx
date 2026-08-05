"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { createInviteAction, revokeInviteAction, type CreateInviteState } from "./actions";

const initialState: CreateInviteState = {};

type InviteRow = {
  id: string;
  token: string;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  revoked_at: string | null;
};

function InviteList({ roomId }: { roomId: string }) {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("room_invites")
      .select("id, token, max_uses, use_count, expires_at, revoked_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setInvites((data ?? []) as InviteRow[]));
  }, [roomId]);

  const active = invites.filter((i) => !i.revoked_at);
  if (active.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">Active invite links</p>
      {active.map((invite) => (
        <div key={invite.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate text-muted-foreground">
            {invite.token.slice(0, 10)}… — {invite.use_count}
            {invite.max_uses ? `/${invite.max_uses}` : ""} used
            {invite.expires_at ? `, expires ${new Date(invite.expires_at).toLocaleDateString()}` : ""}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                revokeInviteAction(invite.id, roomId).then(() =>
                  setInvites((current) =>
                    current.map((i) => (i.id === invite.id ? { ...i, revoked_at: new Date().toISOString() } : i))
                  )
                )
              )
            }
          >
            Revoke
          </Button>
        </div>
      ))}
    </div>
  );
}

export function InviteDialog({ roomId }: { roomId: string }) {
  const [state, formAction, pending] = useActionState(createInviteAction, initialState);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Invite</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite friends</DialogTitle>
        </DialogHeader>

        {state.inviteUrl ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Share this link — anyone with it can join (or request to join, if approval is
              required).
            </p>
            <div className="flex gap-2">
              <Input readOnly value={state.inviteUrl} />
              <Button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(state.inviteUrl!);
                  toast.success("Copied");
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="roomId" value={roomId} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password (optional)</Label>
              <Input id="password" name="password" type="text" placeholder="Leave blank for none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxUses">Max uses (optional)</Label>
              <Input id="maxUses" name="maxUses" type="number" min={1} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expiresInHours">Expires in (hours, optional)</Label>
              <Input id="expiresInHours" name="expiresInHours" type="number" min={1} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="requiresApproval" />
              Require owner approval to join
            </label>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create invite link"}
              </Button>
            </DialogFooter>
          </form>
        )}

        <InviteList roomId={roomId} />
      </DialogContent>
    </Dialog>
  );
}
