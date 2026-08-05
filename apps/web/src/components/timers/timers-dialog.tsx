"use client";

import type { TimerMode, TimerType } from "@yume/room-schema";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimerCard } from "./timer-card";
import { useRoomTimers } from "./use-room-timers";

export function TimersDialog({
  roomId,
  currentProfileId,
  canManageAll
}: {
  roomId: string;
  currentProfileId: string;
  canManageAll: boolean;
}) {
  const { timers, createTimer, start, pause, reset, remove, markFinished } = useRoomTimers(
    roomId,
    currentProfileId
  );
  const [type, setType] = useState<TimerType>("countdown");
  const [mode, setMode] = useState<TimerMode>("shared");
  const [minutes, setMinutes] = useState(5);
  const [eventAt, setEventAt] = useState("");

  function handleCreate() {
    if (type === "event_countdown") {
      if (!eventAt) return;
      void createTimer({ type, mode, targetAt: new Date(eventAt).toISOString() });
    } else {
      void createTimer({
        type,
        mode,
        durationSeconds: type === "stopwatch" ? undefined : minutes * 60
      });
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Timers</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Timers</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex gap-2">
            <select
              className="h-9 flex-1 rounded-md border bg-transparent px-2 text-sm"
              value={type}
              onChange={(event) => setType(event.target.value as TimerType)}
            >
              <option value="countdown">Countdown</option>
              <option value="stopwatch">Stopwatch</option>
              <option value="pomodoro">Pomodoro</option>
              <option value="event_countdown">Event countdown</option>
            </select>
            <select
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
              value={mode}
              onChange={(event) => setMode(event.target.value as TimerMode)}
            >
              <option value="shared">Shared</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          {type === "event_countdown" ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor="eventAt">When</Label>
              <Input
                id="eventAt"
                type="datetime-local"
                value={eventAt}
                onChange={(event) => setEventAt(event.target.value)}
              />
            </div>
          ) : type !== "stopwatch" ? (
            <div className="flex items-center gap-2">
              <Label htmlFor="minutes" className="whitespace-nowrap">
                Minutes
              </Label>
              <Input
                id="minutes"
                type="number"
                min={1}
                max={180}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                className="w-20"
              />
            </div>
          ) : null}

          <Button size="sm" onClick={handleCreate} className="self-start">
            Add timer
          </Button>
        </div>

        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {timers.map((timer) => {
            const canControl =
              canManageAll || timer.mode === "shared" || timer.owner_id === currentProfileId;
            return (
              <TimerCard
                key={timer.id}
                timer={timer}
                canControl={canControl}
                onStart={() => void start(timer.id)}
                onPause={() => void pause(timer.id)}
                onReset={() => void reset(timer.id)}
                onDelete={() => void remove(timer.id)}
                onFinished={() => void markFinished(timer.id)}
              />
            );
          })}
          {timers.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No timers yet.</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
