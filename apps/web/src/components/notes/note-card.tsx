"use client";

import type { ChecklistItem, RoomNote } from "@yume/room-schema";
import { Lock, Pin, Trash2, Unlock, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function NoteCard({
  note,
  canEdit,
  isOwnerOrMod,
  onUpdate,
  onDelete,
  onToggleEditMode
}: {
  note: RoomNote;
  canEdit: boolean;
  isOwnerOrMod: boolean;
  onUpdate: (patch: Partial<RoomNote>) => void;
  onDelete: () => void;
  onToggleEditMode: () => void;
}) {
  const [text, setText] = useState(
    typeof note.content?.["text"] === "string" ? (note.content["text"] as string) : ""
  );
  const items = Array.isArray(note.content?.["items"])
    ? (note.content["items"] as ChecklistItem[])
    : [];
  const [newItemText, setNewItemText] = useState("");

  function updateItems(nextItems: ChecklistItem[]) {
    onUpdate({ content: { items: nextItems } });
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-md p-3 shadow-sm"
      style={{ backgroundColor: note.color ?? "#fde68a" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => canEdit && onUpdate({ pinned: !note.pinned })}
            title="Pin"
          >
            <Pin className={note.pinned ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"} />
          </button>
          {isOwnerOrMod ? (
            <button type="button" onClick={onToggleEditMode} title="Who can edit">
              {note.edit_mode === "everyone" ? (
                <Users className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
          {isOwnerOrMod ? (
            <button type="button" onClick={() => onUpdate({ locked: !note.locked })} title="Lock">
              {note.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </button>
          ) : null}
        </div>
        {isOwnerOrMod ? (
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {note.type === "checklist" ? (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.done}
                disabled={!canEdit}
                onChange={() =>
                  updateItems(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
                }
              />
              <span className={item.done ? "line-through opacity-60" : ""}>{item.text}</span>
            </label>
          ))}
          {canEdit ? (
            <input
              className="mt-1 rounded border bg-white/70 px-2 py-1 text-xs"
              placeholder="Add item…"
              value={newItemText}
              onChange={(event) => setNewItemText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && newItemText.trim()) {
                  updateItems([
                    ...items,
                    { id: crypto.randomUUID(), text: newItemText.trim(), done: false }
                  ]);
                  setNewItemText("");
                }
              }}
            />
          ) : null}
        </div>
      ) : (
        <textarea
          className="min-h-20 resize-none rounded bg-transparent text-sm outline-none disabled:opacity-80"
          value={text}
          disabled={!canEdit}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => onUpdate({ content: { text } })}
        />
      )}
    </div>
  );
}
