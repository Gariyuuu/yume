"use client";

import { useEffect, useRef } from "react";
import { createRoomVersionAction } from "@/app/room/[roomId]/version-actions";

const QUIET_PERIOD_MS = 30_000;

/** Fires createRoomVersionAction after `QUIET_PERIOD_MS` of no further
 *  object changes — see docs/phase-1/02-architecture.md §5 ("debounced on
 *  a meaningful pause" rather than saving a version on every edit). Keyed
 *  off `changeSignal` so it doesn't care who made the change. */
export function useAutosave(roomId: string, changeSignal: unknown) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void createRoomVersionAction(roomId);
    }, QUIET_PERIOD_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [roomId, changeSignal]);
}
