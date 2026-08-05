"use client";

import type { RoomObject } from "@yume/room-schema";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";
import { useKonvaImage } from "./use-konva-image";

const FALLBACK_COLORS: Partial<Record<RoomObject["type"], string>> = {
  sticky_note: "#fde68a",
  furniture: "#d6b98c",
  rug: "#f0b7c4",
  plant: "#86c98a",
  decorative: "#c7b8ff",
  text: "transparent"
};

export function RoomObjectShape({
  object,
  selected,
  canDrag,
  onSelect,
  onDragMove,
  onDragEnd,
  onDoubleClick,
  registerRef
}: {
  object: RoomObject;
  selected: boolean;
  canDrag: boolean;
  onSelect: (event: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onDoubleClick: () => void;
  registerRef: (node: Konva.Node | null) => void;
}) {
  const image = useKonvaImage(object.asset_url);
  const text =
    typeof object.data?.["text"] === "string" ? (object.data["text"] as string) : "";

  return (
    <Group
      ref={registerRef}
      id={object.id}
      x={object.x}
      y={object.y}
      width={object.width}
      height={object.height}
      rotation={object.rotation}
      draggable={canDrag}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick}
      onDragMove={(event) => onDragMove(event.target.x(), event.target.y())}
      onDragEnd={(event) => onDragEnd(event.target.x(), event.target.y())}
    >
      {image ? (
        <KonvaImage
          image={image}
          width={object.width}
          height={object.height}
          stroke={selected ? "#9f22cd" : undefined}
          strokeWidth={selected ? 3 : 0}
        />
      ) : (
        <Rect
          width={object.width}
          height={object.height}
          fill={FALLBACK_COLORS[object.type] ?? "#e5e7eb"}
          stroke={selected ? "#9f22cd" : undefined}
          strokeWidth={selected ? 3 : 0}
          cornerRadius={object.type === "text" ? 0 : 12}
          dash={object.locked ? [4, 4] : undefined}
        />
      )}
      {text ? (
        <Text
          x={8}
          y={8}
          width={object.width - 16}
          text={text}
          fontSize={object.type === "text" ? 20 : 14}
          fill="#1f1f1f"
          listening={false}
        />
      ) : null}
    </Group>
  );
}
