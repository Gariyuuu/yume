"use client";

import { useState, useTransition } from "react";
import { unblockUserAction } from "@/app/room/[roomId]/moderation-actions";
import { Button } from "@/components/ui/button";

export function BlockedUsersList({
  initialBlocked
}: {
  initialBlocked: { id: string; display_name: string }[];
}) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [pending, startTransition] = useTransition();

  if (blocked.length === 0) {
    return <p className="text-sm text-muted-foreground">You haven&apos;t blocked anyone.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {blocked.map((user) => (
        <li key={user.id} className="flex items-center justify-between text-sm">
          <span>{user.display_name}</span>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                unblockUserAction(user.id).then(() =>
                  setBlocked((current) => current.filter((u) => u.id !== user.id))
                )
              )
            }
          >
            Unblock
          </Button>
        </li>
      ))}
    </ul>
  );
}
