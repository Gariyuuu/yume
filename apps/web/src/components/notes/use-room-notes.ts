"use client";

import type { ChecklistItem, NoteEditMode, NoteType, RoomNote } from "@yume/room-schema";
import { NOTE_COLORS } from "@yume/room-schema";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRoomNotes(roomId: string, currentProfileId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [notes, setNotes] = useState<Record<string, RoomNote>>({});

  useEffect(() => {
    let cancelled = false;

    void supabase
      .from("room_notes")
      .select("*")
      .eq("room_id", roomId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setNotes(Object.fromEntries((data as RoomNote[]).map((note) => [note.id, note])));
      });

    const channel = supabase
      .channel(`room:${roomId}:notes`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_notes", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setNotes((current) => {
            const next = { ...current };
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as { id?: string }).id;
              if (oldId) delete next[oldId];
              return next;
            }
            const row = payload.new as RoomNote;
            next[row.id] = row;
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  async function addNote(type: NoteType) {
    const content = type === "checklist" ? { items: [] as ChecklistItem[] } : { text: "" };
    const { data } = await supabase
      .from("room_notes")
      .insert({
        room_id: roomId,
        type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- content shape is a discriminated union at the app layer, jsonb at the DB layer
        content: content as any,
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
        owner_id: currentProfileId
      })
      .select("*")
      .single();

    if (data) setNotes((current) => ({ ...current, [data.id]: data as RoomNote }));
  }

  async function updateNote(id: string, patch: Partial<RoomNote>) {
    setNotes((current) => {
      const existing = current[id];
      return existing ? { ...current, [id]: { ...existing, ...patch } } : current;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same jsonb/discriminated-union gap as addNote
    await supabase.from("room_notes").update(patch as any).eq("id", id);
  }

  async function deleteNote(id: string) {
    setNotes((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    await supabase.from("room_notes").delete().eq("id", id);
  }

  function canEdit(note: RoomNote, canManageAll: boolean): boolean {
    if (canManageAll || note.owner_id === currentProfileId) return true;
    return note.edit_mode === "everyone" && !note.locked;
  }

  function toggleEditMode(note: RoomNote) {
    const next: NoteEditMode = note.edit_mode === "everyone" ? "owner" : "everyone";
    void updateNote(note.id, { edit_mode: next });
  }

  return { notes: Object.values(notes), addNote, updateNote, deleteNote, canEdit, toggleEditMode };
}
