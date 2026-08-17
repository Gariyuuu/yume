"use client";

import { Flag, Reply, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/moderation/report-dialog";
import { cn } from "@/lib/utils";
import { MessageText } from "./message-text";
import type { ChatMessage } from "./use-room-chat";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉"];

export function MessageItem({
  message,
  repliedTo,
  canDelete,
  currentProfileId,
  roomId,
  onDelete,
  onReply,
  onToggleReaction
}: {
  message: ChatMessage;
  repliedTo: ChatMessage | undefined;
  canDelete: boolean;
  currentProfileId: string;
  roomId: string;
  onDelete: () => void;
  onReply: () => void;
  onToggleReaction: (emoji: string) => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);
  const burstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionCounts = message.message_reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});
  const myReactions = new Set(
    message.message_reactions.filter((r) => r.profile_id === currentProfileId).map((r) => r.emoji)
  );

  // Kinetics-inspired "Like Burst" pop (independently implemented — kinetics.
  // colorion.co ships license: null, technique only, no source copied).
  function handleReact(emoji: string) {
    const wasActive = myReactions.has(emoji);
    onToggleReaction(emoji);
    if (!wasActive) {
      if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
      setBurstEmoji(emoji);
      burstTimeoutRef.current = setTimeout(() => setBurstEmoji(null), 350);
    }
  }

  if (message.deleted_at) {
    return <p className="px-3 py-1 text-xs italic text-muted-foreground">Message deleted</p>;
  }

  return (
    <div className="group flex flex-col gap-1 px-3 py-1.5 hover:bg-muted/50">
      {repliedTo ? (
        <div className="ml-8 truncate rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          ↪ {repliedTo.author?.display_name ?? "Someone"}:{" "}
          {repliedTo.body ?? (repliedTo.image_url ? "photo" : "")}
        </div>
      ) : null}

      <div className="flex items-start gap-2">
        {message.author?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar URLs are arbitrary user-supplied storage/profile URLs
          <img
            src={message.author.avatar_url}
            alt=""
            className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-bubble bg-muted object-cover"
          />
        ) : (
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-bubble bg-brand-200 text-[10px] font-semibold text-brand-800">
            {(message.author?.display_name ?? "?").slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">{message.author?.display_name ?? "Someone"}</span>
            <span className="text-[11px] text-muted-foreground">
              {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          {message.body ? (
            <p className="text-sm">
              <MessageText text={message.body} />
            </p>
          ) : null}

          {message.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- chat images are user uploads served from Supabase Storage
            <img
              src={message.image_url}
              alt="Shared in chat"
              className="mt-1 max-h-48 rounded-md border object-cover"
            />
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-1">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReact(emoji)}
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-xs",
                  myReactions.has(emoji) ? "border-brand-500 bg-brand-50" : "border-transparent bg-muted",
                  burstEmoji === emoji && "reaction-burst"
                )}
              >
                {emoji} {count}
              </button>
            ))}

            <div className="hidden gap-0.5 group-hover:flex">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="rounded px-1 text-xs hover:bg-muted"
                  onClick={() => handleReact(emoji)}
                >
                  {emoji}
                </button>
              ))}
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onReply} aria-label="Reply to message">
                <Reply className="h-3 w-3" />
              </Button>
              {message.author_id !== currentProfileId ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={() => setReportOpen(true)}
                  aria-label="Report message"
                >
                  <Flag className="h-3 w-3" />
                </Button>
              ) : null}
              {canDelete ? (
                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onDelete} aria-label="Delete message">
                  <Trash2 className="h-3 w-3" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        roomId={roomId}
        targetProfileId={message.author_id}
        messageId={message.id}
        targetLabel="message"
      />
    </div>
  );
}
