import { useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";
import { AuthScreen } from "./src/screens/AuthScreen";
import { RoomDetailScreen } from "./src/screens/RoomDetailScreen";
import { RoomsScreen } from "./src/screens/RoomsScreen";
import { supabase } from "./src/lib/supabase";
import { useSession } from "./src/lib/use-session";

// No navigation library yet — three screens and local state is enough for
// this Phase 2 slice. Reach for @react-navigation/native once Phase 4+
// adds enough screens (room settings, invite flow, games) that this stops
// being simpler than a real navigator.
export default function App() {
  const { session, loading } = useSession();
  const [openRoomId, setOpenRoomId] = useState<string | null>(null);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.flex}>
        <AuthScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      {openRoomId ? (
        <RoomDetailScreen
          roomId={openRoomId}
          currentProfileId={session.user.id}
          onBack={() => setOpenRoomId(null)}
        />
      ) : (
        <RoomsScreen
          session={session}
          onOpenRoom={setOpenRoomId}
          onSignOut={() => {
            setOpenRoomId(null);
            void supabase.auth.signOut();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" }
});
