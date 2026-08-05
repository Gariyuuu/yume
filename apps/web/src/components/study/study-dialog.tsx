"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { playBeep } from "@/lib/audio/beep";
import { AmbientNoise } from "./ambient-noise";
import { FocusStats } from "./focus-stats";
import { PersonalChecklist } from "./personal-checklist";
import { useStudySession } from "./use-study-session";

function formatMinutesSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

export function StudyDialog({
  roomId,
  currentProfileId,
  isStudying,
  doNotDisturb,
  onStudyingChange,
  onDoNotDisturbChange
}: {
  roomId: string;
  currentProfileId: string;
  isStudying: boolean;
  doNotDisturb: boolean;
  onStudyingChange: (studying: boolean) => void;
  onDoNotDisturbChange: (dnd: boolean) => void;
}) {
  const { session, setDurations, start, pause, reset, advancePhase, toggleDoNotDisturb } =
    useStudySession(roomId, currentProfileId);
  const [now, setNow] = useState(() => Date.now());
  const [remindersOn, setRemindersOn] = useState(false);
  const [logsVersion, setLogsVersion] = useState(0);

  const status = session?.status ?? "idle";
  const isRunning = status === "working" || status === "break";

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const startedAtMs = session?.started_at ? new Date(session.started_at).getTime() : null;
  const phaseMinutes = status === "break" ? (session?.break_minutes ?? 5) : (session?.work_minutes ?? 25);
  const elapsed = startedAtMs && isRunning ? (now - startedAtMs) / 1000 : 0;
  const remaining = phaseMinutes * 60 - elapsed;
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isRunning || !session?.started_at) return;
    const phaseKey = `${session.status}:${session.started_at}`;
    if (remaining > 0 || firedRef.current === phaseKey) return;
    firedRef.current = phaseKey;
    playBeep("chime");
    if (remindersOn && "Notification" in window && Notification.permission === "granted") {
      new Notification(status === "working" ? "Break time!" : "Back to work!");
    }
    void advancePhase();
    setLogsVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advancePhase/session identity churn every tick; gated by firedRef+phaseKey instead
  }, [remaining, isRunning, status, session?.started_at, remindersOn]);

  function handleRemindersToggle() {
    if (!remindersOn && "Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    setRemindersOn((v) => !v);
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Study</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Study mode</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2 rounded-md border p-4">
          <span className="text-xs uppercase text-muted-foreground">
            {status === "idle" ? "Ready" : status === "working" ? "Focus" : status === "break" ? "Break" : "Paused"}
          </span>
          <span className="font-mono text-4xl tabular-nums">
            {formatMinutesSeconds(status === "idle" ? phaseMinutes * 60 : remaining)}
          </span>
          <div className="flex gap-2">
            {isRunning ? (
              <Button size="icon" variant="outline" onClick={() => void pause()}>
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="icon" onClick={() => void start()}>
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon" variant="outline" onClick={() => void reset()}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {status === "idle" ? (
            <div className="flex items-center gap-2 text-xs">
              <Label htmlFor="workMin">Work</Label>
              <Input
                id="workMin"
                type="number"
                className="h-7 w-14"
                min={1}
                max={90}
                defaultValue={session?.work_minutes ?? 25}
                onBlur={(event) =>
                  void setDurations(Number(event.target.value), session?.break_minutes ?? 5)
                }
              />
              <Label htmlFor="breakMin">Break</Label>
              <Input
                id="breakMin"
                type="number"
                className="h-7 w-14"
                min={1}
                max={30}
                defaultValue={session?.break_minutes ?? 5}
                onBlur={(event) =>
                  void setDurations(session?.work_minutes ?? 25, Number(event.target.value))
                }
              />
            </div>
          ) : null}

          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={remindersOn} onChange={handleRemindersToggle} />
            Notify me when a phase ends
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={isStudying ? "default" : "outline"}
            onClick={() => onStudyingChange(!isStudying)}
          >
            {isStudying ? "Focusing" : "I'm focusing"}
          </Button>
          <Button
            size="sm"
            variant={doNotDisturb ? "default" : "outline"}
            onClick={() => onDoNotDisturbChange(!doNotDisturb)}
          >
            Do not disturb
          </Button>
          <Button
            size="sm"
            variant={session?.do_not_disturb ? "default" : "outline"}
            onClick={() => void toggleDoNotDisturb()}
          >
            Room quiet mode
          </Button>
        </div>

        <AmbientNoise />
        <PersonalChecklist roomId={roomId} profileId={currentProfileId} />
        <FocusStats profileId={currentProfileId} refreshKey={logsVersion} />
      </DialogContent>
    </Dialog>
  );
}
