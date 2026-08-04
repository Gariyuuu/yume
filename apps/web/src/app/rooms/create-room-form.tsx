"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoomAction, type CreateRoomState } from "./actions";

type Template = { id: string; name: string };

const initialState: CreateRoomState = {};

export function CreateRoomForm({ templates }: { templates: Template[] }) {
  const [state, formAction, pending] = useActionState(createRoomAction, initialState);

  return (
    <Dialog>
      <DialogTrigger render={<Button />}>New room</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a room</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Room name</Label>
            <Input id="name" name="name" required maxLength={80} placeholder="Friday hangout" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="templateId">Template</Label>
            <select
              id="templateId"
              name="templateId"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
              defaultValue=""
            >
              <option value="">Blank canvas</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
