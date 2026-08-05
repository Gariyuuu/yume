"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { NoteCard } from "./note-card";
import { useRoomNotes } from "./use-room-notes";

export function NotesDialog({
  roomId,
  currentProfileId,
  canManageAll
}: {
  roomId: string;
  currentProfileId: string;
  canManageAll: boolean;
}) {
  const { notes, addNote, updateNote, deleteNote, canEdit, toggleEditMode } = useRoomNotes(
    roomId,
    currentProfileId
  );

  const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Notes</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Shared notes</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void addNote("sticky")}>
            + Sticky
          </Button>
          <Button size="sm" variant="outline" onClick={() => void addNote("checklist")}>
            + Checklist
          </Button>
          <Button size="sm" variant="outline" onClick={() => void addNote("text")}>
            + Text
          </Button>
        </div>

        <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto">
          {sorted.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              canEdit={canEdit(note, canManageAll)}
              isOwnerOrMod={canManageAll || note.owner_id === currentProfileId}
              onUpdate={(patch) => void updateNote(note.id, patch)}
              onDelete={() => void deleteNote(note.id)}
              onToggleEditMode={() => toggleEditMode(note)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
