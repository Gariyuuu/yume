"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Uploads to the public `user-backgrounds` bucket (0021_custom_backgrounds.sql)
 * at `{userId}/background.{ext}`, always the same filename per user
 * (upsert) so re-uploading just replaces it rather than accumulating
 * orphaned files. Applied everywhere via Starfield reading
 * profiles.background_url — see components/starfield.tsx.
 */
export function BackgroundUpload({
  profileId,
  currentUrl
}: {
  profileId: string;
  currentUrl: string | null;
}) {
  const [url, setUrl] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("Image is too large — 8MB max.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${profileId}/background.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("user-backgrounds")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      toast.error(uploadError.message);
      return;
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from("user-backgrounds").getPublicUrl(path);
    // Cache-bust so the new upload shows immediately instead of a
    // browser-cached copy of the previous file at the same path.
    const bustedUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ background_url: bustedUrl })
      .eq("id", profileId);

    setUploading(false);
    if (updateError) {
      toast.error(updateError.message);
      return;
    }
    setUrl(bustedUrl);
    toast.success("Background updated.");
  }

  async function handleRemove() {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ background_url: null }).eq("id", profileId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setUrl(null);
    toast.success("Back to the default background.");
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Upload your own background image (PNG/JPEG/WebP, up to 8MB). Applies across the whole
        app for you — everyone else still sees their own.
      </p>

      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- storage-hosted, arbitrary user upload
        <img src={url} alt="Your current background" className="h-24 w-full rounded-lg object-cover" />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : url ? "Change background" : "Upload background"}
        </Button>
        {url ? (
          <Button size="sm" variant="ghost" onClick={() => void handleRemove()}>
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
