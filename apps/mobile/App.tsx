import { useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";
import { AuthScreen } from "./src/screens/AuthScreen";
import { RoomDetailScreen } from "./src/screens/RoomDetailScreen";
import { RoomsScreen } from "./src/screens/RoomsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { supabase } from "./src/lib/supabase";
import { useSession } from "./src/lib/use-session";

// No navigation library yet — four screens and local state is enough for
// this slice. Reach for @react-navigation/native once enough screens
// (invite flow, games) stack up that this stops being simpler than a
// real navigator.
export default function App() {
  const { session, loading } = useSession();
  const [openRoomId, setOpenRoomId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      ) : settingsOpen ? (
        <SettingsScreen
          session={session}
          onBack={() => setSettingsOpen(false)}
          onAccountDeleted={() => setSettingsOpen(false)}
        />
      ) : (
        <RoomsScreen
          session={session}
          onOpenRoom={setOpenRoomId}
          onOpenSettings={() => setSettingsOpen(true)}
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
