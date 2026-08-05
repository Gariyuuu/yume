import { Pressable, StyleSheet, Text, View } from "react-native";
import { makeTicTacToeMove } from "../lib/game-actions";

type Mark = "X" | "O";
type TicTacToeState = {
  board: (Mark | null)[];
  marks: Record<string, Mark>;
  turn: string;
  winnerId: string | null;
  isDraw: boolean;
};

export function TicTacToeBoard({
  sessionId,
  state,
  currentProfileId,
  displayNames
}: {
  sessionId: string;
  state: TicTacToeState;
  currentProfileId: string;
  displayNames: Record<string, string>;
}) {
  const yourTurn = state.turn === currentProfileId && !state.winnerId && !state.isDraw;

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        {state.winnerId
          ? `${displayNames[state.winnerId] ?? "Someone"} wins!`
          : state.isDraw
            ? "It's a draw."
            : yourTurn
              ? "Your turn"
              : `Waiting on ${displayNames[state.turn] ?? "the other player"}…`}
      </Text>

      <View style={styles.grid}>
        {state.board.map((cell, index) => (
          <Pressable
            key={index}
            style={styles.cell}
            disabled={!yourTurn || cell !== null}
            onPress={() => void makeTicTacToeMove(sessionId, index)}
          >
            <Text style={styles.cellText}>{cell ?? ""}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const CELL_SIZE = 88;

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 12 },
  status: { fontSize: 14, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", width: CELL_SIZE * 3 },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff"
  },
  cellText: { fontSize: 32, fontWeight: "700", color: "#6b1988" }
});
