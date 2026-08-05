"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = { id: string; text: string; done: boolean };

function storageKey(roomId: string, profileId: string) {
  return `yume:study:personal-checklist:${roomId}:${profileId}`;
}

/**
 * Deliberately never synced to Postgres — "personal" here means visible
 * only in this browser, not just "owned by me but readable by the room"
 * (which is what room_notes' owner-only edit mode gives you). Kept
 * simplest as localStorage rather than inventing a private-row RLS story
 * for a single-device checklist.
 */
export function PersonalChecklist({ roomId, profileId }: { roomId: string; profileId: string }) {
  const [items, setItems] = useState<Item[]>(() => {
    const raw = localStorage.getItem(storageKey(roomId, profileId));
    return raw ? (JSON.parse(raw) as Item[]) : [];
  });
  const [text, setText] = useState("");

  function persist(next: Item[]) {
    setItems(next);
    localStorage.setItem(storageKey(roomId, profileId), JSON.stringify(next));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">Your private checklist</p>
      {items.map((item) => (
        <label key={item.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={item.done}
            onChange={() =>
              persist(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
            }
          />
          <span className={item.done ? "flex-1 line-through opacity-60" : "flex-1"}>{item.text}</span>
          <button type="button" onClick={() => persist(items.filter((i) => i.id !== item.id))}>
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </label>
      ))}
      <div className="flex gap-1">
        <Input
          className="h-7 text-xs"
          placeholder="Add a task…"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && text.trim()) {
              persist([...items, { id: crypto.randomUUID(), text: text.trim(), done: false }]);
              setText("");
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => {
            if (!text.trim()) return;
            persist([...items, { id: crypto.randomUUID(), text: text.trim(), done: false }]);
            setText("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
