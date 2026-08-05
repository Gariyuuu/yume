"use client";

import { ImagePlus, Send, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "./use-room-chat";

type Member = { id: string; display_name: string };

export function ChatInput({
  members,
  replyTo,
  onCancelReply,
  onSend,
  onUploadImage
}: {
  members: Member[];
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSend: (body: string, options: { replyToId?: string; imageUrl?: string; mentions: string[] }) => void;
  onUploadImage: (file: File) => Promise<string | null>;
}) {
  const [text, setText] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    return members
      .filter((m) => m.display_name.toLowerCase().startsWith(mentionQuery.toLowerCase()))
      .slice(0, 5);
  }, [members, mentionQuery]);

  function handleChange(value: string) {
    setText(value);
    const atIndex = value.lastIndexOf("@");
    if (atIndex === -1 || /\s/.test(value.slice(atIndex + 1))) {
      setMentionQuery(null);
    } else {
      setMentionQuery(value.slice(atIndex + 1));
    }
  }

  function insertMention(member: Member) {
    const atIndex = text.lastIndexOf("@");
    setText(`${text.slice(0, atIndex)}@${member.display_name} `);
    setMentionQuery(null);
  }

  function computeMentions(body: string): string[] {
    return members.filter((m) => body.includes(`@${m.display_name}`)).map((m) => m.id);
  }

  async function handleSubmit() {
    const body = text.trim();
    if (!body) return;
    onSend(body, { replyToId: replyTo?.id, mentions: computeMentions(body) });
    setText("");
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    const imageUrl = await onUploadImage(file);
    setUploading(false);
    if (imageUrl) onSend("", { replyToId: replyTo?.id, imageUrl, mentions: [] });
  }

  return (
    <div className="border-t p-2">
      {replyTo ? (
        <div className="mb-1 flex items-center justify-between rounded bg-muted px-2 py-1 text-xs">
          <span className="truncate">
            Replying to {replyTo.author?.display_name ?? "someone"}
          </span>
          <button type="button" onClick={onCancelReply}>
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      {mentionMatches.length > 0 ? (
        <div className="mb-1 flex flex-col rounded-md border bg-popover shadow-sm">
          {mentionMatches.map((member) => (
            <button
              key={member.id}
              type="button"
              className="px-2 py-1 text-left text-sm hover:bg-muted"
              onClick={() => insertMention(member)}
            >
              @{member.display_name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,image/gif"
          className="hidden"
          onChange={(event) => void handleFileSelected(event)}
        />
        <Button
          size="icon"
          variant="ghost"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach image"
        >
          <ImagePlus className="h-4 w-4" />
        </Button>
        <textarea
          className="max-h-24 min-h-9 flex-1 resize-none rounded-md border bg-background px-2 py-1.5 text-sm outline-none"
          placeholder="Message the room…"
          value={text}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
        />
        <Button size="icon" onClick={() => void handleSubmit()} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
