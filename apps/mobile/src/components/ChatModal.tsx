import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { type ChatMessage, useRoomChat } from "../lib/use-room-chat";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉"];

export function ChatModal({
  visible,
  onClose,
  roomId,
  currentProfileId,
  canManageAll
}: {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  currentProfileId: string;
  canManageAll: boolean;
}) {
  const { messages, sendMessage, deleteMessage, toggleReaction } = useRoomChat(roomId, currentProfileId);
  const [text, setText] = useState("");

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Room chat</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8, padding: 12 }}
          renderItem={({ item }) => (
            <MessageRow
              message={item}
              canDelete={canManageAll || item.author_id === currentProfileId}
              currentProfileId={currentProfileId}
              onDelete={() => void deleteMessage(item.id)}
              onReact={(emoji) => void toggleReaction(item.id, emoji)}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No messages yet — say hi!</Text>}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message the room…"
            value={text}
            onChangeText={setText}
            multiline
          />
          <Pressable
            style={styles.sendButton}
            onPress={() => {
              void sendMessage(text);
              setText("");
            }}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MessageRow({
  message,
  canDelete,
  currentProfileId,
  onDelete,
  onReact
}: {
  message: ChatMessage;
  canDelete: boolean;
  currentProfileId: string;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}) {
  if (message.deleted_at) {
    return <Text style={styles.deleted}>Message deleted</Text>;
  }

  const reactionCounts = message.message_reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <View style={styles.messageRow}>
      <View style={styles.messageHeader}>
        <Text style={styles.author}>{message.author?.display_name ?? "Someone"}</Text>
        <Text style={styles.time}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
      {message.body ? <Text style={styles.body}>{message.body}</Text> : null}

      <View style={styles.reactionRow}>
        {Object.entries(reactionCounts).map(([emoji, count]) => (
          <Pressable key={emoji} onPress={() => onReact(emoji)} style={styles.reactionChip}>
            <Text style={styles.reactionText}>
              {emoji} {count}
            </Text>
          </Pressable>
        ))}
        {QUICK_REACTIONS.map((emoji) => (
          <Pressable key={emoji} onPress={() => onReact(emoji)}>
            <Text style={styles.quickReaction}>{emoji}</Text>
          </Pressable>
        ))}
        {canDelete ? (
          <Pressable onPress={onDelete}>
            <Text style={styles.deleteLink}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
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
  close: { color: "#6b1988" },
  empty: { textAlign: "center", color: "#888", marginTop: 24 },
  messageRow: { backgroundColor: "#fff", borderRadius: 10, padding: 10 },
  messageHeader: { flexDirection: "row", justifyContent: "space-between" },
  author: { fontWeight: "600", fontSize: 13 },
  time: { fontSize: 11, color: "#888" },
  body: { fontSize: 14, marginTop: 2 },
  deleted: { fontSize: 12, fontStyle: "italic", color: "#888", paddingHorizontal: 10 },
  reactionRow: { flexDirection: "row", gap: 8, marginTop: 6, alignItems: "center" },
  reactionChip: { backgroundColor: "#f3e8ff", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  reactionText: { fontSize: 11 },
  quickReaction: { fontSize: 14 },
  deleteLink: { fontSize: 11, color: "#dc2626", marginLeft: "auto" },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "flex-end"
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
    backgroundColor: "#fff"
  },
  sendButton: { backgroundColor: "#9f22cd", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  sendButtonText: { color: "#fff", fontWeight: "600" }
});
