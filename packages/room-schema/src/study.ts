import { z } from "zod";

export const studyStatusSchema = z.enum(["idle", "working", "break", "paused"]);
export type StudyStatus = z.infer<typeof studyStatusSchema>;

export const studySessionSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  work_minutes: z.number(),
  break_minutes: z.number(),
  status: studyStatusSchema,
  started_at: z.string().nullable(),
  ambient_audio_url: z.string().nullable(),
  do_not_disturb: z.boolean(),
  created_at: z.string()
});
export type StudySession = z.infer<typeof studySessionSchema>;

export const focusLogSchema = z.object({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  room_id: z.string().uuid().nullable(),
  minutes: z.number(),
  completed_at: z.string()
});
export type FocusLog = z.infer<typeof focusLogSchema>;
