"use server";

import { triviaEngine, type TriviaMove, type TriviaState } from "@yume/game-sdk";
import { applyGameMove, getGameState, rematchInternal, startGameInternal } from "./game-dispatch";
import { pickRandomQuestions, TRIVIA_QUESTIONS } from "./trivia-questions";

export async function startTriviaGameAction(sessionId: string) {
  return startGameInternal(sessionId, triviaEngine);
}

export async function rematchTriviaGameAction(sessionId: string) {
  return rematchInternal(sessionId, triviaEngine);
}

export async function startTriviaRoundAction(sessionId: string) {
  const state = await getGameState<TriviaState>(sessionId);
  const [question] = pickRandomQuestions(1, state?.usedQuestionIds ?? []);
  if (!question) return { error: "No more questions left." };

  const move: TriviaMove = {
    type: "start_round",
    question: { id: question.id, text: question.text, category: question.category, choices: question.choices }
  };
  return applyGameMove(sessionId, triviaEngine, move);
}

export async function answerTriviaAction(sessionId: string, choiceIndex: number) {
  const move: TriviaMove = { type: "answer", choiceIndex };
  return applyGameMove(sessionId, triviaEngine, move);
}

export async function revealTriviaAction(sessionId: string) {
  const state = await getGameState<TriviaState>(sessionId);
  if (!state?.question) return { error: "No active question." };

  const question = TRIVIA_QUESTIONS.find((q) => q.id === state.question!.id);
  if (!question) return { error: "Question not found." };

  const scoreDeltas: Record<string, number> = {};
  for (const [profileId, choiceIndex] of Object.entries(state.answers)) {
    if (choiceIndex === question.correctIndex) scoreDeltas[profileId] = 1;
  }

  const move: TriviaMove = { type: "reveal", correctIndex: question.correctIndex, scoreDeltas };
  return applyGameMove(sessionId, triviaEngine, move);
}
