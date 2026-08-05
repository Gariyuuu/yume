"use client";

/**
 * Lazy singletons — only loaded (WASM + model download) the first time an
 * active effect actually needs face landmarks or segmentation, not on
 * every room visit. Model URLs verified against
 * https://developers.google.com/edge/mediapipe/solutions/vision as of
 * this phase; re-check before relying on them again (MediaPipe hosts
 * "latest" paths that can move).
 */
import { FaceLandmarker, FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const SEGMENTER_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite";

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;
let segmenterPromise: Promise<ImageSegmenter> | null = null;

export function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = FilesetResolver.forVisionTasks(WASM_BASE).then((fileset) =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: false
      })
    );
  }
  return faceLandmarkerPromise;
}

export function getImageSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = FilesetResolver.forVisionTasks(WASM_BASE).then((fileset) =>
      ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: SEGMENTER_MODEL },
        runningMode: "VIDEO",
        outputCategoryMask: true,
        outputConfidenceMasks: false
      })
    );
  }
  return segmenterPromise;
}
