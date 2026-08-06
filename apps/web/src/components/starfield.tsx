"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SHOOTING_STARS = [
  { top: "8%", left: "78%", duration: "5.5s", delay: "0s" },
  { top: "18%", left: "92%", duration: "6.5s", delay: "2.2s" },
  { top: "4%", left: "55%", duration: "7.5s", delay: "4.8s" },
  { top: "28%", left: "68%", duration: "6s", delay: "7.1s" }
];

const TWINKLE_STARS = [
  { top: "12%", left: "22%", size: 3, duration: "3.2s" },
  { top: "62%", left: "8%", size: 2, duration: "4.1s" },
  { top: "40%", left: "88%", size: 3, duration: "2.6s" },
  { top: "78%", left: "70%", size: 2, duration: "3.6s" },
  { top: "24%", left: "45%", size: 2, duration: "4.4s" }
];

/**
 * Fixed full-viewport night sky mounted once behind everything in the
 * root layout. Default look is the static nebula SVG (set on <body> in
 * globals.css) plus these animated shooting-star/twinkle overlays. If
 * the signed-in user has uploaded a custom background (Settings ->
 * Appearance -> background-upload.tsx), that image replaces the nebula
 * here — stars still twinkle/shoot on top of it either way.
 */
export function Starfield() {
  const [customUrl, setCustomUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || cancelled) return;
      void supabase
        .from("profiles")
        .select("background_url")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setCustomUrl(data?.background_url ?? null);
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {customUrl ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${customUrl})` }}
          />
          <div className="absolute inset-0 bg-background/55" />
        </>
      ) : null}
      {SHOOTING_STARS.map((star, index) => (
        <span
          key={index}
          className="shooting-star"
          style={{ top: star.top, left: star.left, animationDuration: star.duration, animationDelay: star.delay }}
        />
      ))}
      {TWINKLE_STARS.map((star, index) => (
        <span
          key={index}
          className="star-twinkle absolute rounded-full bg-white"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            animationDuration: star.duration
          }}
        />
      ))}
    </div>
  );
}
