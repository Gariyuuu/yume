import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { banParticipant, blockUser, kickParticipant, muteParticipant, reportUser } from "../lib/moderation-actions";

const REPORT_REASONS = ["Harassment", "Spam", "Inappropriate content", "Impersonation", "Other"];

export function ParticipantMenu({
  visible,
  onClose,
  roomId,
  currentProfileId,
  targetProfileId,
  targetName,
  canModerate
}: {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  currentProfileId: string;
  targetProfileId: string;
  targetName: string;
  canModerate: boolean;
}) {
  const [reportOpen, setReportOpen] = useState(false);

  function runAction(label: string, action: () => Promise<{ error?: string }>) {
    onClose();
    void action().then((result) => {
      if (result.error) Alert.alert("Couldn't do that", result.error);
      else Alert.alert(label);
    });
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{targetName}</Text>

            {canModerate ? (
              <>
                <Pressable
                  style={styles.item}
                  onPress={() => runAction("Muted", () => muteParticipant(roomId, targetProfileId))}
                >
                  <Text style={styles.itemText}>Mute microphone</Text>
                </Pressable>
                <Pressable
                  style={styles.item}
                  onPress={() => runAction("Removed from the room", () => kickParticipant(roomId, targetProfileId))}
                >
                  <Text style={styles.itemText}>Kick from room</Text>
                </Pressable>
                <Pressable
                  style={styles.item}
                  onPress={() => runAction("Banned from the room", () => banParticipant(roomId, targetProfileId))}
                >
                  <Text style={[styles.itemText, styles.destructive]}>Ban from room</Text>
                </Pressable>
              </>
            ) : null}

            <Pressable
              style={styles.item}
              onPress={() => runAction("Blocked", () => blockUser(currentProfileId, targetProfileId))}
            >
              <Text style={styles.itemText}>Block</Text>
            </Pressable>
            <Pressable
              style={styles.item}
              onPress={() => {
                onClose();
                setReportOpen(true);
              }}
            >
              <Text style={styles.itemText}>Report</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setReportOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Report {targetName}</Text>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                style={styles.item}
                onPress={() => {
                  setReportOpen(false);
                  void reportUser(roomId, currentProfileId, targetProfileId, reason).then((result) => {
                    if (result.error) Alert.alert("Couldn't submit report", result.error);
                    else Alert.alert("Report submitted");
                  });
                }}
              >
                <Text style={styles.itemText}>{reason}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 4 },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  item: { paddingVertical: 12 },
  itemText: { fontSize: 15 },
  destructive: { color: "#dc2626" }
});
