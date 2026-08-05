"use server";

import { drawAndGuessEngine, type DrawAndGuessMove } from "@yume/game-sdk";
import { requireProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { checkGuess, pickRandomWord } from "./draw-and-guess-words";
import { applyGameMove, rematchInternal, startGameInternal } from "./game-dispatch";

export async function startDrawAndGuessGameAction(sessionId: string) {
  return startGameInternal(sessionId, drawAndGuessEngine);
}

export async function rematchDrawAndGuessGameAction(sessionId: string) {
  return rematchInternal(sessionId, drawAndGuessEngine);
}

export async function startDrawRoundAction(sessionId: string) {
  await requireProfile();
  const { word, category } = pickRandomWord();

  const move: DrawAndGuessMove = { type: "start_round", wordLength: word.length, category };
  const result = await applyGameMove(sessionId, drawAndGuessEngine, move);
  if (result.error) return result;

  // Written only after the engine accepted the move (so we don't stash a
  // secret for a round that never actually started, e.g. if it wasn't
  // really this player's turn).
  const service = createServiceRoleClient();
  await service.from("game_round_secrets").upsert({ session_id: sessionId, secret: { word } });

  return result;
}

export async function submitGuessAction(sessionId: string, guess: string) {
  const service = createServiceRoleClient();
  const { data: secretRow } = await service
    .from("game_round_secrets")
    .select("secret")
    .eq("session_id", sessionId)
    .maybeSingle();

  const word = (secretRow?.secret as { word?: string } | null)?.word;
  const isCorrect = Boolean(word && checkGuess(guess, word));

  const move: DrawAndGuessMove = { type: "guess", guess, isCorrect };
  return applyGameMove(sessionId, drawAndGuessEngine, move);
}

export async function revealDrawAction(sessionId: string) {
  const service = createServiceRoleClient();
  const { data: secretRow } = await service
    .from("game_round_secrets")
    .select("secret")
    .eq("session_id", sessionId)
    .maybeSingle();

  const word = (secretRow?.secret as { word?: string } | null)?.word;
  if (!word) return { error: "No active word." };

  const move: DrawAndGuessMove = { type: "reveal", word };
  const result = await applyGameMove(sessionId, drawAndGuessEngine, move);
  await service.from("game_round_secrets").delete().eq("session_id", sessionId);
  return result;
}
