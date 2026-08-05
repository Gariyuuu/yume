"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { reportAction } from "@/app/room/[roomId]/moderation-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const REASONS = ["Harassment", "Spam", "Inappropriate content", "Impersonation", "Other"];

export function ReportDialog({
  open,
  onOpenChange,
  roomId,
  targetProfileId,
  messageId,
  targetLabel
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  targetProfileId?: string | null;
  messageId?: string | null;
  targetLabel: string;
}) {
  const [reason, setReason] = useState(REASONS[0]!);
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetLabel}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            Reason
            <select
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Details (optional)
            <textarea
              className="min-h-20 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
            />
          </label>
        </div>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                reportAction(roomId, targetProfileId ?? null, messageId ?? null, reason, details).then((result) => {
                  if (result.error) toast.error(result.error);
                  else {
                    toast.success("Report submitted.");
                    onOpenChange(false);
                  }
                })
              )
            }
          >
            {pending ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
