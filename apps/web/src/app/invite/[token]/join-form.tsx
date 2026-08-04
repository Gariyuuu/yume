"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinRoomAction, type JoinRoomState } from "./actions";

const initialState: JoinRoomState = {};

export function JoinForm({
  token,
  requiresPassword,
  isSignedIn
}: {
  token: string;
  requiresPassword: boolean;
  isSignedIn: boolean;
}) {
  const boundAction = joinRoomAction.bind(null, token);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  if (state.pending) {
    return (
      <p className="text-sm text-muted-foreground">
        This room requires the owner&rsquo;s approval to join. There&rsquo;s no notification
        for the owner yet in this build, so nothing will happen automatically — check back
        once that&rsquo;s wired up.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {!isSignedIn ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guestName">Your name</Label>
          <Input id="guestName" name="guestName" required maxLength={60} placeholder="Guest" />
        </div>
      ) : null}
      {requiresPassword ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Room password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
      ) : null}
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Joining…" : "Join room"}
      </Button>
    </form>
  );
}
