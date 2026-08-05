import type { MessageReaction, RoomMessage } from "@yume/room-schema";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type ChatMessage = RoomMessage & {
  author: { display_name: string; avatar_url: string | null } | null;
  message_reactions: MessageReaction[];
};

const PAGE_SIZE = 50;

/** Mirrors apps/web/src/components/chat/use-room-chat.ts, scoped down:
 *  no mentions/image-upload/search on mobile yet — see RoomDetailScreen's
 *  header comment for what's web-only this phase. */
export function useRoomChat(roomId: string, currentProfileId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchMessages() {
      const { data } = await supabase
        .from("room_messages")
        .select("*, author:profiles(display_name, avatar_url), message_reactions(*)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      return ((data ?? []) as ChatMessage[]).reverse();
    }

    void fetchMessages().then((data) => {
      if (!cancelled) setMessages(data);
    });

    const channel = supabase
      .channel(`room:${roomId}:chat`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
        () => void fetchMessages().then((data) => !cancelled && setMessages(data))
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () =>
        void fetchMessages().then((data) => !cancelled && setMessages(data))
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  async function sendMessage(body: string) {
    if (!body.trim()) return;
    await supabase.from("room_messages").insert({
      room_id: roomId,
      author_id: currentProfileId,
      body: body.trim()
    });
  }

  async function deleteMessage(id: string) {
    await supabase
      .from("room_messages")
      .update({ deleted_at: new Date().toISOString(), deleted_by: currentProfileId })
      .eq("id", id);
  }

  async function toggleReaction(messageId: string, emoji: string) {
    const message = messages.find((m) => m.id === messageId);
    const existing = message?.message_reactions.find(
      (r) => r.profile_id === currentProfileId && r.emoji === emoji
    );
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, profile_id: currentProfileId, emoji });
    }
  }

  return { messages, sendMessage, deleteMessage, toggleReaction };
}
