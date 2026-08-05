"use client";

import { MessageCircle, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ChatInput } from "./chat-input";
import { MessageItem } from "./message-item";
import { type ChatMessage, useRoomChat } from "./use-room-chat";

function unreadStorageKey(roomId: string) {
  return `yume:chat:lastRead:${roomId}`;
}

export function ChatPanel({
  roomId,
  currentProfileId,
  canManageAll
}: {
  roomId: string;
  currentProfileId: string;
  canManageAll: boolean;
}) {
  const { messages, sendMessage, deleteMessage, toggleReaction, uploadImage } = useRoomChat(
    roomId,
    currentProfileId
  );
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [members, setMembers] = useState<{ id: string; display_name: string }[]>([]);
  const [lastRead, setLastRead] = useState<string>(
    () => localStorage.getItem(unreadStorageKey(roomId)) ?? ""
  );
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from("room_memberships")
      .select("profile_id, profiles(display_name)")
      .eq("room_id", roomId)
      .then(({ data }) => {
        if (cancelled) return;
        setMembers(
          (data ?? [])
            .filter((m) => m.profiles)
            .map((m) => ({ id: m.profile_id, display_name: m.profiles!.display_name }))
        );
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Pure DOM sync, no setState — exempt from the "no setState in effect
  // body" rule that the mark-as-read logic below deliberately avoids by
  // living in the toggle button's click handler instead.
  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [open, messages.length]);

  function handleToggleOpen() {
    setOpen((wasOpen) => {
      const willOpen = !wasOpen;
      if (willOpen) {
        const now = new Date().toISOString();
        localStorage.setItem(unreadStorageKey(roomId), now);
        setLastRead(now);
      }
      return willOpen;
    });
  }

  const unreadCount = useMemo(() => {
    if (!lastRead) return messages.length > 0 ? 1 : 0;
    return messages.filter((m) => m.created_at > lastRead && m.author_id !== currentProfileId).length;
  }, [messages, lastRead, currentProfileId]);

  const visibleMessages = search.trim()
    ? messages.filter((m) => m.body?.toLowerCase().includes(search.trim().toLowerCase()))
    : messages;

  const messageById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-bubble shadow-lg"
        onClick={handleToggleOpen}
      >
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && !open ? (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      <div
        className="fixed right-0 top-0 z-30 flex h-full w-full max-w-sm flex-col border-l bg-card shadow-xl transition-transform duration-200"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="flex items-center justify-between border-b p-3">
          <h2 className="font-semibold">Room chat</h2>
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-b p-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Search messages"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto py-2">
          {visibleMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              repliedTo={message.reply_to_id ? messageById.get(message.reply_to_id) : undefined}
              canDelete={canManageAll || message.author_id === currentProfileId}
              currentProfileId={currentProfileId}
              onDelete={() => void deleteMessage(message.id)}
              onReply={() => setReplyTo(message)}
              onToggleReaction={(emoji) => void toggleReaction(message.id, emoji)}
            />
          ))}
          {visibleMessages.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {search ? "No messages match." : "No messages yet — say hi!"}
            </p>
          ) : null}
        </div>

        <ChatInput
          members={members}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSend={(body, options) => {
            void sendMessage(body, options);
            setReplyTo(null);
          }}
          onUploadImage={uploadImage}
        />
      </div>
    </>
  );
}
