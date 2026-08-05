"use client";

import type { MessageReaction, RoomMessage } from "@yume/room-schema";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ChatMessage = RoomMessage & {
  author: { display_name: string; avatar_url: string | null } | null;
  message_reactions: MessageReaction[];
};

const PAGE_SIZE = 50;

export function useRoomChat(roomId: string, currentProfileId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("room_messages")
      .select("*, author:profiles(display_name, avatar_url), message_reactions(*)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    return ((data ?? []) as ChatMessage[]).reverse();
  }, [roomId, supabase]);

  useEffect(() => {
    let cancelled = false;

    void fetchMessages().then((data) => {
      if (cancelled) return;
      setMessages(data);
      setLoading(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchMessages is stable per roomId/supabase, already in its own deps
  }, [roomId, supabase]);

  async function sendMessage(body: string, options?: { replyToId?: string; imageUrl?: string; mentions?: string[] }) {
    if (!body.trim() && !options?.imageUrl) return;

    await supabase.from("room_messages").insert({
      room_id: roomId,
      author_id: currentProfileId,
      body: body.trim() || null,
      image_url: options?.imageUrl ?? null,
      reply_to_id: options?.replyToId ?? null,
      mentions: options?.mentions ?? []
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
      await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, profile_id: currentProfileId, emoji });
    }
  }

  async function uploadImage(file: File): Promise<string | null> {
    const path = `${roomId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("uploads").upload(path, file);
    if (uploadError) return null;

    // `uploads` is a private bucket gated by room-membership RLS (see
    // supabase/migrations/0011_storage_buckets.sql) — a long-lived signed
    // URL avoids needing to re-sign on every render while still not being
    // a bucket-wide public/listable URL like avatars or room-assets.
    const { data, error: signError } = await supabase.storage
      .from("uploads")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signError || !data) return null;
    return data.signedUrl;
  }

  return { messages, loading, sendMessage, deleteMessage, toggleReaction, uploadImage };
}
