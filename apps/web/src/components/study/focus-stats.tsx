"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Log = { minutes: number; completed_at: string };

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function computeStreak(logs: Log[]): number {
  const days = new Set(logs.map((l) => dateKey(l.completed_at)));
  let streak = 0;
  const cursor = new Date();

  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function FocusStats({ profileId, refreshKey }: { profileId: string; refreshKey: unknown }) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const since = new Date();
    since.setDate(since.getDate() - 60);

    void supabase
      .from("study_focus_logs")
      .select("minutes, completed_at")
      .eq("profile_id", profileId)
      .gte("completed_at", since.toISOString())
      .then(({ data }) => {
        if (!cancelled) setLogs((data ?? []) as Log[]);
      });

    return () => {
      cancelled = true;
    };
  }, [profileId, refreshKey]);

  const today = new Date().toISOString().slice(0, 10);
  const todayMinutes = logs.filter((l) => dateKey(l.completed_at) === today).reduce((sum, l) => sum + l.minutes, 0);
  const streak = computeStreak(logs);

  return (
    <div className="flex gap-4 text-sm">
      <div>
        <p className="text-xs text-muted-foreground">Today</p>
        <p className="font-semibold">{todayMinutes} min</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Streak</p>
        <p className="font-semibold">{streak} day{streak === 1 ? "" : "s"}</p>
      </div>
    </div>
  );
}
