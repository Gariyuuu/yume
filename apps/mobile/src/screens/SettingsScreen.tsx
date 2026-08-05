import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

/**
 * Phase 7: the App Store review doc (docs/phase-1/09-app-store-risk-review.md
 * §9) requires account deletion to be reachable from the app's own
 * settings UI, not buried behind a web-only flow — this screen didn't
 * exist before this phase, so it's what makes that true. Data export
 * hands off to the web app's /settings/export route (see .env.example)
 * rather than re-implementing that export logic here.
 */
export function SettingsScreen({
  session,
  onBack,
  onAccountDeleted
}: {
  session: Session;
  onBack: () => void;
  onAccountDeleted: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [blocked, setBlocked] = useState<{ id: string; display_name: string }[]>([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));

    void supabase
      .from("user_blocks")
      .select("blocked_id, profiles!user_blocks_blocked_id_fkey(display_name)")
      .eq("blocker_id", session.user.id)
      .then(({ data }) => {
        setBlocked(
          (data ?? [])
            .filter((b) => b.profiles)
            .map((b) => ({ id: b.blocked_id, display_name: b.profiles!.display_name }))
        );
      });
  }, [session.user.id]);

  function handleExport() {
    if (!WEB_URL) {
      Alert.alert("Not available", "Set EXPO_PUBLIC_WEB_URL to enable data export from the app.");
      return;
    }
    void Linking.openURL(`${WEB_URL}/settings/export`);
  }

  function handleUnblock(blockedId: string) {
    void supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", session.user.id)
      .eq("blocked_id", blockedId)
      .then(() => setBlocked((current) => current.filter((u) => u.id !== blockedId)));
  }

  function handleDelete() {
    Alert.alert("Delete account", "This can't be undone. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          setDeleting(false);
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            Alert.alert("Couldn't delete account", body.error ?? "Try again later.");
            return;
          }
          await supabase.auth.signOut();
          onAccountDeleted();
        }
      }
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.link}>← Rooms</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>
        <Text style={styles.body}>{displayName || session.user.email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your data</Text>
        <Pressable onPress={handleExport}>
          <Text style={styles.link}>Download a copy of your data</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Blocked users</Text>
        {blocked.length === 0 ? (
          <Text style={styles.body}>You haven&apos;t blocked anyone.</Text>
        ) : (
          blocked.map((user) => (
            <View key={user.id} style={styles.blockedRow}>
              <Text style={styles.body}>{user.display_name}</Text>
              <Pressable onPress={() => handleUnblock(user.id)}>
                <Text style={styles.link}>Unblock</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Legal &amp; support</Text>
        <Pressable onPress={() => WEB_URL && Linking.openURL(`${WEB_URL}/privacy`)}>
          <Text style={styles.link}>Privacy policy</Text>
        </Pressable>
        <Pressable onPress={() => WEB_URL && Linking.openURL(`${WEB_URL}/terms`)}>
          <Text style={styles.link}>Terms of service</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL("mailto:support@yume.app")}>
          <Text style={styles.link}>Contact support</Text>
        </Pressable>
      </View>

      <View style={[styles.card, styles.dangerCard]}>
        <Text style={[styles.cardTitle, styles.dangerText]}>Danger zone</Text>
        <Pressable style={styles.deleteButton} onPress={handleDelete} disabled={deleting}>
          <Text style={styles.deleteButtonText}>{deleting ? "Deleting…" : "Delete account"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff7f0" },
  content: { padding: 20, gap: 16 },
  header: { gap: 4 },
  title: { fontSize: 24, fontWeight: "600" },
  link: { color: "#6b1988", paddingVertical: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  body: { color: "#333" },
  blockedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dangerCard: { borderWidth: 1, borderColor: "#fecaca" },
  dangerText: { color: "#dc2626" },
  deleteButton: { backgroundColor: "#dc2626", borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  deleteButtonText: { color: "#fff", fontWeight: "600" }
});
