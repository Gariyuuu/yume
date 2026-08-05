"use client";

import type { Timer } from "@yume/room-schema";
import { Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { playBeep } from "@/lib/audio/beep";

function formatSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function TimerCard({
  timer,
  canControl,
  onStart,
  onPause,
  onReset,
  onDelete,
  onFinished
}: {
  timer: Timer;
  canControl: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onDelete: () => void;
  onFinished: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    if (timer.status !== "running") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer.status]);

  const startedAtMs = timer.started_at ? new Date(timer.started_at).getTime() : null;
  const elapsedSeconds = startedAtMs && timer.status === "running" ? (now - startedAtMs) / 1000 : 0;

  const isCountdownType = timer.type === "countdown" || timer.type === "pomodoro";
  const duration = timer.duration_seconds ?? 0;
  const remaining = isCountdownType ? duration - elapsedSeconds : null;
  const progress = isCountdownType && duration > 0 ? Math.max(0, Math.min(1, (remaining ?? 0) / duration)) : null;
  const justFinished = isCountdownType && timer.status === "running" && (remaining ?? 1) <= 0;

  useEffect(() => {
    if (timer.status !== "running") {
      firedRef.current = false;
    }
  }, [timer.status]);

  useEffect(() => {
    if (!justFinished || firedRef.current) return;
    firedRef.current = true;
    playBeep("alarm");
    onFinished();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onFinished is a stable per-render callback from the parent's map(); re-running on identity change would double-fire
  }, [justFinished]);

  let display: string;
  if (timer.type === "stopwatch") {
    display = formatSeconds(elapsedSeconds);
  } else if (timer.type === "event_countdown" && timer.target_at) {
    const eventRemaining = (new Date(timer.target_at).getTime() - now) / 1000;
    display = eventRemaining <= 0 ? "Now!" : formatSeconds(eventRemaining);
  } else {
    display = formatSeconds(remaining ?? 0);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div>
        <p className="text-xs capitalize text-muted-foreground">
          {timer.type.replace("_", " ")} · {timer.mode}
        </p>
        <p className="font-mono text-xl tabular-nums">{display}</p>
        {progress !== null ? (
          <div className="mt-1 h-1 w-32 rounded-full bg-muted">
            <div
              className="h-1 rounded-full bg-brand-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        ) : null}
      </div>

      {canControl ? (
        <div className="flex items-center gap-1">
          {timer.status === "running" ? (
            <Button size="icon" variant="outline" onClick={onPause}>
              <Pause className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="outline" onClick={onStart} disabled={timer.type === "event_countdown"}>
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button size="icon" variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
