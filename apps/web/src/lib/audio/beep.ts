"use client";

/**
 * Synthesized alarm/chime via Web Audio — deliberately not a licensed
 * audio file (see docs/phase-1/08-licensing-review.md's "don't import an
 * asset just because it's labeled free" policy). A generated tone has no
 * licensing question at all.
 */
export function playBeep(pattern: "alarm" | "chime" = "alarm") {
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioContextCtor();
  const beeps = pattern === "alarm" ? [880, 0, 880, 0, 880] : [660, 880];

  beeps.forEach((frequency, index) => {
    if (frequency === 0) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    const start = ctx.currentTime + index * 0.22;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
    gain.gain.linearRampToValueAtTime(0, start + 0.18);

    oscillator.start(start);
    oscillator.stop(start + 0.2);
  });

  setTimeout(() => void ctx.close(), (beeps.length + 1) * 250);
}
