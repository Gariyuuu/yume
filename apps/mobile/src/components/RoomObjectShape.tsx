import type { RoomObject } from "@yume/room-schema";
import { Group, ImageSVG, RoundedRect, useSVG } from "@shopify/react-native-skia";

const FALLBACK_COLORS: Partial<Record<RoomObject["type"], string>> = {
  sticky_note: "#fde68a",
  furniture: "#d6b98c",
  rug: "#f0b7c4",
  plant: "#86c98a",
  decorative: "#c7b8ff",
  text: "#00000000"
};

/** One Skia node per object — `useSVG` can't run inside a .map() loop, so
 *  each object gets its own component instance (same reason
 *  apps/web/src/components/room-canvas/use-konva-image.ts is split out
 *  per-object on web). Selection/drag are handled by the parent Canvas's
 *  own hit-testing (Skia has no per-node touch dispatch — see
 *  RoomCanvasView.tsx), not by this component. */
export function RoomObjectShape({ object }: { object: RoomObject }) {
  const svg = useSVG(object.asset_url);

  return (
    <Group
      transform={[
        { translateX: object.x },
        { translateY: object.y },
        { rotate: (object.rotation * Math.PI) / 180 }
      ]}
    >
      {svg ? (
        <ImageSVG svg={svg} x={0} y={0} width={object.width} height={object.height} />
      ) : (
        <RoundedRect
          x={0}
          y={0}
          width={object.width}
          height={object.height}
          r={object.type === "text" ? 0 : 12}
          color={FALLBACK_COLORS[object.type] ?? "#e5e7eb"}
        />
      )}
    </Group>
  );
}
