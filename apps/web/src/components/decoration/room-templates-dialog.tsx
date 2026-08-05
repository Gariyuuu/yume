"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { applyTemplateAction, saveRoomAsTemplateAction } from "@/app/room/[roomId]/decoration-actions";
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

type Template = { id: string; name: string; description: string | null };

export function RoomTemplatesDialog({ roomId, templates }: { roomId: string; templates: Template[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function handleApply(templateId: string) {
    startTransition(async () => {
      const result = await applyTemplateAction(roomId, templateId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Template applied.");
        setOpen(false);
      }
    });
  }

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await saveRoomAsTemplateAction(roomId, name.trim());
      if (result.error) toast.error(result.error);
      else {
        toast.success("Saved as a template.");
        setName("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Templates</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Room templates</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {templates.map((template) => (
            <div key={template.id} className="flex items-center justify-between rounded-md border p-2">
              <div>
                <p className="text-sm font-medium">{template.name}</p>
                {template.description ? (
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                ) : null}
              </div>
              <Button size="sm" disabled={pending} onClick={() => handleApply(template.id)}>
                Apply
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col">
          <Label htmlFor="templateName">Save this room as a new template</Label>
          <div className="flex gap-2">
            <Input
              id="templateName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My custom template"
            />
            <Button disabled={pending || !name.trim()} onClick={handleSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
