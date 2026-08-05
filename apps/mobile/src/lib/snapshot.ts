import type { useCanvasRef } from "@shopify/react-native-skia";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ImageFormat } from "@shopify/react-native-skia";

/**
 * Captures the room decoration canvas only — this is the Skia `<Canvas>`
 * from RoomCanvasView, which never includes participant camera tiles
 * (those are separate RN/WebRTC views in CallView, not drawn into the
 * Skia surface at all) — same "controls/camera never in the snapshot by
 * construction" property as web's stage.toDataURL(), just without web's
 * opt-in camera-compositing toggle: there's no cheap way to draw a
 * react-native-webrtc video view into a Skia canvas, so that toggle
 * stays web-only for now rather than being faked here.
 */
export async function shareRoomSnapshot(canvasRef: ReturnType<typeof useCanvasRef>) {
  const image = canvasRef.current?.makeImageSnapshot();
  if (!image) return { error: "Nothing to capture yet." };

  const base64 = image.encodeToBase64(ImageFormat.PNG);
  const file = new File(Paths.cache, `yume-room-${Date.now()}.png`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: "base64" });

  const available = await Sharing.isAvailableAsync();
  if (!available) return { error: "Sharing isn't available on this device." };

  await Sharing.shareAsync(file.uri, { mimeType: "image/png", dialogTitle: "Share your room" });
  return {};
}
