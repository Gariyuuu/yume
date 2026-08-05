"use client";

import type { StudySession } from "@yume/room-schema";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** One shared study_sessions row per room (upserted on first use, same
 *  pattern as room_drawings — see supabase/migrations/0008_drawing_functions.sql). */
export function useStudySession(roomId: string, currentProfileId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<StudySession | null>(null);
  const loggedPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void supabase
      .from("study_sessions")
      .select("*")
      .eq("room_id", roomId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSession((data as StudySession | null) ?? null);
      });

    const channel = supabase
      .channel(`room:${roomId}:study`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_sessions", filter: `room_id=eq.${roomId}` },
        (payload) => setSession((payload.new as StudySession) ?? null)
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  async function ensureSession(): Promise<StudySession> {
    if (session) return session;
    const { data } = await supabase
      .from("study_sessions")
      .insert({ room_id: roomId })
      .select("*")
      .single();
    const created = data as StudySession;
    setSession(created);
    return created;
  }

  async function updateSession(
    patch: Partial<
      Pick<StudySession, "work_minutes" | "break_minutes" | "status" | "started_at" | "do_not_disturb">
    >
  ) {
    const current = await ensureSession();
    await supabase.from("study_sessions").update(patch).eq("id", current.id);
    setSession({ ...current, ...patch });
  }

  async function setDurations(workMinutes: number, breakMinutes: number) {
    await updateSession({ work_minutes: workMinutes, break_minutes: breakMinutes });
  }

  async function start() {
    const current = await ensureSession();
    await updateSession({
      status: current.status === "paused" && current.started_at ? current.status : "working",
      started_at: new Date().toISOString()
    });
  }

  async function pause() {
    await updateSession({ status: "paused" });
  }

  async function reset() {
    await updateSession({ status: "idle", started_at: null });
  }

  /** Called by whichever client's local countdown reaches zero first —
   *  see docs/phase-1/02-architecture.md's accepted-race-condition
   *  reasoning for low-stakes, low-frequency shared writes in small rooms. */
  async function advancePhase() {
    if (!session || !session.started_at) return;
    const phaseKey = `${session.id}:${session.started_at}`;
    if (loggedPhaseRef.current === phaseKey) return;
    loggedPhaseRef.current = phaseKey;

    if (session.status === "working") {
      await supabase.from("study_focus_logs").insert({
        profile_id: currentProfileId,
        room_id: roomId,
        minutes: session.work_minutes
      });
      await updateSession({ status: "break", started_at: new Date().toISOString() });
    } else if (session.status === "break") {
      await updateSession({ status: "working", started_at: new Date().toISOString() });
    }
  }

  async function toggleDoNotDisturb() {
    const current = await ensureSession();
    await updateSession({ do_not_disturb: !current.do_not_disturb });
  }

  return { session, setDurations, start, pause, reset, advancePhase, toggleDoNotDisturb };
}
