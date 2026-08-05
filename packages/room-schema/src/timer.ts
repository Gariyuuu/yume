import { z } from "zod";

export const timerTypeSchema = z.enum(["countdown", "stopwatch", "pomodoro", "event_countdown"]);
export type TimerType = z.infer<typeof timerTypeSchema>;

export const timerModeSchema = z.enum(["shared", "personal"]);
export type TimerMode = z.infer<typeof timerModeSchema>;

export const timerStatusSchema = z.enum(["idle", "running", "paused", "finished"]);
export type TimerStatus = z.infer<typeof timerStatusSchema>;

export const timerSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  type: timerTypeSchema,
  mode: timerModeSchema,
  owner_id: z.string().uuid().nullable(),
  duration_seconds: z.number().nullable(),
  target_at: z.string().nullable(),
  status: timerStatusSchema,
  started_at: z.string().nullable(),
  alarm_sound: z.string().nullable(),
  created_at: z.string()
});
export type Timer = z.infer<typeof timerSchema>;
