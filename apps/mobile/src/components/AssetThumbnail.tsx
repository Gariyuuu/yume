import { Canvas, ImageSVG, useSVG } from "@shopify/react-native-skia";
import type { RoomAsset } from "@yume/room-schema";
import { Pressable, StyleSheet } from "react-native";

const SIZE = 48;

export function AssetThumbnail({ asset, onPress }: { asset: RoomAsset; onPress: () => void }) {
  const svg = useSVG(asset.asset_url);

  return (
    <Pressable onPress={onPress} style={styles.thumb}>
      <Canvas style={{ width: SIZE, height: SIZE }}>
        {svg ? <ImageSVG svg={svg} x={0} y={0} width={SIZE} height={SIZE} /> : null}
      </Canvas>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: SIZE,
    height: SIZE,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden"
  }
});
