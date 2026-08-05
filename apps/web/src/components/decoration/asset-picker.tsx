"use client";

import type { RoomAsset } from "@yume/room-schema";
import { StickyNote, Type, X } from "lucide-react";
import type { PendingAsset } from "@/components/room-canvas/room-canvas";
import { Button } from "@/components/ui/button";

export function AssetPicker({
  assets,
  pendingAsset,
  onSelect,
  onCancel
}: {
  assets: RoomAsset[];
  pendingAsset: PendingAsset | null | undefined;
  onSelect: (asset: PendingAsset) => void;
  onCancel: () => void;
}) {
  const grouped = assets.reduce<Record<string, RoomAsset[]>>((acc, asset) => {
    (acc[asset.category] ??= []).push(asset);
    return acc;
  }, {});

  if (pendingAsset) {
    return (
      <div className="flex items-center justify-between rounded-card border bg-brand-50 px-4 py-2 text-sm">
        <span>Click anywhere in the room to place it — or</span>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="mr-1 h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border bg-card p-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSelect({ source: "builtin", type: "sticky_note" })}
        >
          <StickyNote className="mr-1.5 h-4 w-4" /> Sticky note
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSelect({ source: "builtin", type: "text" })}
        >
          <Type className="mr-1.5 h-4 w-4" /> Text
        </Button>
      </div>

      {Object.entries(grouped).map(([category, categoryAssets]) => (
        <div key={category}>
          <p className="mb-1.5 text-xs font-medium capitalize text-muted-foreground">{category}</p>
          <div className="flex flex-wrap gap-2">
            {categoryAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                title={asset.name}
                className="h-14 w-14 rounded-md border bg-white p-1 transition-shadow hover:shadow-md"
                onClick={() => onSelect({ source: "library", asset })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- decoration art is a data: URI / future Storage URL, not a build-time asset */}
                <img src={asset.thumbnail_url ?? asset.asset_url} alt={asset.name} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
