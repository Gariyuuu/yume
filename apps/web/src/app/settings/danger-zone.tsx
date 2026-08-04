"use client";

import { useState, useTransition } from "react";
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
import { deleteAccountAction, signOutOtherSessionsAction } from "./actions";

export function DangerZone() {
  const [signingOut, startSignOut] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          Sign out everywhere else you&rsquo;re logged in, keeping this device signed in.
        </p>
        <Button
          variant="outline"
          disabled={signingOut}
          onClick={() =>
            startSignOut(async () => {
              const result = await signOutOtherSessionsAction();
              if (result.error) toast.error(result.error);
              else toast.success(result.message);
            })
          }
        >
          {signingOut ? "Signing out…" : "Sign out of other sessions"}
        </Button>
      </div>

      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          Permanently delete your account and everything tied to it. This can&rsquo;t be undone.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="destructive" />}>
            Delete account
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This permanently deletes your profile and removes you from every room. Rooms
              you own and shared content you&rsquo;ve placed may be affected — this cannot be
              undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={() =>
                  startDelete(async () => {
                    const result = await deleteAccountAction();
                    if (result?.error) toast.error(result.error);
                  })
                }
              >
                {deleting ? "Deleting…" : "Yes, delete my account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
