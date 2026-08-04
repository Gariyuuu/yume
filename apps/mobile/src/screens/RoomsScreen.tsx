import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { supabase } from "../lib/supabase";

type RoomListItem = {
  id: string;
  name: string;
  role: string;
};

async function ensureProfile(session: Session) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", session.user.id)
    .maybeSingle();

  if (existing) return;

  const displayName =
    (session.user.user_metadata?.["display_name"] as string | undefined) ??
    session.user.email?.split("@")[0] ??
    "Friend";

  await supabase.from("profiles").insert({
    id: session.user.id,
    display_name: displayName,
    is_guest: session.user.is_anonymous ?? false
  });
}

export function RoomsScreen({
  session,
  onOpenRoom,
  onSignOut
}: {
  session: Session;
  onOpenRoom: (roomId: string) => void;
  onSignOut: () => void;
}) {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    await ensureProfile(session);

    const { data } = await supabase
      .from("room_memberships")
      .select("role, rooms(id, name)")
      .eq("profile_id", session.user.id);

    setRooms(
      (data ?? [])
        .filter((membership) => membership.rooms)
        .map((membership) => ({
          id: membership.rooms!.id,
          name: membership.rooms!.name,
          role: membership.role
        }))
    );
    setLoading(false);
  }, [session]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  async function handleCreateRoom() {
    if (!newRoomName.trim()) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("rooms")
      .insert({ owner_id: session.user.id, name: newRoomName.trim() })
      .select("id")
      .single();

    setCreating(false);
    if (!error && data) {
      setNewRoomName("");
      await loadRooms();
      onOpenRoom(data.id);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your rooms</Text>
        <Pressable onPress={onSignOut}>
          <Text style={styles.link}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          placeholder="New room name"
          value={newRoomName}
          onChangeText={setNewRoomName}
        />
        <Pressable style={styles.button} onPress={handleCreateRoom} disabled={creating}>
          <Text style={styles.buttonText}>{creating ? "…" : "Create"}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(room) => room.id}
          contentContainerStyle={{ gap: 8, paddingTop: 12 }}
          ListEmptyComponent={
            <Text style={styles.empty}>No rooms yet — create one above.</Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.roomCard} onPress={() => onOpenRoom(item.id)}>
              <Text style={styles.roomName}>{item.name}</Text>
              <Text style={styles.roomRole}>{item.role}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff7f0" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "600" },
  link: { color: "#6b1988" },
  createRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  button: {
    backgroundColor: "#9f22cd",
    borderRadius: 999,
    paddingHorizontal: 18,
    justifyContent: "center"
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  roomCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  roomName: { fontSize: 16, fontWeight: "600" },
  roomRole: { color: "#888", textTransform: "capitalize" },
  empty: { textAlign: "center", color: "#888", marginTop: 24 }
});
