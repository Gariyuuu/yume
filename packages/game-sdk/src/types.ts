import { z } from "zod";

export const gameTypeSchema = z.enum(["draw_and_guess", "trivia", "tic_tac_toe", "connect_four"]);
export type GameType = z.infer<typeof gameTypeSchema>;

export const gameSessionStatusSchema = z.enum(["waiting", "in_progress", "finished"]);
export type GameSessionStatus = z.infer<typeof gameSessionStatusSchema>;

export const gameSessionSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  game_type: gameTypeSchema,
  status: gameSessionStatusSchema,
  state: z.record(z.unknown()),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});
export type GameSession = z.infer<typeof gameSessionSchema>;

export const gamePlayerSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  is_spectator: z.boolean(),
  is_ready: z.boolean(),
  score: z.number(),
  connected: z.boolean(),
  joined_at: z.string()
});
export type GamePlayer = z.infer<typeof gamePlayerSchema>;

export const gameEventSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  profile_id: z.string().uuid().nullable(),
  event_type: z.string(),
  payload: z.record(z.unknown()),
  created_at: z.string()
});
export type GameEvent = z.infer<typeof gameEventSchema>;
