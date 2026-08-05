"use client";

import { useEffect, useState } from "react";

/** Loads a URL (including data: URIs) into an HTMLImageElement for use
 *  with Konva's <Image>, which needs a real image element rather than a
 *  URL string. One call site per object — see room-object-shape.tsx —
 *  since hooks can't run inside a .map() loop. */
export function useKonvaImage(url: string | null): HTMLImageElement | null {
  const [loaded, setLoaded] = useState<{ url: string; image: HTMLImageElement } | null>(null);

  useEffect(() => {
    if (!url) return;

    const img = new window.Image();
    img.onload = () => setLoaded({ url, image: img });
    img.src = url;

    return () => {
      img.onload = null;
    };
  }, [url]);

  // Deriving from whether the loaded image still matches the current url
  // (rather than resetting state to null in the effect above whenever url
  // is falsy/changes) avoids a synchronous setState-in-effect call.
  return loaded?.url === url ? loaded.image : null;
}
