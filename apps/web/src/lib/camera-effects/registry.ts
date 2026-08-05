import { backgroundBlurEffect, createBackgroundReplaceEffect } from "./background";
import { beautySmoothingEffect, glassesAccessory, partyHatAccessory, simpleMaskAccessory } from "./face-accessories";
import { frameEffects } from "./frames";
import type { CameraEffectPlugin } from "./types";

/** The full plugin catalog — add a new effect by pushing it into the
 *  right array here (or a new one) and it shows up in the picker with no
 *  other changes needed, per the plugin-interface requirement. */
export const BACKGROUND_EFFECTS: CameraEffectPlugin[] = [
  backgroundBlurEffect,
  createBackgroundReplaceEffect("sunset"),
  createBackgroundReplaceEffect("ocean"),
  createBackgroundReplaceEffect("forest")
];

export const ACCESSORY_EFFECTS: CameraEffectPlugin[] = [glassesAccessory, partyHatAccessory, simpleMaskAccessory];

export const BEAUTY_EFFECTS: CameraEffectPlugin[] = [beautySmoothingEffect];

export const FRAME_EFFECTS: CameraEffectPlugin[] = frameEffects;

export const ALL_EFFECTS: CameraEffectPlugin[] = [
  ...BACKGROUND_EFFECTS,
  ...ACCESSORY_EFFECTS,
  ...BEAUTY_EFFECTS,
  ...FRAME_EFFECTS
];

export function findEffect(id: string | null): CameraEffectPlugin | undefined {
  return id ? ALL_EFFECTS.find((e) => e.id === id) : undefined;
}
