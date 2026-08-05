import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { createTicTacToeGame, joinGame, leaveGame, readyUp, rematchTicTacToeGame, startTicTacToeGame } from "../lib/game-actions";
import { supabase } from "../lib/supabase";
import { useGameSession } from "../lib/use-game-session";
import { useRoomGames } from "../lib/use-room-games";
import { TicTacToeBoard } from "./TicTacToeBoard";

/**
 * Phase 6 mobile scope: Tic-Tac-Toe only. Trivia and Draw & Guess stay
 * web-only for now — both need content (a question bank / word list)
 * that would have to be duplicated into the game-actions edge function
 * to validate moves without a Next.js server, and Draw & Guess also
 * needs a canvas layer mobile doesn't have. This is a real, playable
 * game end-to-end (server-validated moves via
 * supabase/functions/game-actions), just a thinner slice than web's
 * three games — same pattern as every other mobile scope cut this
 * session (see RoomDetailScreen.tsx's header comment).
 */
export function GamesModal({
  visible,
  onClose,
  roomId,
  currentProfileId
}: {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  currentProfileId: string;
}) {
  const sessions = useRoomGames(roomId);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});

  useEffect(() => {
    void supabase
      .from("room_memberships")
      .select("profile_id, profiles(display_name)")
      .eq("room_id", roomId)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const row of data ?? []) {
          if (row.profiles) map[row.profile_id] = row.profiles.display_name;
        }
        setDisplayNames(map);
      });
  }, [roomId]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Games</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        {activeSessionId ? (
          <GameSessionPanel
            sessionId={activeSessionId}
            currentProfileId={currentProfileId}
            displayNames={displayNames}
            onLeave={() => setActiveSessionId(null)}
          />
        ) : (
          <View style={styles.body}>
            <Pressable
              style={styles.createButton}
              onPress={() =>
                void createTicTacToeGame(roomId, currentProfileId).then((result) => {
                  if (result.sessionId) setActiveSessionId(result.sessionId);
                })
              }
            >
              <Text style={styles.createButtonText}>New Tic-Tac-Toe game</Text>
            </Pressable>

            {sessions.map((session) => (
              <Pressable key={session.id} style={styles.sessionRow} onPress={() => setActiveSessionId(session.id)}>
                <Text style={styles.sessionText}>
                  {session.game_type === "tic_tac_toe" ? "Tic-Tac-Toe" : session.game_type} — {session.status}
                </Text>
              </Pressable>
            ))}
            {sessions.length === 0 ? <Text style={styles.empty}>No games in progress.</Text> : null}
          </View>
        )}
      </View>
    </Modal>
  );
}

function GameSessionPanel({
  sessionId,
  currentProfileId,
  displayNames,
  onLeave
}: {
  sessionId: string;
  currentProfileId: string;
  displayNames: Record<string, string>;
  onLeave: () => void;
}) {
  const { session, players } = useGameSession(sessionId);
  const you = players.find((p) => p.profile_id === currentProfileId);

  if (!session) return null;

  if (session.game_type !== "tic_tac_toe") {
    return (
      <View style={styles.body}>
        <Text style={styles.empty}>This game only plays on web for now.</Text>
        <Pressable onPress={onLeave}>
          <Text style={styles.close}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (session.status === "in_progress") {
    return (
      <View style={styles.body}>
        <TicTacToeBoard
          sessionId={sessionId}
          state={session.state as never}
          currentProfileId={currentProfileId}
          displayNames={displayNames}
        />
        <Pressable onPress={onLeave}>
          <Text style={styles.close}>Back to games</Text>
        </Pressable>
      </View>
    );
  }

  if (session.status === "finished") {
    return (
      <View style={styles.body}>
        <Text style={styles.status}>Game over.</Text>
        <Pressable style={styles.createButton} onPress={() => void rematchTicTacToeGame(sessionId)}>
          <Text style={styles.createButtonText}>Rematch</Text>
        </Pressable>
        <Pressable onPress={onLeave}>
          <Text style={styles.close}>Back to games</Text>
        </Pressable>
      </View>
    );
  }

  const active = players.filter((p) => !p.is_spectator);

  return (
    <View style={styles.body}>
      <Text style={styles.status}>Waiting for players ({active.length}/2)</Text>
      {active.map((player) => (
        <Text key={player.id} style={styles.sessionText}>
          {displayNames[player.profile_id] ?? "Someone"} {player.is_ready ? "✓ ready" : ""}
        </Text>
      ))}

      {you ? (
        <Pressable
          style={styles.createButton}
          onPress={() => void readyUp(sessionId, currentProfileId, !you.is_ready)}
        >
          <Text style={styles.createButtonText}>{you.is_ready ? "Not ready" : "Ready up"}</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.createButton} onPress={() => void joinGame(sessionId, currentProfileId, false)}>
          <Text style={styles.createButtonText}>Join</Text>
        </Pressable>
      )}

      {active.length === 2 && active.every((p) => p.is_ready) ? (
        <Pressable style={styles.createButton} onPress={() => void startTicTacToeGame(sessionId)}>
          <Text style={styles.createButtonText}>Start</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => {
          void leaveGame(sessionId, currentProfileId);
          onLeave();
        }}
      >
        <Text style={styles.close}>Leave</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7f0" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  title: { fontSize: 18, fontWeight: "600" },
  close: { color: "#6b1988", marginTop: 12 },
  body: { padding: 16, gap: 10, alignItems: "flex-start" },
  empty: { textAlign: "center", color: "#888", marginTop: 24 },
  status: { fontSize: 15, fontWeight: "600" },
  sessionRow: { backgroundColor: "#fff", borderRadius: 10, padding: 12, width: "100%" },
  sessionText: { fontSize: 14 },
  createButton: { backgroundColor: "#9f22cd", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  createButtonText: { color: "#fff", fontWeight: "600" }
});
