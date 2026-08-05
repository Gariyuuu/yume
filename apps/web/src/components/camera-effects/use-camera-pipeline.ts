"use client";

import { useEffect, useRef, useState } from "react";
import { getFaceLandmarker, getImageSegmenter } from "@/lib/camera-effects/mediapipe";
import { findEffect, BEAUTY_EFFECTS } from "@/lib/camera-effects/registry";
import {
  buildFilterString,
  DEFAULT_FILTER_PARAMS,
  type EffectFrameContext,
  type FilterParams
} from "@/lib/camera-effects/types";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

/**
 * Owns the whole local pipeline: raw camera -> (optional) MediaPipe
 * detection -> effect passes -> output canvas -> `outputStream`, which
 * the caller publishes to LiveKit in place of the plain camera track
 * (see camera-effects-panel.tsx). Runs entirely on-device — no camera
 * frame ever leaves the browser for effect processing (see
 * docs/phase-1/07-api-capability-review.md's "on-device only" note).
 */
export function useCameraPipeline() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outputStream, setOutputStream] = useState<MediaStream | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const [filterParams, setFilterParams] = useState<FilterParams>(DEFAULT_FILTER_PARAMS);
  const [backgroundEffectId, setBackgroundEffectId] = useState<string | null>(null);
  const [accessoryEffectId, setAccessoryEffectId] = useState<string | null>(null);
  const [beautyOn, setBeautyOn] = useState(false);
  const [frameEffectId, setFrameEffectId] = useState<string | null>(null);

  const selectionRef = useRef({
    filterParams,
    backgroundEffectId,
    accessoryEffectId,
    beautyOn,
    frameEffectId
  });
  useEffect(() => {
    selectionRef.current = { filterParams, backgroundEffectId, accessoryEffectId, beautyOn, frameEffectId };
  }, [filterParams, backgroundEffectId, accessoryEffectId, beautyOn, frameEffectId]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let rafId: number;
    let rawStream: MediaStream | null = null;

    async function start() {
      setLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
      });
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      rawStream = stream;
      setPreviewStream(stream);

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      // Preloaded together up front so the render loop below can stay
      // fully synchronous per frame (no awaits mixed into a 30fps loop).
      const [faceLandmarker, segmenter] = await Promise.all([getFaceLandmarker(), getImageSegmenter()]);
      if (cancelled) return;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || CANVAS_WIDTH;
      canvas.height = video.videoHeight || CANVAS_HEIGHT;
      const outputCtx = canvas.getContext("2d")!;

      setOutputStream(canvas.captureStream(30));
      setLoading(false);

      function render() {
        if (cancelled) return;
        const sel = selectionRef.current;
        const now = performance.now();

        let faceLandmarks: EffectFrameContext["faceLandmarks"] = null;
        if ((sel.accessoryEffectId || sel.beautyOn) && video.readyState >= 2) {
          faceLandmarks = faceLandmarker.detectForVideo(video, now).faceLandmarks[0] ?? null;
        }

        let segmentationMask: Uint8Array | null = null;
        let segmentationMaskSize: { width: number; height: number } | null = null;
        if (sel.backgroundEffectId && video.readyState >= 2) {
          const result = segmenter.segmentForVideo(video, now);
          if (result.categoryMask) {
            segmentationMask = result.categoryMask.getAsUint8Array();
            segmentationMaskSize = { width: result.categoryMask.width, height: result.categoryMask.height };
          }
        }

        const ctx: EffectFrameContext = {
          source: video,
          outputCtx,
          width: canvas.width,
          height: canvas.height,
          faceLandmarks,
          segmentationMask,
          segmentationMaskSize,
          params: {}
        };

        const backgroundEffect = findEffect(sel.backgroundEffectId);
        if (backgroundEffect) {
          backgroundEffect.apply(ctx);
        } else {
          outputCtx.filter = buildFilterString(sel.filterParams);
          outputCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
          outputCtx.filter = "none";
        }

        if (sel.beautyOn) BEAUTY_EFFECTS[0]!.apply(ctx);
        findEffect(sel.accessoryEffectId)?.apply(ctx);
        findEffect(sel.frameEffectId)?.apply(ctx);

        rafId = requestAnimationFrame(render);
      }

      render();
    }

    void start();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      rawStream?.getTracks().forEach((t) => t.stop());
      setOutputStream(null);
      setPreviewStream(null);
    };
  }, [enabled]);

  return {
    enabled,
    setEnabled,
    loading,
    outputStream,
    previewStream,
    filterParams,
    setFilterParams,
    backgroundEffectId,
    setBackgroundEffectId,
    accessoryEffectId,
    setAccessoryEffectId,
    beautyOn,
    setBeautyOn,
    frameEffectId,
    setFrameEffectId
  };
}
